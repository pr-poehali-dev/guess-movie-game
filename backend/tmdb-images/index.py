"""
Получает кадры (backdrops) из фильмов через TMDB API.
Принимает список TMDB movie_id, возвращает URL изображений.
"""
import json
import os
import urllib.request
import urllib.error


TMDB_BASE = "https://api.themoviedb.org/3"
IMG_BASE = "https://image.tmdb.org/t/p/w1280"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def fetch_json(url: str, api_key: str) -> dict:
    full_url = f"{url}?api_key={api_key}"
    req = urllib.request.Request(full_url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    api_key = os.environ.get("TMDB_API_KEY", "")
    if not api_key:
        return {"statusCode": 500, "headers": HEADERS, "body": json.dumps({"error": "TMDB_API_KEY not set"})}

    movies = [
        {"id": 278,    "title": "Побег из Шоушенка",    "options": ["Побег из Шоушенка", "Зелёная миля", "Список Шиндлера", "Семь"],                        "correctIndex": 0, "genre": "Драма",        "difficulty": "easy",   "year": 1994},
        {"id": 238,    "title": "Крёстный отец",          "options": ["Лицо со шрамом", "Однажды в Америке", "Крёстный отец", "Прощай, детка, прощай"],       "correctIndex": 2, "genre": "Криминал",     "difficulty": "easy",   "year": 1972},
        {"id": 155,    "title": "Тёмный рыцарь",          "options": ["Бэтмен навсегда", "Тёмный рыцарь", "Хранители", "Железный человек"],                  "correctIndex": 1, "genre": "Экшн",         "difficulty": "medium", "year": 2008},
        {"id": 424,    "title": "Список Шиндлера",        "options": ["Список Шиндлера", "Пианист", "Жизнь прекрасна", "Мальчик в полосатой пижаме"],        "correctIndex": 0, "genre": "Драма",        "difficulty": "medium", "year": 1993},
        {"id": 27205,  "title": "Начало",                  "options": ["Матрица", "Интерстеллар", "Начало", "Довод"],                                          "correctIndex": 2, "genre": "Фантастика",   "difficulty": "hard",   "year": 2010},
        {"id": 157336, "title": "Интерстеллар",            "options": ["Гравитация", "Марсианин", "Интерстеллар", "Прибытие"],                                 "correctIndex": 2, "genre": "Фантастика",   "difficulty": "medium", "year": 2014},
        {"id": 13,     "title": "Форрест Гамп",            "options": ["Жизнь прекрасна", "Форрест Гамп", "Человек дождя", "Эффект бабочки"],                  "correctIndex": 1, "genre": "Драма",        "difficulty": "easy",   "year": 1994},
        {"id": 603,    "title": "Матрица",                 "options": ["Матрица", "Бегущий по лезвию", "Экзистенция", "Тёмный город"],                         "correctIndex": 0, "genre": "Фантастика",   "difficulty": "easy",   "year": 1999},
        {"id": 120,    "title": "Властелин колец",         "options": ["Хоббит", "Властелин колец", "Хроники Нарнии", "Эрагон"],                               "correctIndex": 1, "genre": "Фэнтези",      "difficulty": "easy",   "year": 2001},
        {"id": 680,    "title": "Криминальное чтиво",     "options": ["Бешеные псы", "От заката до рассвета", "Криминальное чтиво", "Джанго освобождённый"],   "correctIndex": 2, "genre": "Криминал",     "difficulty": "medium", "year": 1994},
        {"id": 98,     "title": "Гладиатор",               "options": ["300 спартанцев", "Троя", "Гладиатор", "Александр"],                                    "correctIndex": 2, "genre": "Исторический", "difficulty": "medium", "year": 2000},
        {"id": 111,    "title": "Лицо со шрамом",         "options": ["Лицо со шрамом", "Крёстный отец", "Однажды в Америке", "Казино"],                       "correctIndex": 0, "genre": "Криминал",     "difficulty": "hard",   "year": 1983},
    ]

    result = []
    for i, movie in enumerate(movies):
        try:
            url = f"{TMDB_BASE}/movie/{movie['id']}/images"
            data = fetch_json(url, api_key)
            backdrops = data.get("backdrops", [])
            backdrop = backdrops[1] if len(backdrops) > 1 else (backdrops[0] if backdrops else None)
            image_url = f"{IMG_BASE}{backdrop['file_path']}" if backdrop else None
        except Exception as e:
            print(f"Error fetching movie {movie['id']}: {e}")
            image_url = None

        result.append({
            "id": i + 1,
            "tmdbId": movie["id"],
            "title": movie["title"],
            "year": movie["year"],
            "imageUrl": image_url,
            "options": movie["options"],
            "correctIndex": movie["correctIndex"],
            "genre": movie["genre"],
            "difficulty": movie["difficulty"],
        })

    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({"movies": result}),
    }