"""
Управление кадрами фильмов в S3.
GET /?movie_id=1 — список кадров фильма.
GET /?all=1 — все кадры всех фильмов (map movie_id -> [urls]).
POST / {movie_id, image_base64, filename} — загрузить кадр.
DELETE / {movie_id, filename} — удалить кадр.
"""
import json
import os
import base64
import boto3

S3_ENDPOINT = "https://bucket.poehali.dev"
BUCKET = "files"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def list_movie_images(s3, movie_id: int) -> list:
    prefix = f"movies/{movie_id}/"
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    urls = []
    for obj in resp.get("Contents", []):
        k = obj["Key"]
        if k.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            urls.append(cdn_url(k))
    return urls


def list_all_images(s3) -> dict:
    prefix = "movies/"
    result = {}
    continuation = None
    while True:
        kwargs = {"Bucket": BUCKET, "Prefix": prefix, "MaxKeys": 1000}
        if continuation:
            kwargs["ContinuationToken"] = continuation
        resp = s3.list_objects_v2(**kwargs)
        for obj in resp.get("Contents", []):
            k = obj["Key"]
            if not k.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            parts = k.replace(prefix, "").split("/")
            if len(parts) >= 2:
                mid = parts[0]
                if mid not in result:
                    result[mid] = []
                result[mid].append(cdn_url(k))
        if resp.get("IsTruncated"):
            continuation = resp.get("NextContinuationToken")
        else:
            break
    return result


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    s3 = get_s3()

    if method == "GET":
        params = event.get("queryStringParameters") or {}

        if params.get("all") == "1":
            images = list_all_images(s3)
            return {
                "statusCode": 200,
                "headers": HEADERS,
                "body": json.dumps({"images": images}),
            }

        movie_id = params.get("movie_id")
        if not movie_id:
            return {
                "statusCode": 400,
                "headers": HEADERS,
                "body": json.dumps({"error": "movie_id required"}),
            }
        urls = list_movie_images(s3, int(movie_id))
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
        s3.put_object(
            Bucket=BUCKET,
            Key=s3_key,
            Body=image_data,
            ContentType=content_type,
        )
        url = cdn_url(s3_key)
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
        s3.delete_object(Bucket=BUCKET, Key=s3_key)
        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({"deleted": s3_key}),
        }

    return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}
