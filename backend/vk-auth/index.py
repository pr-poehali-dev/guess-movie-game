import json
import os
import secrets
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
VK_APP_ID = os.environ.get('VK_APP_ID', '')
VK_APP_SECRET = os.environ.get('VK_APP_SECRET', '')

ACHIEVEMENTS = [
    {'id': 'first_correct', 'type': 'score', 'requirement': 1},
    {'id': 'streak_5', 'type': 'score', 'requirement': 5},
    {'id': 'streak_10', 'type': 'score', 'requirement': 10},
    {'id': 'streak_20', 'type': 'score', 'requirement': 20},
    {'id': 'godlike', 'type': 'score', 'requirement': 30},
    {'id': 'survivor', 'type': 'perfect', 'requirement': 1},
]


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(status, body):
    return {
        'statusCode': status,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str),
    }


def vk_api_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))


def validate_session(body):
    session_token = body.get('session_token')
    if not session_token:
        return None

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT s.user_id FROM {SCHEMA}.user_sessions s
        WHERE s.session_token = %s AND s.expires_at > NOW()""",
        (session_token,)
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return None

    return row[0], conn, cur


def vk_api_post(url, data):
    """POST-запрос к VK API"""
    encoded = urllib.parse.urlencode(data).encode('utf-8')
    req = urllib.request.Request(url, data=encoded, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))


def exchange_code(body):
    """Обменивает code+device_id от VK ID SDK на токен серверно и создаёт сессию"""
    code = body.get('code')
    device_id = body.get('device_id')
    redirect_uri = body.get('redirect_uri', '')
    state = body.get('state', '')

    if not code or not device_id:
        return resp(400, {'error': 'code и device_id обязательны'})

    token_data = vk_api_post('https://id.vk.com/oauth2/auth', {
        'grant_type': 'authorization_code',
        'code': code,
        'code_verifier': '',
        'device_id': device_id,
        'client_id': VK_APP_ID,
        'redirect_uri': redirect_uri,
        'state': state,
    })

    access_token = token_data.get('access_token')
    if not access_token:
        print(f"[EXCHANGE] vk token error: {token_data}")
        return resp(400, {'error': 'Ошибка получения токена от VK'})

    user_info = vk_api_post('https://id.vk.com/oauth2/user_info', {
        'access_token': access_token,
        'client_id': VK_APP_ID,
    })

    vk_user_id = user_info.get('user_id') or token_data.get('user_id')
    first_name = user_info.get('first_name', '')
    last_name = user_info.get('last_name', '')
    photo_url = user_info.get('avatar', '')

    if not vk_user_id:
        return resp(400, {'error': 'Не удалось получить данные пользователя'})

    return save_user_and_session(int(vk_user_id), first_name, last_name, photo_url, access_token)


def login_with_token(body):
    access_token = body.get('access_token')
    vk_user_id = body.get('vk_user_id')
    if not access_token:
        return resp(400, {'error': 'access_token обязателен'})

    user_info = vk_api_post('https://id.vk.com/oauth2/user_info', {
        'access_token': access_token,
        'client_id': VK_APP_ID,
    })
    user_data = user_info.get('user', user_info)
    uid = user_data.get('user_id') or user_info.get('user_id') or vk_user_id
    first_name = user_data.get('first_name', '') or user_info.get('first_name', '')
    last_name = user_data.get('last_name', '') or user_info.get('last_name', '')
    photo_url = user_data.get('avatar', '') or user_data.get('photo_200', '') or user_info.get('avatar', '')

    if not uid:
        return resp(400, {'error': 'Не удалось получить данные пользователя'})

    return save_user_and_session(int(uid), first_name, last_name, photo_url, access_token)


def save_user_and_session(vk_user_id, first_name, last_name, photo_url, access_token):
    token_expires_at = datetime.utcnow() + timedelta(days=1)
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        f"""INSERT INTO {SCHEMA}.users (vk_id, first_name, last_name, photo_url, access_token, token_expires_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (vk_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            photo_url = EXCLUDED.photo_url,
            access_token = EXCLUDED.access_token,
            token_expires_at = EXCLUDED.token_expires_at,
            updated_at = NOW()
        RETURNING id, vk_id, first_name, last_name, photo_url""",
        (vk_user_id, first_name, last_name, photo_url, access_token, token_expires_at)
    )
    user_row = cur.fetchone()
    user_id, db_vk_id, db_first, db_last, db_photo = user_row

    session_token = secrets.token_hex(32)
    session_expires = datetime.utcnow() + timedelta(days=30)

    cur.execute(
        f"""INSERT INTO {SCHEMA}.user_sessions (user_id, session_token, expires_at)
        VALUES (%s, %s, %s)""",
        (user_id, session_token, session_expires)
    )
    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {
        'session_token': session_token,
        'user': {
            'id': user_id,
            'vk_id': db_vk_id,
            'first_name': db_first,
            'last_name': db_last,
            'photo_url': db_photo,
        }
    })


def get_user_achievements(cur, user_id):
    cur.execute(
        f"SELECT achievement_id FROM {SCHEMA}.user_achievements WHERE user_id = %s",
        (user_id,)
    )
    return [row[0] for row in cur.fetchall()]


def grant_achievements(cur, user_id, total_score, game_score, perfect_round):
    existing = set(get_user_achievements(cur, user_id))
    newly_granted = []
    for ach in ACHIEVEMENTS:
        if ach['id'] in existing:
            continue
        if ach['type'] == 'score' and total_score >= ach['requirement']:
            newly_granted.append(ach['id'])
        elif ach['type'] == 'perfect' and perfect_round and game_score > 0:
            newly_granted.append(ach['id'])

    for ach_id in newly_granted:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.user_achievements (user_id, achievement_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING""",
            (user_id, ach_id)
        )
    return newly_granted


def me(body):
    result = validate_session(body)
    if not result:
        return resp(401, {'error': 'Сессия не найдена или истекла'})

    user_id, conn, cur = result

    cur.execute(
        f"""SELECT id, vk_id, first_name, last_name, photo_url,
            total_score, games_played, best_score,
            wins, losses, draws, perfect_rounds,
            solo_rating, online_rating
        FROM {SCHEMA}.users WHERE id = %s""",
        (user_id,)
    )
    row = cur.fetchone()

    if not row:
        cur.close()
        conn.close()
        return resp(404, {'error': 'Пользователь не найден'})

    unlocked = get_user_achievements(cur, user_id)
    cur.close()
    conn.close()

    return resp(200, {
        'user': {
            'id': row[0],
            'vk_id': row[1],
            'first_name': row[2],
            'last_name': row[3],
            'photo_url': row[4],
            'total_score': row[5] or 0,
            'games_played': row[6] or 0,
            'best_score': row[7] or 0,
            'wins': row[8] or 0,
            'losses': row[9] or 0,
            'draws': row[10] or 0,
            'perfect_rounds': row[11] or 0,
            'solo_rating': row[12] or 0,
            'online_rating': row[13] or 50,
            'unlocked_achievements': unlocked,
        }
    })


def logout(body):
    session_token = body.get('session_token')
    if not session_token:
        return resp(400, {'error': 'session_token обязателен'})

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""UPDATE {SCHEMA}.user_sessions SET expires_at = NOW()
        WHERE session_token = %s""",
        (session_token,)
    )
    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {'ok': True})


def update_stats(body):
    """Обновление статистики после завершения игры с двумя типами рейтинга"""
    result = validate_session(body)
    if not result:
        return resp(401, {'error': 'Сессия не найдена или истекла'})

    user_id, conn, cur = result

    score = body.get('score', 0)
    game_result = body.get('result')
    game_type = body.get('game_type', 'solo')
    opponent_name = body.get('opponent_name')
    room_id = body.get('room_id')
    winner_lives = body.get('winner_lives', 0)

    if game_result not in ('win', 'loss', 'draw'):
        cur.close()
        conn.close()
        return resp(400, {'error': 'result должен быть win, loss или draw'})

    result_column = {'win': 'wins', 'loss': 'losses', 'draw': 'draws'}[game_result]

    if game_type == 'solo':
        cur.execute(
            f"""UPDATE {SCHEMA}.users SET
                total_score = COALESCE(total_score, 0) + %s,
                solo_rating = COALESCE(solo_rating, 0) + %s,
                games_played = COALESCE(games_played, 0) + 1,
                best_score = GREATEST(COALESCE(best_score, 0), %s),
                {result_column} = COALESCE({result_column}, 0) + 1,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, vk_id, first_name, last_name, photo_url,
                total_score, games_played, best_score, wins, losses, draws, perfect_rounds,
                solo_rating, online_rating""",
            (score, score, score, user_id)
        )
    else:
        rating_change = int(winner_lives) if winner_lives else 0
        if game_result == 'win':
            online_expr = f"GREATEST(COALESCE(online_rating, 50) + {rating_change}, 0)"
        elif game_result == 'loss':
            online_expr = f"GREATEST(COALESCE(online_rating, 50) - {rating_change}, 0)"
        else:
            online_expr = "COALESCE(online_rating, 50)"

        cur.execute(
            f"""UPDATE {SCHEMA}.users SET
                total_score = COALESCE(total_score, 0) + %s,
                online_rating = {online_expr},
                games_played = COALESCE(games_played, 0) + 1,
                best_score = GREATEST(COALESCE(best_score, 0), %s),
                {result_column} = COALESCE({result_column}, 0) + 1,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, vk_id, first_name, last_name, photo_url,
                total_score, games_played, best_score, wins, losses, draws, perfect_rounds,
                solo_rating, online_rating""",
            (score, score, user_id)
        )

    user_row = cur.fetchone()
    new_total_score = user_row[5] or 0
    perfect_round = game_result == 'win' and game_type == 'solo'

    cur.execute(
        f"""INSERT INTO {SCHEMA}.game_history
        (user_id, score, result, game_type, opponent_name, room_id)
        VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, score, game_result, game_type, opponent_name, room_id)
    )

    new_achievements = grant_achievements(cur, user_id, new_total_score, score, perfect_round)
    all_achievements = get_user_achievements(cur, user_id)

    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {
        'user': {
            'id': user_row[0],
            'vk_id': user_row[1],
            'first_name': user_row[2],
            'last_name': user_row[3],
            'photo_url': user_row[4],
            'total_score': new_total_score,
            'games_played': user_row[6] or 0,
            'best_score': user_row[7] or 0,
            'wins': user_row[8] or 0,
            'losses': user_row[9] or 0,
            'draws': user_row[10] or 0,
            'perfect_rounds': user_row[11] or 0,
            'solo_rating': user_row[12] or 0,
            'online_rating': user_row[13] or 50,
            'unlocked_achievements': all_achievements,
        },
        'new_achievements': new_achievements,
    })


