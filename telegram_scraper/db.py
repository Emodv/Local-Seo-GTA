"""SQLite helpers for the Telegram business directory."""

import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

import os

DB_PATH = os.environ.get("DB_PATH", "businesses.db")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS businesses (
                phone        TEXT PRIMARY KEY,
                name         TEXT NOT NULL,
                telegram     TEXT DEFAULT '',
                category     TEXT DEFAULT 'other',
                description  TEXT DEFAULT '',
                image_path   TEXT DEFAULT '',
                slug         TEXT UNIQUE,
                first_seen   TEXT NOT NULL,
                last_updated TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS state (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            INSERT OR IGNORE INTO state (key, value)
            VALUES ('last_message_id', '0');
        """)


def get_business_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM businesses WHERE phone = ?", (phone,)
        ).fetchone()
        return dict(row) if row else None


def insert_business(data: Dict[str, Any]) -> None:
    now = datetime.utcnow().isoformat()
    with _conn() as conn:
        conn.execute(
            """INSERT INTO businesses
               (phone, name, telegram, category, description, image_path, slug, first_seen, last_updated)
               VALUES (:phone, :name, :telegram, :category, :description, :image_path, :slug, :now, :now)""",
            {**data, "now": now},
        )


def update_business(phone: str, data: Dict[str, Any]) -> None:
    now = datetime.utcnow().isoformat()
    allowed = {"name", "telegram", "description", "image_path"}
    updates = {k: v for k, v in data.items() if k in allowed and v}
    if not updates:
        return
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    with _conn() as conn:
        conn.execute(
            f"UPDATE businesses SET {set_clause}, last_updated = :now WHERE phone = :phone",
            {**updates, "now": now, "phone": phone},
        )


def get_all_businesses() -> List[Dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM businesses ORDER BY first_seen DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_last_message_id() -> int:
    with _conn() as conn:
        row = conn.execute(
            "SELECT value FROM state WHERE key = 'last_message_id'"
        ).fetchone()
        return int(row["value"]) if row else 0


def set_last_message_id(msg_id: int) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO state (key, value) VALUES ('last_message_id', ?)",
            (str(msg_id),),
        )
