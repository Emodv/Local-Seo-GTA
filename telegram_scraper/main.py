#!/usr/bin/env python3
"""
Main orchestrator: fetch Telegram messages → extract business info via Claude
→ deduplicate by phone → store in SQLite → generate static HTML pages.

Usage:
    python main.py            # run once (call from cron)
    python main.py --full     # ignore last_message_id, fetch up to FETCH_LIMIT msgs
"""

import asyncio
import logging
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env: look in this directory first, then parent
_here = Path(__file__).parent
load_dotenv(_here / ".env") or load_dotenv(_here.parent / ".env")

# Now env vars are set, safe to import modules that read them
import db
import telegram_client as tg_mod
from claude_extractor import extract_business_info, extract_phone_fast
from page_generator import generate_index, generate_page, slugify

# ── Config ──────────────────────────────────────────────────────────────────
GROUP_URL: str = os.environ.get("TELEGRAM_GROUP_URL", "https://t.me/Amlaketoronto")
OUTPUT_DIR: str = os.environ.get("OUTPUT_DIR", "output")
IMAGES_DIR: str = os.path.join(OUTPUT_DIR, "static", "images")
FETCH_LIMIT: int = int(os.environ.get("FETCH_LIMIT", "200"))
DELAY: float = float(os.environ.get("DELAY_SECONDS", "2"))

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)


def _unique_slug(base: str, existing: set) -> str:
    slug = base
    n = 2
    while slug in existing:
        slug = f"{base}-{n}"
        n += 1
    return slug


async def run(full: bool = False) -> None:
    db.init_db()
    os.makedirs(IMAGES_DIR, exist_ok=True)

    min_id = 0 if full else db.get_last_message_id()
    log.info("Connecting to Telegram (group=%s, min_id=%d) …", GROUP_URL, min_id)

    async with tg_mod.TelegramFetcher() as fetcher:
        messages = await fetcher.fetch_new_messages(
            GROUP_URL, min_id=min_id, limit=FETCH_LIMIT
        )
        log.info("Fetched %d messages.", len(messages))

        if not messages:
            log.info("Nothing new. Exiting.")
            return

        max_id = min_id
        new_count = updated_count = 0

        for msg in messages:
            max_id = max(max_id, msg.id)
            text = (msg.text or msg.message or "").strip()
            caption = (getattr(msg, "caption", None) or "").strip()
            full_text = f"{text}\n{caption}".strip()
            has_image = msg.media is not None

            if not full_text and not has_image:
                continue

            # ── Fast phone pre-check (skip Claude if duplicate) ──────────
            quick_phone = extract_phone_fast(full_text)
            if quick_phone and db.get_business_by_phone(quick_phone):
                log.info("  [SKIP] phone %s already in DB (msg %d)", quick_phone, msg.id)
                continue

            if not full_text:
                continue

            await asyncio.sleep(DELAY)

            # ── Claude extraction ─────────────────────────────────────────
            log.info("  Extracting msg %d …", msg.id)
            info = extract_business_info(full_text, has_image=has_image)
            if not info:
                log.warning("  [SKIP] extraction failed for msg %d", msg.id)
                continue

            name: str = (info.get("business_name") or "").strip()
            if not name:
                log.warning("  [SKIP] no business name in msg %d", msg.id)
                continue

            phone: str = info.get("phone") or quick_phone or ""

            # ── Duplicate check with Claude's phone ───────────────────────
            if phone:
                existing = db.get_business_by_phone(phone)
                if existing:
                    updates: dict = {}
                    if info.get("description") and not existing.get("description"):
                        updates["description"] = info["description"]
                    if info.get("telegram_username") and not existing.get("telegram"):
                        updates["telegram"] = info["telegram_username"]
                    if updates:
                        db.update_business(phone, updates)
                        updated_count += 1
                        log.info("  [UPDATE] %s (%s)", name, phone)
                    continue

            # ── Download image ────────────────────────────────────────────
            image_path: str = ""
            if has_image:
                slug_prefix = re.sub(r"\D", "", phone) if phone else f"msg{msg.id}"
                save_to = os.path.join(IMAGES_DIR, f"{slug_prefix}_{int(time.time())}")
                dl = await fetcher.download_image(msg, save_to)
                if dl:
                    image_path = dl
                    log.info("  Downloaded image: %s", image_path)

            # ── Unique slug ───────────────────────────────────────────────
            used_slugs = {b["slug"] for b in db.get_all_businesses() if b.get("slug")}
            slug = _unique_slug(slugify(name), used_slugs)

            record = {
                "phone": phone or f"unknown_{msg.id}",
                "name": name,
                "telegram": info.get("telegram_username", ""),
                "category": info.get("category", "other"),
                "description": info.get("description", ""),
                "image_path": image_path,
                "slug": slug,
            }

            db.insert_business(record)
            generate_page(record, OUTPUT_DIR)
            new_count += 1
            log.info("  [NEW] %s → %s/%s.html", name, OUTPUT_DIR, slug)

    # ── Persist state & rebuild index ────────────────────────────────────────
    db.set_last_message_id(max_id)
    all_businesses = db.get_all_businesses()
    generate_index(all_businesses, OUTPUT_DIR)

    log.info(
        "\nDone. New=%d  Updated=%d  Total in DB=%d",
        new_count, updated_count, len(all_businesses),
    )


def main() -> None:
    full_mode = "--full" in sys.argv
    asyncio.run(run(full=full_mode))


if __name__ == "__main__":
    main()
