"""Baixa o Ninja Adventure Asset Pack (CC0, pixel-boy) pelo fluxo público de download gratuito do itch.io."""

from __future__ import annotations

import http.cookiejar
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = "https://pixel-boy.itch.io/ninja-adventure-asset-pack"
TARGET = ROOT / ".tmp-ninja" / "pack.zip"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(url: str, data: dict | None = None, referer: str = PAGE) -> bytes:
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "User-Agent": UA,
            "Referer": referer,
            "X-Requested-With": "XMLHttpRequest" if data is not None else "",
        },
    )
    with opener.open(req, timeout=60) as response:
        return response.read()


def csrf(html: str) -> str:
    match = re.search(r'name="csrf_token"\s+value="([^"]+)"', html) or re.search(
        r'<meta name="csrf_token" value="([^"]+)"', html
    )
    if not match:
        raise SystemExit("csrf_token não encontrado")
    return match.group(1)


def main() -> None:
    html = request(PAGE).decode("utf-8", "replace")
    token = csrf(html)
    info = json.loads(request(PAGE + "/download_url", {"csrf_token": token}))
    download_page = info.get("url")
    print("download page", download_page)
    if not download_page:
        raise SystemExit(f"sem url de download: {info}")
    page = request(download_page).decode("utf-8", "replace")
    (ROOT / ".tmp-ninja" / "download.html").write_text(page, encoding="utf-8")
    token = csrf(page)
    uploads = re.findall(r'data-upload_id="(\d+)"', page)
    names = re.findall(r'<strong title="([^"]+)" class="name">', page)
    print("uploads", list(zip(uploads, names)))
    chosen = None
    for upload, name in zip(uploads, names):
        if "Asset Pack" in name and name.endswith(".zip"):
            chosen = upload
            break
    if not chosen:
        raise SystemExit("zip do pacote não encontrado")
    parsed = urllib.parse.urlparse(download_page)
    key = urllib.parse.unquote(parsed.path.rstrip("/").split("/")[-1])
    query = urllib.parse.parse_qs(parsed.query)
    params = {"source": "game_download"}
    if "download" in parsed.path:
        params["key"] = key
    for name, values in query.items():
        params[name] = values[0]
    file_url = f"{PAGE}/file/{chosen}?{urllib.parse.urlencode(params)}"
    print("file url", file_url)
    meta = json.loads(request(file_url, {"csrf_token": token}, referer=download_page))
    cdn = meta.get("url")
    if not cdn:
        raise SystemExit(f"sem url final: {meta}")
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(cdn, headers={"User-Agent": UA})
    with opener.open(req, timeout=600) as response, TARGET.open("wb") as out:
        total = 0
        while True:
            chunk = response.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
            total += len(chunk)
            if total % (10 << 20) < (1 << 20):
                print(f"{total >> 20} MB", flush=True)
    print("saved", TARGET, TARGET.stat().st_size)


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        print("HTTP", error.code, error.read()[:300], file=sys.stderr)
        raise
