"""
Скачивает кадры фильмов с TMDB и сохраняет в S3.
Вызывать POST / — скачает все изображения и вернёт CDN-ссылки.
"""
import json
import os
import urllib.request
import boto3
import time

TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w1280"
S3_ENDPOINT = "https://bucket.poehali.dev"
BUCKET = "files"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

MOVIES = [
    {"id": 1,  "path": "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg"},
    {"id": 2,  "path": "/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg"},
    {"id": 3,  "path": "/qdIMHd4sEoajAKeF06q89F3EmFO.jpg"},
    {"id": 4,  "path": "/velWPhVMQeQKcxggNEU8YmU1jHT.jpg"},
    {"id": 5,  "path": "/3jcbDmRFiQ83drpoMnDGFOB2sZq.jpg"},
    {"id": 6,  "path": "/ppd84D2i9W8jNBaMygTmsxFxWAa.jpg"},
    {"id": 7,  "path": "/mfHDaLxWRBdHBlRWbgScM4CfCBt.jpg"},
    {"id": 8,  "path": "/2WXopfPT9bJhMFAApGdGZeOc5G6.jpg"},
    {"id": 9,  "path": "/qFqSHD6bVRYNsGMpJWVAQ2rmNxo.jpg"},
    {"id": 10, "path": "/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg"},
    {"id": 11, "path": "/xhNLHBCFk6NwOHHEFRlRsEarHPL.jpg"},
    {"id": 12, "path": "/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg"},
    {"id": 13, "path": "/vWkXoFrSsJP5S5R5jQo3LXSBkXe.jpg"},
    {"id": 14, "path": "/1rTJuFtLkFhMdAl0Y7N5TpFxPPN.jpg"},
    {"id": 15, "path": "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg"},
    {"id": 16, "path": "/poec6RqOKY9iSiIUmfyfPfiLtvB.jpg"},
    {"id": 17, "path": "/iEMOBaHlRjIQkgQq3IUkS0Gi2rq.jpg"},
    {"id": 18, "path": "/suaEOtk1N1sgg2MTM42L5XZjyAP.jpg"},
    {"id": 19, "path": "/sw7mordbZxgITU877yTpZCud90M.jpg"},
    {"id": 20, "path": "/3bhkrj58Vtu7enYsLeSHO7QKNTM.jpg"},
    {"id": 21, "path": "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg"},
    {"id": 22, "path": "/2oZklIzUbNzOxTHBMHHiERHJexO.jpg"},
    {"id": 23, "path": "/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg"},
    {"id": 24, "path": "/kI1OluWhLJk3pnR3UBiqqzDyOmk.jpg"},
    {"id": 25, "path": "/fNG7i7RqMErkcqhohV1Sj0KOy9y.jpg"},
    {"id": 26, "path": "/s2bT29y0ngXxxu2IA8AOzzXTRhd.jpg"},
    {"id": 27, "path": "/xJHokMbljvjADYdit5fK5VQsXEG.jpg"},
    {"id": 28, "path": "/zqkmTXzjkAgXmEWLRsY4oj7QKEF.jpg"},
    {"id": 29, "path": "/with3VTLFaRQgqJGjnkW18FHpU4.jpg"},
    {"id": 30, "path": "/o0s4XsEDfDlvit5pDRKjzXR4pp2.jpg"},
    {"id": 31, "path": "/gzqkJxKOToGMfpuOJQRmBQkWiw.jpg"},
    {"id": 32, "path": "/eilstzFMRMbHSBhqCGNBkaqVMKo.jpg"},
    {"id": 33, "path": "/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg"},
    {"id": 34, "path": "/lHu1wtNaczFPGFDTrjCSzeLPTKN.jpg"},
    {"id": 35, "path": "/nlXyaHFqT3aHrLPf6ykGVuLBUV8.jpg"},
    {"id": 36, "path": "/iopYFB1b6Bh7FWZh3onQhph1sih.jpg"},
    {"id": 37, "path": "/czembW0Rk1Ke7lCJGahbOhdCuhx.jpg"},
    {"id": 38, "path": "/nMKdUFyrkinsqBpsqiNMZhOQYIy.jpg"},
    {"id": 39, "path": "/tHbMIIF51rguMNSastqoQwR7XSR.jpg"},
    {"id": 40, "path": "/cyecCkznafoZKQRbWBb7mcIdUcl.jpg"},
    {"id": 41, "path": "/RYMX2wcKCBAr24zEQO2EH6NWR.jpg"},
    {"id": 42, "path": "/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg"},
    {"id": 43, "path": "/orjiB3oUIsyz60hoEqkiGpy5CeO.jpg"},
    {"id": 44, "path": "/8tZYtuWezp8JbcsvHYO0QkFn9gs.jpg"},
    {"id": 45, "path": "/n6bUvigpRFqSwmPp1ZIzTz0Cs5.jpg"},
    {"id": 46, "path": "/9Oy6CZBA35F1xNFnbBHKK9apKIe.jpg"},
    {"id": 47, "path": "/ceG9VzoRAVGwivFU403Wc3AHRys.jpg"},
    {"id": 48, "path": "/b6ZJZHUdMEFECvGiDpJjlfUWela.jpg"},
    {"id": 49, "path": "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"},
    {"id": 50, "path": "/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg"},
    {"id": 51, "path": "/ehGpN04mLJIrSnxcZBMvHeG0eDc.jpg"},
    {"id": 52, "path": "/lEETMSJR1ohaOOF2bRQQKkHnTjN.jpg"},
    {"id": 53, "path": "/qxHBBFBCplMHa6MKdqGJZZWCjPM.jpg"},
    {"id": 54, "path": "/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg"},
    {"id": 55, "path": "/AvSNFHfhSbHajJ6sOHiR2Q2DY1z.jpg"},
    {"id": 56, "path": "/yz4QVqPx3h6hWoEl8K4N3rKFCsv.jpg"},
    {"id": 57, "path": "/nRj4ukLSFdDgVvwJAk44UvUCNt5.jpg"},
    {"id": 58, "path": "/svBBhzSGrqLKH1B6RMh0pGvPyqf.jpg"},
    {"id": 59, "path": "/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg"},
    {"id": 60, "path": "/TU9NIjwzjoKPwQHoHshkFcQUQG.jpg"},
    {"id": 61, "path": "/1Afzjh4EmWumNZFXkpTCQDvbeNO.jpg"},
    {"id": 62, "path": "/pWgK329r1bfDiAGOF4qV4xGTH7p.jpg"},
    {"id": 63, "path": "/pipAkA6LMKnmm1HLIllS8bUkjCI.jpg"},
    {"id": 64, "path": "/lXhgCODAbBXL5buk9yEmTpOoOgR.jpg"},
    {"id": 65, "path": "/bSXfU4dwZyBA1vMmXvejdRXBvuF.jpg"},
    {"id": 66, "path": "/6pq0ugGnGOiYdFXZXWNT3y6O06j.jpg"},
    {"id": 67, "path": "/mMtUybQ6hL24FXo0F3Z4j2KG7kZ.jpg"},
    {"id": 68, "path": "/sCanEeKnGOYLaFMOSocDcBECVtP.jpg"},
    {"id": 69, "path": "/uXDfjJbdP4ijW5hWSBrPu9LDt3.jpg"},
    {"id": 70, "path": "/uZp7dkBmMjdP5NYdwc0kxX9giDz.jpg"},
    {"id": 71, "path": "/rzmCnLDoBNABGPcoDNUFOlXPnHk.jpg"},
    {"id": 72, "path": "/lIv1QinFqz4dlp5U4lQ6HaiskOZ.jpg"},
    {"id": 73, "path": "/HlGrTMBbGGETi52SrJepJAQBzYH.jpg"},
    {"id": 74, "path": "/o1YK9gFJPGZaCb5KrPbFd6TJoF4.jpg"},
    {"id": 75, "path": "/kf456ZqeC45XTvo6W9pW5clYKfQ.jpg"},
    {"id": 76, "path": "/AvFyGQi7eELn1UGKy5QQg1CBfcP.jpg"},
    {"id": 77, "path": "/kHXEpyfl6zqn8a6YuozZUujufXf.jpg"},
    {"id": 78, "path": "/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg"},
    {"id": 79, "path": "/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg"},
    {"id": 80, "path": "/q0bCgaYAMoHNqZYpn3pjULEsWS5.jpg"},
    {"id": 81, "path": "/5KTR0gMFqOgpTej3jnnDtELLaBo.jpg"},
    {"id": 82, "path": "/prs1LzFbLfO3Y4vTTlmYSbxBNqE.jpg"},
    {"id": 83, "path": "/vfWMmZvzKMOYCaGMILLPRRlBwkK.jpg"},
]


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    aws_key = os.environ.get("AWS_ACCESS_KEY_ID", "")
    aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

    s3 = boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret,
    )

    results = {}
    errors = []

    for movie in MOVIES:
        movie_id = movie["id"]
        path = movie["path"]
        filename = path.lstrip("/")
        s3_key = f"movies/{filename}"
        tmdb_url = f"{TMDB_IMG_BASE}{path}"

        try:
            req = urllib.request.Request(tmdb_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()

            s3.put_object(
                Bucket=BUCKET,
                Key=s3_key,
                Body=data,
                ContentType="image/jpeg",
            )

            cdn_url = f"https://cdn.poehali.dev/projects/{aws_key}/bucket/{s3_key}"
            results[movie_id] = cdn_url
            print(f"OK [{movie_id}] {filename}")

        except Exception as e:
            print(f"ERR [{movie_id}] {filename}: {e}")
            errors.append({"id": movie_id, "error": str(e)})
            results[movie_id] = None

        time.sleep(0.1)

    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({
            "ok": sum(1 for v in results.values() if v),
            "total": len(MOVIES),
            "errors": errors,
            "results": results,
        }),
    }
