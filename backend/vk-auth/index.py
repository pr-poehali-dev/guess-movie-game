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
    if not access_token:
        return resp(400, {'error': 'access_token обязателен'})

    user_url = (
        f"https://api.vk.com/method/users.get"
        f"?fields=photo_200,first_name,last_name"
        f"&access_token={access_token}&v=5.131"
    )
    user_data = vk_api_get(user_url)

    if 'error' in user_data:
        return resp(400, {'error': 'Невалидный access_token или ошибка VK API'})

    vk_user = user_data['response'][0]
    return save_user_and_session(
        vk_user['id'],
        vk_user.get('first_name', ''),
        vk_user.get('last_name', ''),
        vk_user.get('photo_200', ''),
        access_token,
    )


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


def me(body):
    result = validate_session(body)
    if not result:
        return resp(401, {'error': 'Сессия не найдена или истекла'})

    user_id, conn, cur = result

    cur.execute(
        f"""SELECT id, vk_id, first_name, last_name, photo_url,
            total_score, games_played, best_score,
            wins, losses, draws, perfect_rounds
        FROM {SCHEMA}.users WHERE id = %s""",
        (user_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return resp(404, {'error': 'Пользователь не найден'})

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
    result = validate_session(body)
    if not result:
        return resp(401, {'error': 'Сессия не найдена или истекла'})

    user_id, conn, cur = result

    score = body.get('score', 0)
    game_result = body.get('result')
    game_type = body.get('game_type', 'solo')
    opponent_name = body.get('opponent_name')
    room_id = body.get('room_id')

    if game_result not in ('win', 'loss', 'draw'):
        cur.close()
        conn.close()
        return resp(400, {'error': 'result должен быть win, loss или draw'})

    result_column = {'win': 'wins', 'loss': 'losses', 'draw': 'draws'}[game_result]

    cur.execute(
        f"""UPDATE {SCHEMA}.users SET
            total_score = COALESCE(total_score, 0) + %s,
            games_played = COALESCE(games_played, 0) + 1,
            best_score = GREATEST(COALESCE(best_score, 0), %s),
            {result_column} = COALESCE({result_column}, 0) + 1,
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, vk_id, first_name, last_name, photo_url,
            total_score, games_played, best_score, wins, losses, draws, perfect_rounds""",
        (score, score, user_id)
    )
    user_row = cur.fetchone()

    cur.execute(
        f"""INSERT INTO {SCHEMA}.game_history
        (user_id, score, result, game_type, opponent_name, room_id)
        VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, score, game_result, game_type, opponent_name, room_id)
    )
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
            'total_score': user_row[5] or 0,
            'games_played': user_row[6] or 0,
            'best_score': user_row[7] or 0,
            'wins': user_row[8] or 0,
            'losses': user_row[9] or 0,
            'draws': user_row[10] or 0,
            'perfect_rounds': user_row[11] or 0,
        }
    })


def friends(body):
    result = validate_session(body)
    if not result:
        return resp(401, {'error': 'Сессия не найдена или истекла'})

    user_id, conn, cur = result

    cur.execute(
        f"SELECT access_token FROM {SCHEMA}.users WHERE id = %s",
        (user_id,)
    )
    token_row = cur.fetchone()
    if not token_row or not token_row[0]:
        cur.close()
        conn.close()
        return resp(400, {'error': 'VK токен не найден, требуется повторная авторизация'})

    access_token = token_row[0]

    friends_url = (
        f"https://api.vk.com/method/friends.get?"
        f"fields=photo_200,first_name,last_name"
        f"&access_token={access_token}&v=5.131"
    )
    vk_data = vk_api_get(friends_url)

    if 'error' in vk_data:
        cur.close()
        conn.close()
        return resp(400, {'error': 'Ошибка получения списка друзей VK'})

    vk_friends = vk_data.get('response', {}).get('items', [])
    if not vk_friends:
        cur.close()
        conn.close()
        return resp(200, {'friends': []})

    friend_vk_ids = [f['id'] for f in vk_friends]

    placeholders = ','.join(['%s'] * len(friend_vk_ids))
    cur.execute(
        f"""SELECT vk_id, total_score, games_played, best_score, wins, losses, draws, perfect_rounds
        FROM {SCHEMA}.users WHERE vk_id IN ({placeholders})""",
        friend_vk_ids
    )
    player_rows = cur.fetchall()
    cur.close()
    conn.close()

    players_map = {}
    for row in player_rows:
        players_map[row[0]] = {
            'total_score': row[1] or 0,
            'games_played': row[2] or 0,
            'best_score': row[3] or 0,
            'wins': row[4] or 0,
            'losses': row[5] or 0,
            'draws': row[6] or 0,
            'perfect_rounds': row[7] or 0,
        }

    friends_list = []
    for f in vk_friends:
        vk_id = f['id']
        is_player = vk_id in players_map
        friends_list.append({
            'vk_id': vk_id,
            'first_name': f.get('first_name', ''),
            'last_name': f.get('last_name', ''),
            'photo_url': f.get('photo_200', ''),
            'is_player': is_player,
            'stats': players_map.get(vk_id),
        })

    return resp(200, {'friends': friends_list})


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
    elif action == 'friends':
        return friends(body)
    else:
        return resp(400, {'error': f'Неизвестное действие: {action}'})