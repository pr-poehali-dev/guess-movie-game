"""
Управление кадрами фильмов — S3 + PostgreSQL.
GET /?movie_id=1 — список кадров фильма.
GET /?all=1 — все кадры всех фильмов.
POST / {movie_id, image_base64, filename} — загрузить кадр.
DELETE / {movie_id, filename} — удалить кадр.
"""
import json
import os
import base64
import boto3
import psycopg2

S3_ENDPOINT = "https://bucket.poehali.dev"
BUCKET = "files"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
AWS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


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


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        params = event.get("queryStringParameters") or {}
        conn = get_db()
        cur = conn.cursor()

        if params.get("all") == "1":
            cur.execute("SELECT movie_id, cdn_url FROM movie_images ORDER BY movie_id, id")
            rows = cur.fetchall()
            cur.close()
            conn.close()
            result = {}
            for mid, url in rows:
                mid_str = str(mid)
                if mid_str not in result:
                    result[mid_str] = []
                result[mid_str].append(url)
            return {
                "statusCode": 200,
                "headers": HEADERS,
                "body": json.dumps({"images": result}),
            }

        movie_id = params.get("movie_id")
        if not movie_id:
            cur.close()
            conn.close()
            return {
                "statusCode": 400,
                "headers": HEADERS,
                "body": json.dumps({"error": "movie_id required"}),
            }
        cur.execute("SELECT cdn_url FROM movie_images WHERE movie_id = %s ORDER BY id" % int(movie_id))
        urls = [r[0] for r in cur.fetchall()]
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({"movie_id": int(movie_id), "images": urls}),
        }

    if method == "POST":
        body = json.loads(event.get("body", "{}"))
        movie_id = body.get("movie_id")
        image_b64 = body.get("image_base64")
        filename = body.get("filename", "1.jpg")

        if not movie_id or not image_b64:
            return {
                "statusCode": 400,
                "headers": HEADERS,
                "body": json.dumps({"error": "movie_id and image_base64 required"}),
            }

        image_data = base64.b64decode(image_b64)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
        content_type = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }.get(ext, "image/jpeg")

        s3_key = f"movies/{movie_id}/{filename}"
        s3 = get_s3()
        s3.put_object(Bucket=BUCKET, Key=s3_key, Body=image_data, ContentType=content_type)

        url = cdn_url(s3_key)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO movie_images (movie_id, filename, cdn_url, s3_key) VALUES (%s, '%s', '%s', '%s')"
            % (int(movie_id), filename.replace("'", "''"), url.replace("'", "''"), s3_key.replace("'", "''"))
        )
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({"url": url, "key": s3_key}),
        }

    if method == "DELETE":
        body = json.loads(event.get("body", "{}"))
        movie_id = body.get("movie_id")
        filename = body.get("filename")
        if not movie_id or not filename:
            return {
                "statusCode": 400,
                "headers": HEADERS,
                "body": json.dumps({"error": "movie_id and filename required"}),
            }

        s3_key = f"movies/{movie_id}/{filename}"
        s3 = get_s3()
        s3.delete_object(Bucket=BUCKET, Key=s3_key)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM movie_images WHERE movie_id = %s AND filename = '%s'"
            % (int(movie_id), filename.replace("'", "''"))
        )
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({"deleted": s3_key}),
        }

    return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}
