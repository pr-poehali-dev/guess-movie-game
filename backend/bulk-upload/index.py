"""Массовая загрузка кадров фильмов из TMDB API в S3 + БД."""
import json
import os
import base64
import logging
import time
import boto3
import psycopg2
import urllib.request
import ssl

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
S3_ENDPOINT = "https://bucket.poehali.dev"
BUCKET = "files"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
AWS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
IMAGES_PER_MOVIE = 8

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

MOVIES = [
    {"id": 1, "tmdbId": 278, "title": "Побег из Шоушенка"},
    {"id": 2, "tmdbId": 424, "title": "Список Шиндлера"},
    {"id": 3, "tmdbId": 13, "title": "Форрест Гамп"},
    {"id": 4, "tmdbId": 497, "title": "Зелёная миля"},
    {"id": 5, "tmdbId": 578, "title": "Пролетая над гнездом кукушки"},
    {"id": 6, "tmdbId": 389, "title": "12 разгневанных мужчин"},
    {"id": 7, "tmdbId": 637, "title": "Жизнь прекрасна"},
    {"id": 8, "tmdbId": 489, "title": "Игры разума"},
    {"id": 9, "tmdbId": 423, "title": "Пианист"},
    {"id": 10, "tmdbId": 244786, "title": "Уиплэш"},
    {"id": 11, "tmdbId": 640, "title": "Реквием по мечте"},
    {"id": 12, "tmdbId": 466272, "title": "Однажды в Голливуде"},
    {"id": 13, "tmdbId": 8358, "title": "Волк с Уолл-стрит"},
    {"id": 14, "tmdbId": 100, "title": "Американская красота"},
    {"id": 15, "tmdbId": 238, "title": "Крёстный отец"},
    {"id": 16, "tmdbId": 240, "title": "Крёстный отец 2"},
    {"id": 17, "tmdbId": 111, "title": "Лицо со шрамом"},
    {"id": 18, "tmdbId": 680, "title": "Криминальное чтиво"},
    {"id": 19, "tmdbId": 769, "title": "Гудфеллас"},
    {"id": 20, "tmdbId": 598, "title": "Город Бога"},
    {"id": 21, "tmdbId": 550, "title": "Бойцовский клуб"},
    {"id": 22, "tmdbId": 68718, "title": "Джанго освобождённый"},
    {"id": 23, "tmdbId": 274, "title": "Молчание ягнят"},
    {"id": 24, "tmdbId": 1422, "title": "Отступники"},
    {"id": 25, "tmdbId": 603, "title": "Матрица"},
    {"id": 26, "tmdbId": 27205, "title": "Начало"},
    {"id": 27, "tmdbId": 157336, "title": "Интерстеллар"},
    {"id": 28, "tmdbId": 11, "title": "Звёздные войны: Эпизод IV"},
    {"id": 29, "tmdbId": 1891, "title": "Империя наносит ответный удар"},
    {"id": 30, "tmdbId": 19995, "title": "Аватар"},
    {"id": 31, "tmdbId": 361, "title": "Бегущий по лезвию"},
    {"id": 32, "tmdbId": 335984, "title": "Бегущий по лезвию 2049"},
    {"id": 33, "tmdbId": 105, "title": "Назад в будущее"},
    {"id": 34, "tmdbId": 694919, "title": "Довод"},
    {"id": 35, "tmdbId": 19, "title": "Инопланетянин"},
    {"id": 36, "tmdbId": 438631, "title": "Дюна"},
    {"id": 37, "tmdbId": 693134, "title": "Дюна: Часть вторая"},
    {"id": 38, "tmdbId": 155, "title": "Тёмный рыцарь"},
    {"id": 39, "tmdbId": 49026, "title": "Тёмный рыцарь: Возрождение"},
    {"id": 40, "tmdbId": 1726, "title": "Железный человек"},
    {"id": 41, "tmdbId": 24428, "title": "Мстители"},
    {"id": 42, "tmdbId": 299536, "title": "Мстители: Война бесконечности"},
    {"id": 43, "tmdbId": 299534, "title": "Мстители: Финал"},
    {"id": 44, "tmdbId": 76341, "title": "Безумный Макс: Дорога ярости"},
    {"id": 45, "tmdbId": 475557, "title": "Джокер"},
    {"id": 46, "tmdbId": 22, "title": "Пираты Карибского моря"},
    {"id": 47, "tmdbId": 87, "title": "В поисках утраченного ковчега"},
    {"id": 48, "tmdbId": 284054, "title": "Чёрная пантера"},
    {"id": 49, "tmdbId": 569094, "title": "Человек-паук: Нет пути домой"},
    {"id": 50, "tmdbId": 533535, "title": "Дэдпул и Росомаха"},
    {"id": 51, "tmdbId": 98, "title": "Гладиатор"},
    {"id": 52, "tmdbId": 197, "title": "Храброе сердце"},
    {"id": 53, "tmdbId": 311, "title": "Однажды на Диком Западе"},
    {"id": 54, "tmdbId": 253, "title": "Хороший, плохой, злой"},
    {"id": 55, "tmdbId": 745, "title": "Семь самураев"},
    {"id": 56, "tmdbId": 539, "title": "Психо"},
    {"id": 57, "tmdbId": 218, "title": "Сияние"},
    {"id": 58, "tmdbId": 694, "title": "Нечто"},
    {"id": 59, "tmdbId": 621, "title": "Мементо"},
    {"id": 60, "tmdbId": 496243, "title": "Паразиты"},
    {"id": 61, "tmdbId": 399579, "title": "Олдбой"},
    {"id": 62, "tmdbId": 120, "title": "Властелин колец: Братство кольца"},
    {"id": 63, "tmdbId": 207, "title": "Властелин колец: Две крепости"},
    {"id": 64, "tmdbId": 122, "title": "Властелин колец: Возвращение короля"},
    {"id": 65, "tmdbId": 129, "title": "Унесённые призраками"},
    {"id": 66, "tmdbId": 4935, "title": "Ходячий замок"},
    {"id": 67, "tmdbId": 372058, "title": "Твоё имя"},
    {"id": 68, "tmdbId": 8587, "title": "Король-Лев"},
    {"id": 69, "tmdbId": 862, "title": "История игрушек"},
    {"id": 70, "tmdbId": 9806, "title": "Суперсемейка"},
    {"id": 71, "tmdbId": 14160, "title": "Вверх"},
    {"id": 72, "tmdbId": 10193, "title": "Корпорация монстров"},
    {"id": 73, "tmdbId": 109445, "title": "Холодное сердце"},
    {"id": 74, "tmdbId": 260513, "title": "Тайна Коко"},
    {"id": 75, "tmdbId": 508442, "title": "Душа"},
    {"id": 76, "tmdbId": 324857, "title": "Человек-паук: Через вселенные"},
    {"id": 77, "tmdbId": 597, "title": "Титаник"},
    {"id": 78, "tmdbId": 289, "title": "Касабланка"},
    {"id": 79, "tmdbId": 313369, "title": "Ла-Ла Ленд"},
    {"id": 80, "tmdbId": 77, "title": "Американский пирог"},
    {"id": 81, "tmdbId": 346698, "title": "Барби"},
    {"id": 82, "tmdbId": 238713, "title": "Выживший"},
    {"id": 83, "tmdbId": 329, "title": "Джуманджи"},
    {"id": 84, "tmdbId": 807, "title": "Семь"},
    {"id": 85, "tmdbId": 1124, "title": "Престиж"},
    {"id": 86, "tmdbId": 101, "title": "Леон"},
    {"id": 87, "tmdbId": 37165, "title": "Шоу Трумана"},
    {"id": 88, "tmdbId": 857, "title": "Спасти рядового Райана"},
    {"id": 89, "tmdbId": 280, "title": "Терминатор 2: Судный день"},
    {"id": 90, "tmdbId": 11324, "title": "Остров проклятых"},
    {"id": 91, "tmdbId": 13223, "title": "Гран Торино"},
    {"id": 92, "tmdbId": 348, "title": "Чужой"},
    {"id": 93, "tmdbId": 103, "title": "Таксист"},
    {"id": 94, "tmdbId": 77338, "title": "1+1"},
    {"id": 95, "tmdbId": 16869, "title": "Бесславные ублюдки"},
    {"id": 96, "tmdbId": 150540, "title": "Головоломка"},
    {"id": 97, "tmdbId": 490132, "title": "Зелёная книга"},
    {"id": 98, "tmdbId": 37799, "title": "Социальная сеть"},
    {"id": 99, "tmdbId": 5915, "title": "В диких условиях"},
    {"id": 100, "tmdbId": 18785, "title": "Мальчишник в Вегасе"},
]


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_KEY,
        aws_secret_access_key=AWS_SECRET,
    )


