"""Telethon wrapper: connect, fetch messages, download images."""

import os
from typing import List, Optional

from telethon import TelegramClient as _Client
from telethon.tl.types import Message

API_ID: int = int(os.environ["TELEGRAM_API_ID"])
API_HASH: str = os.environ["TELEGRAM_API_HASH"]
PHONE: str = os.environ["TELEGRAM_PHONE"]
SESSION_FILE: str = os.environ.get("TELEGRAM_SESSION_FILE", "telegram_session")


class TelegramFetcher:
    def __init__(self) -> None:
        self._client = _Client(SESSION_FILE, API_ID, API_HASH)

    async def __aenter__(self) -> "TelegramFetcher":
        # start() prompts for code on first run; uses saved session file after that
        await self._client.start(phone=PHONE)
        return self

    async def __aexit__(self, *_) -> None:
        await self._client.disconnect()

    async def fetch_new_messages(
        self,
        group_url: str,
        min_id: int = 0,
        limit: int = 200,
    ) -> List[Message]:
        entity = await self._client.get_entity(group_url)
        messages: List[Message] = []
        async for msg in self._client.iter_messages(
            entity, limit=limit, min_id=min_id, reverse=True
        ):
            if msg.text or getattr(msg, "caption", None) or msg.media:
                messages.append(msg)
        return messages

    async def download_image(self, message: Message, save_path: str) -> Optional[str]:
        if not message.media:
            return None
        try:
            path = await self._client.download_media(message.media, file=save_path)
            return str(path) if path else None
        except Exception as exc:
            print(f"[WARN] Image download failed for msg {message.id}: {exc}")
            return None
