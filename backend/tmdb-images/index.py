"""
Получает кадры (backdrops) из фильмов через TMDB API.
Принимает список tmdbId через query string, возвращает словарь {tmdbId: imageUrl}.
"""
import json
import os
import urllib.request

TMDB_BASE = "https://api.themoviedb.org/3"
IMG_BASE = "https://image.tmdb.org/t/p/w1280"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def fetch_backdrop(tmdb_id: int, api_key: str) -> str:
    url = f"{TMDB_BASE}/movie/{tmdb_id}/images?api_key={api_key}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode())
    backdrops = data.get("backdrops", [])
    if not backdrops:
        return ""
    sorted_bd = sorted(backdrops, key=lambda x: x.get("vote_average", 0), reverse=True)
    top = sorted_bd[:5]
    pick = top[tmdb_id % len(top)]
    return f"{IMG_BASE}{pick['file_path']}"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    api_key = os.environ.get("TMDB_API_KEY", "e789191df94eb3e69769eb98236c09b6")

    params = event.get("queryStringParameters") or {}
    ids_raw = params.get("ids", "")
    if not ids_raw:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "ids param required"})}

    tmdb_ids = [int(x) for x in ids_raw.split(",") if x.strip().isdigit()]

    result = {}
    for tmdb_id in tmdb_ids:
        try:
            url_str = fetch_backdrop(tmdb_id, api_key)
            print(f"tmdb_id={tmdb_id} -> {url_str[:80] if url_str else 'EMPTY'}")
            result[str(tmdb_id)] = url_str
        except Exception as e:
            print(f"Error fetching {tmdb_id}: {e}")
            result[str(tmdb_id)] = ""

    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({"images": result}),
    }