def leaderboard(body):
    """Таблица лидеров с двумя типами рейтинга: solo и online"""
    rating_type = body.get('rating_type', 'solo')
    conn = get_conn()
    cur = conn.cursor()

    if rating_type == 'online':
        order_col = 'online_rating'
    else:
        order_col = 'solo_rating'

    cur.execute(
        f"""SELECT id, vk_id, first_name, last_name, photo_url,
            total_score, games_played, best_score, wins, losses, draws,
            solo_rating, online_rating
        FROM {SCHEMA}.users
        WHERE games_played > 0
        ORDER BY {order_col} DESC
        LIMIT 50"""
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    players = []
    for i, row in enumerate(rows):
        players.append({
            'rank': i + 1,
            'id': row[0],
            'vk_id': row[1],
            'first_name': row[2] or '',
            'last_name': row[3] or '',
            'photo_url': row[4] or '',
            'total_score': row[5] or 0,
            'games_played': row[6] or 0,
            'best_score': row[7] or 0,
            'wins': row[8] or 0,
            'losses': row[9] or 0,
            'draws': row[10] or 0,
            'solo_rating': row[11] or 0,
            'online_rating': row[12] or 50,
        })

    return resp(200, {'players': players, 'rating_type': rating_type})


def get_achievements(body):
    """Получение достижений авторизованного пользователя"""
    result = validate_session(body)
    if not result:
        return resp(401, {'error': 'Сессия не найдена или истекла'})

    user_id, conn, cur = result
    unlocked = get_user_achievements(cur, user_id)
    cur.close()
    conn.close()

    return resp(200, {'achievements': unlocked})


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return resp(200, {})

    try:
        body_raw = event.get('body', '{}')
        body = json.loads(body_raw) if body_raw else {}
    except (json.JSONDecodeError, TypeError):
        return resp(400, {'error': 'Невалидный JSON в теле запроса'})

    action = body.get('action', '')

    if action == 'exchange_code':
        return exchange_code(body)
    elif action == 'login_with_token':
        return login_with_token(body)
    elif action == 'me':
        return me(body)
    elif action == 'logout':
        return logout(body)
    elif action == 'update_stats':
        return update_stats(body)
    elif action == 'leaderboard':
        return leaderboard(body)
    elif action == 'get_achievements':
        return get_achievements(body)
    else:
        return resp(400, {'error': f'Неизвестное действие: {action}'})