def get_db():
    return psycopg2.connect(DATABASE_URL)


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{AWS_KEY}/bucket/{key}"


def fetch_tmdb_images(tmdb_id: int) -> list:
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/images?api_key={TMDB_API_KEY}"
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, timeout=10, context=ssl_ctx)
    data = json.loads(resp.read().decode())
    backdrops = data.get("backdrops", [])
    backdrops.sort(key=lambda x: x.get("vote_average", 0), reverse=True)
    return [b["file_path"] for b in backdrops[:IMAGES_PER_MOVIE]]


def download_image(file_path: str) -> bytes:
    url = f"https://image.tmdb.org/t/p/w1280{file_path}"
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=15, context=ssl_ctx)
            return resp.read()
        except Exception:
            if attempt < 2:
                time.sleep(1)
            else:
                raise


def process_movie(movie: dict, s3, conn) -> dict:
    movie_id = movie["id"]
    tmdb_id = movie["tmdbId"]
    title = movie["title"]

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM movie_images WHERE movie_id = %s" % movie_id)
    existing = cur.fetchone()[0]
    if existing >= IMAGES_PER_MOVIE:
        cur.close()
        return {"id": movie_id, "title": title, "status": "skip", "count": existing}

    image_paths = fetch_tmdb_images(tmdb_id)
    if not image_paths:
        cur.close()
        return {"id": movie_id, "title": title, "status": "no_images", "count": existing}

    if existing > 0:
        cur.execute("DELETE FROM movie_images WHERE movie_id = %s" % movie_id)
        conn.commit()

    uploaded = 0
    for i, fp in enumerate(image_paths, 1):
        image_data = download_image(fp)
        filename = f"{i}.jpg"
        s3_key = f"movies/{movie_id}/{filename}"
        s3.put_object(Bucket=BUCKET, Key=s3_key, Body=image_data, ContentType="image/jpeg")
        url = cdn_url(s3_key)
        cur.execute(
            "INSERT INTO movie_images (movie_id, filename, cdn_url, s3_key) VALUES (%s, '%s', '%s', '%s')"
            % (movie_id, filename, url.replace("'", "''"), s3_key.replace("'", "''"))
        )
        uploaded += 1

    conn.commit()
    cur.close()
    return {"id": movie_id, "title": title, "status": "ok", "count": uploaded}


