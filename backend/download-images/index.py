"""
Универсальный загрузчик кадров фильмов из TMDB CDN в S3 + БД.

POST / — принимает JSON со списком фильмов и путями к backdrop-ам,
          скачивает изображения, загружает в S3, сохраняет в movie_images.
GET /?status=1 — возвращает статистику: кол-во фильмов с кадрами и общее кол-во.
OPTIONS / — CORS preflight.
"""
import json
import os
import logging
import time
import ssl
import urllib.request
import boto3
import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w1280"
S3_ENDPOINT = "https://bucket.poehali.dev"
BUCKET = "files"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
AWS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
MAX_IMAGES_PER_MOVIE = 8

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_s3():
    """Создаёт клиент S3."""
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_KEY,
        aws_secret_access_key=AWS_SECRET,
    )


def get_db():
    """Создаёт подключение к PostgreSQL."""
    return psycopg2.connect(DATABASE_URL)


def cdn_url(key: str) -> str:
    """Формирует публичный CDN URL для ключа S3."""
    return f"https://cdn.poehali.dev/projects/{AWS_KEY}/bucket/{key}"


def download_image(path: str) -> bytes:
    """Скачивает изображение с TMDB CDN с 3 попытками."""
    url = f"{TMDB_IMG_BASE}{path}"
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


def get_existing_count(cur, movie_id: int) -> int:
    """Возвращает количество уже загруженных кадров для фильма."""
    cur.execute("SELECT COUNT(*) FROM movie_images WHERE movie_id = %s" % int(movie_id))
    return cur.fetchone()[0]


def get_max_index(cur, movie_id: int) -> int:
    """Возвращает максимальный числовой индекс файла для фильма (0 если нет)."""
    cur.execute(
        "SELECT filename FROM movie_images WHERE movie_id = %s ORDER BY id" % int(movie_id)
    )
    rows = cur.fetchall()
    max_idx = 0
    for row in rows:
        fname = row[0]
        try:
            idx = int(fname.replace(".jpg", ""))
            if idx > max_idx:
                max_idx = idx
        except (ValueError, AttributeError):
            pass
    return max_idx


def process_movie(movie: dict, s3, conn) -> dict:
    """Обрабатывает один фильм: скачивает кадры, загружает в S3, пишет в БД."""
    movie_id = int(movie["movie_id"])
    paths = movie.get("paths", [])

    cur = conn.cursor()

    existing = get_existing_count(cur, movie_id)
    if existing >= MAX_IMAGES_PER_MOVIE:
        cur.close()
        logger.info("[%s] skip — уже %s кадров", movie_id, existing)
        return {"movie_id": movie_id, "status": "skip", "existing": existing, "added": 0}

    slots_left = MAX_IMAGES_PER_MOVIE - existing
    paths_to_download = paths[:slots_left]

    if not paths_to_download:
        cur.close()
        return {"movie_id": movie_id, "status": "skip", "existing": existing, "added": 0}

    file_index = get_max_index(cur, movie_id)
    added = 0
    errors = []

    for path in paths_to_download:
        file_index += 1
        filename = f"{file_index}.jpg"
        s3_key = f"movies/{movie_id}/{filename}"
        url = cdn_url(s3_key)

        try:
            data = download_image(path)

            s3.put_object(
                Bucket=BUCKET,
                Key=s3_key,
                Body=data,
                ContentType="image/jpeg",
            )

            cur.execute(
                "INSERT INTO movie_images (movie_id, filename, cdn_url, s3_key) "
                "VALUES (%s, '%s', '%s', '%s')"
                % (
                    movie_id,
                    filename.replace("'", "''"),
                    url.replace("'", "''"),
                    s3_key.replace("'", "''"),
                )
            )
            conn.commit()
            added += 1
            logger.info("[%s] OK %s -> %s", movie_id, path, s3_key)

        except Exception as e:
            conn.rollback()
            error_msg = str(e)
            logger.error("[%s] ERR %s: %s", movie_id, path, error_msg)
            errors.append({"path": path, "error": error_msg})

        time.sleep(0.15)

    cur.close()

    status = "ok" if added > 0 else "error"
    result = {"movie_id": movie_id, "status": status, "existing": existing, "added": added}
    if errors:
        result["errors"] = errors
    return result


def handle_status(conn) -> dict:
    """Возвращает статистику по загруженным кадрам."""
    cur = conn.cursor()
    cur.execute("SELECT COUNT(DISTINCT movie_id) FROM movie_images")
    movies_with_images = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM movie_images")
    total_images = cur.fetchone()[0]
    cur.close()
    conn.close()
    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({
            "movies_with_images": movies_with_images,
            "total_images": total_images,
        }),
    }


def handle_post(event: dict) -> dict:
    """Обрабатывает POST-запрос на загрузку кадров."""
    body = json.loads(event.get("body", "{}"))
    movies = body.get("movies", [])

    if not movies:
        return {
            "statusCode": 400,
            "headers": HEADERS,
            "body": json.dumps({"error": "movies array is required"}),
        }

    s3 = get_s3()
    conn = get_db()
    results = []

    for movie in movies:
        movie_id = movie.get("movie_id")
        if not movie_id:
            results.append({"movie_id": None, "status": "error", "errors": [{"error": "movie_id missing"}]})
            continue
        result = process_movie(movie, s3, conn)
        results.append(result)

    conn.close()

    total_added = sum(r.get("added", 0) for r in results)
    ok_count = sum(1 for r in results if r["status"] == "ok")
    skip_count = sum(1 for r in results if r["status"] == "skip")
    error_count = sum(1 for r in results if r["status"] == "error")

    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({
            "total_added": total_added,
            "ok": ok_count,
            "skipped": skip_count,
            "errors": error_count,
            "results": results,
        }),
    }


def handler(event: dict, context) -> dict:
    """Универсальный загрузчик кадров фильмов из TMDB CDN в S3 + БД."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        params = event.get("queryStringParameters") or {}
        if params.get("status") == "1":
            conn = get_db()
            return handle_status(conn)
        return {
            "statusCode": 400,
            "headers": HEADERS,
            "body": json.dumps({"error": "Use ?status=1 for stats or POST to upload"}),
        }

    if method == "POST":
        return handle_post(event)

    return {
        "statusCode": 405,
        "headers": HEADERS,
        "body": json.dumps({"error": "Method not allowed"}),
    }
