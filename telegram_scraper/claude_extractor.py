"""Extract structured business info from Telegram message text using Claude."""

import json
import os
import re
from typing import Any, Dict, Optional

import anthropic

MODEL = "claude-haiku-4-5-20251001"

_SYSTEM = """You are a data extraction assistant. Extract business information from Telegram ad messages (often in Persian/Farsi mixed with English).
Return ONLY valid JSON with exactly these fields (no extra keys, no comments):
{
  "business_name": "string – name of the business or service provider",
  "phone": "string – primary Canadian phone number, digits only (10 digits), empty string if none",
  "telegram_username": "string – Telegram @username without the @, empty string if none",
  "category": "one of: driving_school | real_estate | furniture | marketing | insurance | restaurant | beauty | construction | auto | other",
  "description": "string – 1-2 sentence English summary of the service offered"
}

Rules:
- phone: strip all non-digits; if 11 digits starting with 1, drop the leading 1; return last 10 digits
- telegram_username: strip leading @ and any t.me/ prefix
- If a field cannot be determined, use empty string"""

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


_PHONE_RE = re.compile(
    r"""
    (?:\+?1[-.\s]?)?          # optional country code
    \(?([2-9]\d{2})\)?        # area code
    [-.\s]?
    ([2-9]\d{2})              # exchange
    [-.\s]?
    (\d{4})                   # subscriber
    |
    \b(\d{10})\b              # plain 10-digit
    """,
    re.VERBOSE,
)


def extract_phone_fast(text: str) -> str:
    """Return the first phone number found using regex (digits only, 10 chars), or ''."""
    m = _PHONE_RE.search(text or "")
    if not m:
        return ""
    digits = re.sub(r"\D", "", m.group(0))
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits[-10:] if len(digits) >= 10 else ""


def _clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
    return raw.strip()


def _normalize(data: Dict[str, Any]) -> Dict[str, Any]:
    phone = re.sub(r"\D", "", str(data.get("phone", "")))
    if len(phone) == 11 and phone.startswith("1"):
        phone = phone[1:]
    data["phone"] = phone[-10:] if len(phone) >= 10 else phone

    tg = str(data.get("telegram_username", "")).strip()
    tg = tg.lstrip("@")
    if "t.me/" in tg:
        tg = tg.split("t.me/")[-1].rstrip("/")
    data["telegram_username"] = tg

    return data


def extract_business_info(
    text: str, has_image: bool = False
) -> Optional[Dict[str, Any]]:
    """Call Claude to extract business fields from message text. Returns dict or None."""
    if not text or not text.strip():
        return None

    prompt = f"Message text:\n{text}"
    if has_image:
        prompt += "\n\n[Note: this message has an attached image]"

    try:
        resp = _get_client().messages.create(
            model=MODEL,
            max_tokens=400,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _clean_json(resp.content[0].text)
        data = json.loads(raw)
        return _normalize(data)

    except json.JSONDecodeError as exc:
        print(f"[ERROR] Claude returned invalid JSON: {exc}")
        return None
    except anthropic.RateLimitError:
        import time
        print("[WARN] Claude rate limit hit – sleeping 60s")
        time.sleep(60)
        return None
    except Exception as exc:
        print(f"[ERROR] Claude API error: {exc}")
        return None