def handler(event: dict, context) -> dict:
    """Массовая загрузка кадров из TMDB для всех фильмов."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET" and params.get("status") == "1":
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT movie_id, COUNT(*) FROM movie_images GROUP BY movie_id")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        stats = {str(r[0]): r[1] for r in rows}
        total = sum(stats.values())
        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({"total_images": total, "movies_with_images": len(stats), "stats": stats}),
        }

    if method == "POST":
        body = json.loads(event.get("body", "{}"))
        batch_start = body.get("batch_start", 0)
        batch_size = body.get("batch_size", 5)

        batch = MOVIES[batch_start:batch_start + batch_size]
        if not batch:
            return {
                "statusCode": 200,
                "headers": HEADERS,
                "body": json.dumps({"done": True, "message": "All movies processed", "total_movies": len(MOVIES)}),
            }

        s3 = get_s3()
        conn = get_db()
        results = []
        for i, movie in enumerate(batch):
            try:
                r = process_movie(movie, s3, conn)
                results.append(r)
                if i < len(batch) - 1 and r.get("status") == "ok":
                    time.sleep(0.5)
            except Exception as e:
                logger.error(f"Error processing {movie['title']}: {e}")
                results.append({"id": movie["id"], "title": movie["title"], "status": "error", "error": str(e)})

        conn.close()

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({
                "done": batch_start + batch_size >= len(MOVIES),
                "batch_start": batch_start,
                "batch_size": len(batch),
                "next_start": batch_start + batch_size,
                "total_movies": len(MOVIES),
                "results": results,
            }),
        }

    return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}