#!/usr/bin/env python3
"""Send a digest file to Telegram via the official Bot API.

Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from environment only.
Never hardcodes secrets. Splits long messages to stay under Telegram limits.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API_ROOT = "https://api.telegram.org"
MAX_MESSAGE_CHARS = 3900  # under 4096 with headroom for markers


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def split_chunks(text: str, limit: int = MAX_MESSAGE_CHARS) -> list[str]:
    text = text.strip()
    if not text:
        raise SystemExit("Digest is empty")
    if len(text) <= limit:
        return [text]

    chunks: list[str] = []
    remaining = text
    while remaining:
        if len(remaining) <= limit:
            chunks.append(remaining)
            break
        cut = remaining.rfind("\n\n", 0, limit)
        if cut < limit // 3:
            cut = remaining.rfind("\n", 0, limit)
        if cut < limit // 3:
            cut = limit
        chunks.append(remaining[:cut].rstrip())
        remaining = remaining[cut:].lstrip()
    return chunks


def get_me(token: str) -> dict:
    url = f"{API_ROOT}/bot{token}/getMe"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Telegram getMe HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Telegram getMe failed: {exc}") from exc
    if not body.get("ok"):
        raise SystemExit(f"Telegram getMe error: {body}")
    return body["result"]


def assert_chat_is_reachable(token: str, chat_id: str) -> None:
    """Fail fast when TELEGRAM_CHAT_ID points at the bot itself (common misconfig)."""
    me = get_me(token)
    bot_username = (me.get("username") or "").lower()
    bot_id = str(me.get("id") or "")
    normalized = chat_id[1:].lower() if chat_id.startswith("@") else chat_id
    if chat_id == bot_id or (bot_username and normalized == bot_username):
        raise SystemExit(
            "TELEGRAM_CHAT_ID points at this bot itself; bots cannot message bots. "
            "Set TELEGRAM_CHAT_ID to a user id, group id, or channel id where the bot can post "
            "(user must /start the bot first for DMs)."
        )


def send_message(token: str, chat_id: str, text: str, parse_mode: str | None) -> dict:
    url = f"{API_ROOT}/bot{token}/sendMessage"
    payload: dict[str, object] = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        hint = ""
        if exc.code == 403 and "can't send messages to the bot" in detail:
            hint = (
                " Hint: TELEGRAM_CHAT_ID must be a user/group/channel, "
                "not this bot's @username."
            )
        raise SystemExit(f"Telegram API HTTP {exc.code}: {detail}{hint}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Telegram API request failed: {exc}") from exc

    if not body.get("ok"):
        raise SystemExit(f"Telegram API error: {body}")
    return body


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Path to digest markdown/text file")
    parser.add_argument(
        "--parse-mode",
        choices=["HTML", "Markdown", "MarkdownV2", "none"],
        default="none",
        help="Telegram parse mode (default: plain text)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print chunk count and sizes without sending",
    )
    args = parser.parse_args()

    if not args.path.is_file():
        raise SystemExit(f"File not found: {args.path}")

    text = args.path.read_text(encoding="utf-8")
    chunks = split_chunks(text)
    parse_mode = None if args.parse_mode == "none" else args.parse_mode

    if args.dry_run:
        for i, chunk in enumerate(chunks, 1):
            print(f"chunk {i}/{len(chunks)}: {len(chunk)} chars")
        return

    token = require_env("TELEGRAM_BOT_TOKEN")
    chat_id = require_env("TELEGRAM_CHAT_ID")
    assert_chat_is_reachable(token, chat_id)

    for i, chunk in enumerate(chunks, 1):
        prefix = f"({i}/{len(chunks)})\n" if len(chunks) > 1 else ""
        send_message(token, chat_id, prefix + chunk, parse_mode)
        if i < len(chunks):
            time.sleep(0.4)

    print(f"Sent {len(chunks)} message(s) to Telegram", file=sys.stderr)


if __name__ == "__main__":
    main()
