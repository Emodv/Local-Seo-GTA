"""Generate static HTML landing pages from business records."""

import os
import re
from typing import Any, Dict, List

CATEGORY_LABEL: Dict[str, str] = {
    "driving_school": "Driving School",
    "real_estate": "Real Estate",
    "furniture": "Furniture & Home",
    "marketing": "Marketing",
    "insurance": "Insurance",
    "restaurant": "Restaurant",
    "beauty": "Beauty & Spa",
    "construction": "Construction",
    "auto": "Auto Services",
    "other": "Business Services",
}

CATEGORY_ICON: Dict[str, str] = {
    "driving_school": "🚗",
    "real_estate": "🏠",
    "furniture": "🪑",
    "marketing": "📣",
    "insurance": "🛡️",
    "restaurant": "🍽️",
    "beauty": "💅",
    "construction": "🔨",
    "auto": "🔧",
    "other": "🏢",
}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")[:60]


def _fmt_phone(phone: str) -> str:
    d = re.sub(r"\D", "", phone)
    return f"({d[:3]}) {d[3:6]}-{d[6:]}" if len(d) == 10 else phone


def _business_page_html(b: Dict[str, Any], output_dir: str) -> str:
    name = b.get("name", "Business")
    phone = b.get("phone", "")
    telegram = b.get("telegram", "")
    category = b.get("category", "other")
    description = b.get("description", "")
    image_path = b.get("image_path", "")

    icon = CATEGORY_ICON.get(category, "🏢")
    label = CATEGORY_LABEL.get(category, "Business")
    display_phone = _fmt_phone(phone)

    # Image path relative to output/ root; listing page is at output/{slug}.html
    image_html = ""
    if image_path and os.path.exists(image_path):
        rel = os.path.relpath(image_path, start=output_dir)
        rel = rel.replace("\\", "/")
        image_html = f'<div class="img-wrap"><img src="{rel}" alt="{name}" loading="lazy"></div>'

    call_btn = (
        f'<a href="tel:{phone}" class="btn call">📞 Call {display_phone}</a>'
        if phone
        else ""
    )
    tg_btn = (
        f'<a href="https://t.me/{telegram}" target="_blank" rel="noopener" class="btn tg">💬 Message on Telegram</a>'
        if telegram
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{description[:155]}">
<title>{name} – Toronto Business Directory</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#222}}
.hero{{background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:48px 24px 40px;text-align:center}}
.badge{{display:inline-block;background:rgba(255,255,255,.2);border-radius:20px;padding:4px 14px;font-size:13px;margin-bottom:16px}}
.hero h1{{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:700;margin-bottom:10px}}
.hero .sub{{opacity:.85;font-size:1rem;max-width:500px;margin:0 auto}}
.card{{background:#fff;border-radius:14px;box-shadow:0 2px 16px rgba(0,0,0,.09);max-width:700px;margin:-28px auto 0;padding:28px 24px 32px}}
.img-wrap{{border-radius:10px;overflow:hidden;margin-bottom:22px}}
.img-wrap img{{width:100%;height:auto;max-height:400px;object-fit:cover;display:block}}
.desc{{font-size:1rem;line-height:1.65;color:#444;margin-bottom:24px}}
.actions{{display:flex;flex-direction:column;gap:12px}}
.btn{{display:block;padding:15px 20px;border-radius:9px;font-size:1rem;font-weight:600;text-align:center;text-decoration:none;transition:opacity .15s}}
.btn:hover{{opacity:.86}}
.call{{background:#d32f2f;color:#fff}}
.tg{{background:#0088cc;color:#fff}}
@media(min-width:480px){{.actions{{flex-direction:row}}.btn{{flex:1}}}}
.back{{display:block;text-align:center;margin:20px auto 0;color:#1a237e;font-size:14px;text-decoration:none}}
.back:hover{{text-decoration:underline}}
footer{{text-align:center;font-size:12px;color:#888;padding:28px 16px 32px}}
</style>
</head>
<body>
<div class="hero">
  <div class="badge">{icon} {label}</div>
  <h1>{name}</h1>
  {f'<p class="sub">{description}</p>' if description else ''}
</div>
<div style="padding:0 16px 40px">
  <div class="card">
    {image_html}
    {f'<p class="desc">{description}</p>' if description and not image_html else ''}
    <div class="actions">{call_btn}{tg_btn}</div>
  </div>
  <a class="back" href="index.html">← Back to Directory</a>
</div>
<footer>Toronto Business Directory &mdash; <a href="index.html">Browse all listings</a></footer>
</body>
</html>"""


def generate_page(business: Dict[str, Any], output_dir: str) -> str:
    """Write {output_dir}/{slug}.html. Returns the file path."""
    os.makedirs(output_dir, exist_ok=True)
    slug = business.get("slug") or slugify(business.get("name", "business"))
    html = _business_page_html(business, output_dir)
    path = os.path.join(output_dir, f"{slug}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path


def generate_index(businesses: List[Dict[str, Any]], output_dir: str) -> None:
    """Write {output_dir}/index.html listing all businesses."""
    os.makedirs(output_dir, exist_ok=True)

    cards = ""
    for b in businesses:
        name = b.get("name", "Business")
        phone = b.get("phone", "")
        telegram = b.get("telegram", "")
        category = b.get("category", "other")
        description = b.get("description", "")
        slug = b.get("slug") or slugify(name)
        icon = CATEGORY_ICON.get(category, "🏢")
        label = CATEGORY_LABEL.get(category, "Business")

        img_html = ""
        image_path = b.get("image_path", "")
        if image_path and os.path.exists(image_path):
            rel = os.path.relpath(image_path, start=output_dir).replace("\\", "/")
            img_html = f'<img class="card-img" src="{rel}" alt="{name}" loading="lazy">'

        cards += f"""
<a href="{slug}.html" class="biz-card">
  {img_html if img_html else f'<div class="placeholder">{icon}</div>'}
  <div class="info">
    <span class="cat">{icon} {label}</span>
    <h3>{name}</h3>
    {f'<p class="desc">{description[:110]}{"…" if len(description)>110 else ""}</p>' if description else ''}
    {f'<span class="detail">📞 {_fmt_phone(phone)}</span>' if phone else ''}
    {f'<span class="detail">💬 @{telegram}</span>' if telegram else ''}
  </div>
</a>"""

    total = len(businesses)
    empty_state = """
<div class="empty">
  <div class="empty-icon">📡</div>
  <h2>New listings are on the way</h2>
  <p>This directory updates automatically as businesses post in the source Telegram group.
  Check back soon — the first batch is on its way.</p>
</div>""" if total == 0 else ""
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Toronto & GTA Business Directory – local Persian businesses with phone numbers and Telegram contacts.">
<title>Toronto Business Directory</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#222}}
header{{background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:48px 24px 36px;text-align:center}}
header h1{{font-size:clamp(1.7rem,4vw,2.5rem);font-weight:700;margin-bottom:8px}}
header p{{opacity:.85}}
.count{{display:inline-block;background:rgba(255,255,255,.2);border-radius:20px;padding:4px 14px;font-size:13px;margin-top:14px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;max-width:1100px;margin:32px auto;padding:0 16px}}
.biz-card{{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden;text-decoration:none;color:inherit;transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column}}
.biz-card:hover{{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.12)}}
.card-img{{width:100%;height:180px;object-fit:cover;display:block}}
.placeholder{{height:110px;background:linear-gradient(135deg,#e8eaf6,#c5cae9);display:flex;align-items:center;justify-content:center;font-size:3rem}}
.info{{padding:14px 16px 18px;flex:1;display:flex;flex-direction:column;gap:3px}}
.cat{{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.06em}}
.info h3{{font-size:1.05rem;font-weight:600;margin:4px 0 2px}}
.desc{{font-size:13px;color:#666;line-height:1.45}}
.detail{{font-size:12px;color:#1a237e;margin-top:5px;display:block}}
.empty{{max-width:480px;margin:48px auto;text-align:center;color:#555;padding:0 24px}}
.empty-icon{{font-size:2.6rem;margin-bottom:12px}}
.empty h2{{font-size:1.3rem;color:#1a237e;margin-bottom:10px}}
.empty p{{font-size:14px;line-height:1.6}}
footer{{text-align:center;font-size:12px;color:#888;padding:32px 16px}}
</style>
</head>
<body>
<header>
  <h1>🗂️ Toronto Business Directory</h1>
  <p>Local GTA businesses from Telegram community ads</p>
  <div class="count">{total} listings</div>
</header>
{f'<div class="grid">{cards}</div>' if total else empty_state}
<footer>Toronto Business Directory &mdash; Listings sourced from Telegram community groups. Contact businesses directly.</footer>
</body>
</html>"""

    with open(os.path.join(output_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)


def write_netlify_redirects(output_dir: str) -> None:
    """Optional: write _redirects for Netlify so /slug works without .html."""
    os.makedirs(output_dir, exist_ok=True)
    redirects = "# Serve .html files at clean paths\n"
    redirects += "/* /:splat.html  200\n"
    with open(os.path.join(output_dir, "_redirects"), "w") as f:
        f.write(redirects)
