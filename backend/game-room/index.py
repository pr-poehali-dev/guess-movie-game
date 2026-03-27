"""Управление игровыми комнатами для сетевого режима КиноВикторины"""
import json
import os
import random
import string
import time
from datetime import datetime, timedelta

import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Player-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

QUESTIONS_PER_GAME = 10
TIME_PER_QUESTION = 10
STARTING_LIVES = 3
SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def generate_room_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def generate_player_id():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))


def resp(status, body):
    return {
        'statusCode': status,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str),
    }


def create_room(body):
    """Создать новую комнату"""
    player_name = body.get('player_name', 'Игрок 1')
    questions = body.get('questions', [])
    player_id = body.get('player_id') or generate_player_id()

    if not questions or len(questions) < QUESTIONS_PER_GAME:
        return resp(400, {'error': 'Нужно минимум 10 вопросов'})

    room_id = generate_room_id()
    questions_json = json.dumps(questions[:QUESTIONS_PER_GAME], ensure_ascii=False)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.game_rooms
        (id, player1_id, player1_name, status, questions_data, current_question, movie_ids)
        VALUES (%s, %s, %s, 'waiting', %s, 0, '')""",
        (room_id, player_id, player_name, questions_json)
    )
    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {
        'room_id': room_id,
        'player_id': player_id,
        'player_number': 1,
    })


def join_room(body):
    """Присоединиться к комнате"""
    room_id = body.get('room_id', '').upper().strip()
    player_name = body.get('player_name', 'Игрок 2')
    player_id = body.get('player_id') or generate_player_id()

    if not room_id:
        return resp(400, {'error': 'Укажите код комнаты'})

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        f"SELECT id, player1_id, player2_id, status FROM {SCHEMA}.game_rooms WHERE id = %s",
        (room_id,)
    )
    row = cur.fetchone()

    if not row:
        cur.close()
        conn.close()
        return resp(404, {'error': 'Комната не найдена'})

    _, p1_id, p2_id, status = row

    if player_id == p1_id:
        cur.close()
        conn.close()
        return resp(200, {'room_id': room_id, 'player_id': player_id, 'player_number': 1})

    if p2_id and p2_id == player_id:
        cur.close()
        conn.close()
        return resp(200, {'room_id': room_id, 'player_id': player_id, 'player_number': 2})

    if status != 'waiting':
        cur.close()
        conn.close()
        return resp(400, {'error': 'Комната уже занята или игра завершена'})

    now = datetime.utcnow()
    cur.execute(
        f"""UPDATE {SCHEMA}.game_rooms
        SET player2_id = %s, player2_name = %s, status = 'playing',
            question_started_at = %s, updated_at = %s
        WHERE id = %s AND status = 'waiting'""",
        (player_id, player_name, now, now, room_id)
    )
    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {
        'room_id': room_id,
        'player_id': player_id,
        'player_number': 2,
    })


def get_room_state(room_id, player_id):
    """Получить текущее состояние комнаты (polling) — только чтение, без блокировок"""
    if not room_id:
        return resp(400, {'error': 'Укажите room_id'})

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        f"""SELECT id, player1_id, player1_name, player2_id, player2_name,
        status, current_question, questions_data,
        player1_lives, player2_lives, player1_score, player2_score,
        player1_answers, player2_answers, question_started_at, winner,
        created_at
        FROM {SCHEMA}.game_rooms WHERE id = %s""",
        (room_id,)
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return resp(404, {'error': 'Комната не найдена'})

    (rid, p1_id, p1_name, p2_id, p2_name, status, cur_q, q_data,
     p1_lives, p2_lives, p1_score, p2_score,
     p1_answers, p2_answers, q_started, winner, created_at) = row

    questions = json.loads(q_data) if q_data else []
    p1_ans = json.loads(p1_answers) if p1_answers else []
    p2_ans = json.loads(p2_answers) if p2_answers else []

    is_player1 = (player_id == p1_id)
    is_player2 = (player_id == p2_id)
    my_number = 1 if is_player1 else (2 if is_player2 else 0)

    if status == 'playing' and q_started:
        elapsed = (datetime.utcnow() - q_started).total_seconds()
        time_left = max(0, TIME_PER_QUESTION - elapsed)

        both_answered = len(p1_ans) > cur_q and len(p2_ans) > cur_q
        time_expired = elapsed > TIME_PER_QUESTION + 3

        if time_expired and not both_answered:
            result = try_advance_question(room_id, questions)
            if result:
                p1_lives, p2_lives, p1_score, p2_score, status, winner, cur_q, p1_ans, p2_ans = result
                if status == 'playing':
                    cur2 = conn.cursor()
                    cur2.execute(
                        f"SELECT question_started_at FROM {SCHEMA}.game_rooms WHERE id = %s",
                        (room_id,)
                    )
                    qs_row = cur2.fetchone()
                    cur2.close()
                    if qs_row and qs_row[0]:
                        elapsed = (datetime.utcnow() - qs_row[0]).total_seconds()
                        time_left = max(0, TIME_PER_QUESTION - elapsed)
                    else:
                        time_left = TIME_PER_QUESTION
                else:
                    time_left = 0
    else:
        time_left = TIME_PER_QUESTION
        elapsed = 0

    cur.close()
    conn.close()

    current_q = None
    if status == 'playing' and cur_q < len(questions):
        q = questions[cur_q]
        current_q = {
            'movie_id': q['movie_id'],
            'image_url': q['image_url'],
            'options': q['options'],
            'genre': q.get('genre', ''),
            'difficulty': q.get('difficulty', 'medium'),
        }

    last_result = None
    check_idx = cur_q - 1
    if check_idx >= 0 and check_idx < len(questions):
        q = questions[check_idx]
        p1a = p1_ans[check_idx] if check_idx < len(p1_ans) else -1
        p2a = p2_ans[check_idx] if check_idx < len(p2_ans) else -1
        last_result = {
            'correct_index': q['correct_index'],
            'correct_title': q['title'],
            'player1_answer': p1a,
            'player2_answer': p2a,
            'player1_correct': p1a == q['correct_index'],
            'player2_correct': p2a == q['correct_index'],
        }

    if status == 'waiting':
        if created_at and (datetime.utcnow() - created_at).total_seconds() > 600:
            conn2 = get_conn()
            cur2 = conn2.cursor()
            cur2.execute(
                f"UPDATE {SCHEMA}.game_rooms SET status = 'finished', winner = 'timeout' WHERE id = %s AND status = 'waiting'",
                (room_id,)
            )
            conn2.commit()
            cur2.close()
            conn2.close()
            status = 'finished'

    i_answered = (
        (len(p1_ans) > cur_q if my_number == 1 else len(p2_ans) > cur_q)
        if status == 'playing' else False
    )
    opponent_answered = (
        (len(p2_ans) > cur_q if my_number == 1 else len(p1_ans) > cur_q)
        if status == 'playing' else False
    )
    both_answered = i_answered and opponent_answered

    if both_answered and status == 'playing':
        time_left = 0

    return resp(200, {
        'room_id': rid,
        'status': status,
        'my_player': my_number,
        'player1_name': p1_name,
        'player2_name': p2_name or None,
        'player1_lives': p1_lives,
        'player2_lives': p2_lives,
        'player1_score': p1_score,
        'player2_score': p2_score,
        'current_question': cur_q,
        'total_questions': len(questions),
        'time_left': round(time_left, 1) if status == 'playing' else 0,
        'question': current_q,
        'last_result': last_result,
        'winner': winner,
        'i_answered': i_answered,
        'opponent_answered': opponent_answered,
        'both_answered': both_answered,
    })


def try_advance_question(room_id, questions):
    """Атомарно обработать текущий вопрос с FOR UPDATE, если оба ответили или время вышло"""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            f"""SELECT current_question, player1_answers, player2_answers,
            player1_lives, player2_lives, player1_score, player2_score,
            question_started_at, status
            FROM {SCHEMA}.game_rooms WHERE id = %s FOR UPDATE""",
            (room_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.commit()
            return None

        cur_q, p1_ans_raw, p2_ans_raw, p1_lives, p2_lives, p1_score, p2_score, q_started, status = row

        if status != 'playing':
            conn.commit()
            return None

        p1_ans = json.loads(p1_ans_raw) if p1_ans_raw else []
        p2_ans = json.loads(p2_ans_raw) if p2_ans_raw else []

        both_answered = len(p1_ans) > cur_q and len(p2_ans) > cur_q
        time_expired = False
        if q_started:
            elapsed = (datetime.utcnow() - q_started).total_seconds()
            time_expired = elapsed > TIME_PER_QUESTION + 3

        if not both_answered and not time_expired:
            conn.commit()
            return None

        q = questions[cur_q]
        correct = q['correct_index']

        p1a = p1_ans[cur_q] if cur_q < len(p1_ans) else -1
        p2a = p2_ans[cur_q] if cur_q < len(p2_ans) else -1

        if cur_q >= len(p1_ans):
            p1_ans.append(-1)
        if cur_q >= len(p2_ans):
            p2_ans.append(-1)

        if p1a == correct:
            p1_score += 1
        else:
            p1_lives -= 1

        if p2a == correct:
            p2_score += 1
        else:
            p2_lives -= 1

        next_q = cur_q + 1
        new_status = 'playing'
        winner = None

        game_over = False
        if p1_lives <= 0 and p2_lives <= 0:
            game_over = True
            if p1_score > p2_score:
                winner = 'player1'
            elif p2_score > p1_score:
                winner = 'player2'
            else:
                winner = 'draw'
        elif p1_lives <= 0:
            game_over = True
            winner = 'player2'
        elif p2_lives <= 0:
            game_over = True
            winner = 'player1'
        elif next_q >= len(questions):
            game_over = True
            if p1_lives > p2_lives:
                winner = 'player1'
            elif p2_lives > p1_lives:
                winner = 'player2'
            elif p1_score > p2_score:
                winner = 'player1'
            elif p2_score > p1_score:
                winner = 'player2'
            else:
                winner = 'draw'

        if game_over:
            new_status = 'finished'
            new_q_started = None
        else:
            new_q_started = datetime.utcnow()

        cur.execute(
            f"""UPDATE {SCHEMA}.game_rooms
            SET current_question = %s, player1_lives = %s, player2_lives = %s,
                player1_score = %s, player2_score = %s,
                player1_answers = %s, player2_answers = %s,
                question_started_at = %s, status = %s, winner = %s,
                updated_at = %s
            WHERE id = %s""",
            (next_q, p1_lives, p2_lives, p1_score, p2_score,
             json.dumps(p1_ans), json.dumps(p2_ans),
             new_q_started, new_status, winner, datetime.utcnow(), room_id)
        )
        conn.commit()
        return p1_lives, p2_lives, p1_score, p2_score, new_status, winner, next_q, p1_ans, p2_ans
    except Exception:
        conn.rollback()
        return None
    finally:
        cur.close()
        conn.close()


def submit_answer(body, player_id):
    """Отправить ответ и автоматически перейти к следующему вопросу если оба ответили"""
    room_id = body.get('room_id', '').upper().strip()
    answer = body.get('answer')
    body_player_id = body.get('player_id', '')
    effective_player_id = player_id or body_player_id

    if answer is None or not room_id:
        return resp(400, {'error': 'Укажите room_id и answer'})

    if not effective_player_id:
        return resp(400, {'error': 'Не указан player_id'})

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        f"""SELECT player1_id, player2_id, status, current_question,
        player1_answers, player2_answers, question_started_at, questions_data
        FROM {SCHEMA}.game_rooms WHERE id = %s FOR UPDATE""",
        (room_id,)
    )
    row = cur.fetchone()
    if not row:
        conn.commit()
        cur.close()
        conn.close()
        return resp(404, {'error': 'Комната не найдена'})

    p1_id, p2_id, status, cur_q, p1_ans_raw, p2_ans_raw, q_started, q_data = row

    if status != 'playing':
        conn.commit()
        cur.close()
        conn.close()
        return resp(400, {'error': 'Игра не активна'})

    is_p1 = effective_player_id == p1_id
    is_p2 = effective_player_id == p2_id

    if not is_p1 and not is_p2:
        conn.commit()
        cur.close()
        conn.close()
        return resp(403, {'error': 'Вы не участник этой комнаты'})

    p1_ans = json.loads(p1_ans_raw) if p1_ans_raw else []
    p2_ans = json.loads(p2_ans_raw) if p2_ans_raw else []

    if is_p1 and len(p1_ans) > cur_q:
        conn.commit()
        cur.close()
        conn.close()
        return resp(400, {'error': 'Вы уже ответили на этот вопрос'})

    if is_p2 and len(p2_ans) > cur_q:
        conn.commit()
        cur.close()
        conn.close()
        return resp(400, {'error': 'Вы уже ответили на этот вопрос'})

    if q_started:
        elapsed = (datetime.utcnow() - q_started).total_seconds()
        if elapsed > TIME_PER_QUESTION + 5:
            answer = -1

    if is_p1:
        while len(p1_ans) < cur_q:
            p1_ans.append(-1)
        p1_ans.append(answer)
    else:
        while len(p2_ans) < cur_q:
            p2_ans.append(-1)
        p2_ans.append(answer)

    both_answered = len(p1_ans) > cur_q and len(p2_ans) > cur_q

    if both_answered:
        questions = json.loads(q_data) if q_data else []
        if cur_q < len(questions):
            q = questions[cur_q]
            correct = q['correct_index']

            p1a = p1_ans[cur_q]
            p2a = p2_ans[cur_q]

            p1_lives = None
            p2_lives = None
            p1_score = None
            p2_score = None

            cur.execute(
                f"SELECT player1_lives, player2_lives, player1_score, player2_score FROM {SCHEMA}.game_rooms WHERE id = %s",
                (room_id,)
            )
            lives_row = cur.fetchone()
            p1_lives, p2_lives, p1_score, p2_score = lives_row

            if p1a == correct:
                p1_score += 1
            else:
                p1_lives -= 1

            if p2a == correct:
                p2_score += 1
            else:
                p2_lives -= 1

            next_q = cur_q + 1
            new_status = 'playing'
            winner = None

            game_over = False
            if p1_lives <= 0 and p2_lives <= 0:
                game_over = True
                if p1_score > p2_score:
                    winner = 'player1'
                elif p2_score > p1_score:
                    winner = 'player2'
                else:
                    winner = 'draw'
            elif p1_lives <= 0:
                game_over = True
                winner = 'player2'
            elif p2_lives <= 0:
                game_over = True
                winner = 'player1'
            elif next_q >= len(questions):
                game_over = True
                if p1_lives > p2_lives:
                    winner = 'player1'
                elif p2_lives > p1_lives:
                    winner = 'player2'
                elif p1_score > p2_score:
                    winner = 'player1'
                elif p2_score > p1_score:
                    winner = 'player2'
                else:
                    winner = 'draw'

            if game_over:
                new_status = 'finished'
                new_q_started = None
            else:
                new_q_started = datetime.utcnow()

            cur.execute(
                f"""UPDATE {SCHEMA}.game_rooms
                SET current_question = %s, player1_lives = %s, player2_lives = %s,
                    player1_score = %s, player2_score = %s,
                    player1_answers = %s, player2_answers = %s,
                    question_started_at = %s, status = %s, winner = %s,
                    updated_at = %s
                WHERE id = %s""",
                (next_q, p1_lives, p2_lives, p1_score, p2_score,
                 json.dumps(p1_ans), json.dumps(p2_ans),
                 new_q_started, new_status, winner, datetime.utcnow(), room_id)
            )
            conn.commit()
            cur.close()
            conn.close()
            return resp(200, {'ok': True, 'advanced': True})

    if is_p1:
        cur.execute(
            f"UPDATE {SCHEMA}.game_rooms SET player1_answers = %s, updated_at = %s WHERE id = %s",
            (json.dumps(p1_ans), datetime.utcnow(), room_id)
        )
    else:
        cur.execute(
            f"UPDATE {SCHEMA}.game_rooms SET player2_answers = %s, updated_at = %s WHERE id = %s",
            (json.dumps(p2_ans), datetime.utcnow(), room_id)
        )

    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {'ok': True})


def handler(event, context):
    """Управление игровыми комнатами сетевого режима"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': '',
        }

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    player_id = (event.get('headers') or {}).get('x-player-id', '')

    if method == 'GET':
        room_id = params.get('room_id', '')
        effective_pid = player_id or params.get('player_id', '')
        return get_room_state(room_id, effective_pid)

    if method == 'POST':
        raw_body = event.get('body', '{}') or '{}'
        body = raw_body
        while isinstance(body, str):
            body = json.loads(body)
        action = body.get('action', '')

        if action == 'create':
            return create_room(body)
        elif action == 'join':
            return join_room(body)
        elif action == 'answer':
            return submit_answer(body, player_id)
        else:
            return resp(400, {'error': f'Неизвестное действие: {action}'})

    return resp(405, {'error': 'Method not allowed'})
