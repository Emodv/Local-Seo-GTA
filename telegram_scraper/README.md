# Telegram Business Directory Scraper

Monitors a Telegram group, extracts business info with Claude AI, deduplicates by phone number, and generates a static HTML directory site.

## How it works

```
Telegram group → fetch messages (Telethon)
                       ↓
              Quick regex phone check
                       ↓ (only if new)
           Claude Haiku extracts JSON info
                       ↓
              SQLite deduplication (phone key)
                       ↓
        Static HTML pages in output/
```

## Prerequisites

- Python 3.9+
- Telegram account (must be a member of the target group)
- Telegram API credentials from https://my.telegram.org
- Claude API key from https://console.anthropic.com

## Setup

```bash
cd telegram_scraper

# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy and fill in credentials
cp .env.example .env
# Edit .env with your TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE, ANTHROPIC_API_KEY
```

## First run (interactive – required once)

On the first run Telethon will ask for your Telegram verification code:

```bash
python main.py --full
```

Enter the code sent to your Telegram app. A `telegram_session.session` file is created and reused for all future runs. **Keep this file secret – it grants access to your Telegram account.**

After the first run the `output/` directory will contain:
```
output/
├── index.html               ← directory listing (all businesses)
├── rastbod-driving-school.html
├── john-real-estate.html
└── static/images/           ← downloaded business photos
```

## Subsequent runs

```bash
python main.py          # fetches only messages newer than last run
python main.py --full   # re-fetches up to FETCH_LIMIT regardless of last run
```

## Scheduling (cron – every hour)

Add this line to your crontab (`crontab -e`):

```cron
0 * * * * cd /path/to/telegram_scraper && python main.py >> /var/log/tg_directory.log 2>&1
```

## Scheduling (GitHub Actions)

Create `.github/workflows/scrape.yml`:

```yaml
name: Scrape Telegram Directory
on:
  schedule:
    - cron: '0 * * * *'   # every hour
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r telegram_scraper/requirements.txt
      - run: python telegram_scraper/main.py
        env:
          TELEGRAM_API_ID: ${{ secrets.TELEGRAM_API_ID }}
          TELEGRAM_API_HASH: ${{ secrets.TELEGRAM_API_HASH }}
          TELEGRAM_PHONE: ${{ secrets.TELEGRAM_PHONE }}
          TELEGRAM_GROUP_URL: ${{ secrets.TELEGRAM_GROUP_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OUTPUT_DIR: output
          DB_PATH: businesses.db
```

> **Note for GitHub Actions**: The `telegram_session.session` file must be committed to the repo (or stored as a secret / artifact) so GitHub can authenticate without an interactive prompt.

## Deploying the output/ directory

### Netlify
1. Push the `output/` folder to a GitHub repo (or use the same repo)
2. Set publish directory to `output`
3. Netlify auto-deploys on push

### Cloudflare Pages
1. Connect your GitHub repo
2. Build command: `python telegram_scraper/main.py`
3. Output directory: `output`

### Clean URLs (optional)
Run this once after generating pages:
```python
from page_generator import write_netlify_redirects
write_netlify_redirects("output")
```
This writes `output/_redirects` so `/rastbod-driving-school` works without `.html`.

## Configuration

All settings in `telegram_scraper/.env`:

| Variable | Default | Description |
|---|---|---|
| `TELEGRAM_API_ID` | – | Required. From my.telegram.org |
| `TELEGRAM_API_HASH` | – | Required. From my.telegram.org |
| `TELEGRAM_PHONE` | – | Required. Your phone with country code |
| `TELEGRAM_GROUP_URL` | `https://t.me/Amlaketoronto` | Group to monitor |
| `ANTHROPIC_API_KEY` | – | Required. Claude API key |
| `OUTPUT_DIR` | `output` | Where HTML pages are written |
| `DB_PATH` | `businesses.db` | SQLite database file |
| `FETCH_LIMIT` | `200` | Max messages per run |
| `DELAY_SECONDS` | `2` | Pause between messages (rate limit safety) |

## Deduplication logic

Phone number is the primary unique key. When a message arrives:

1. Regex extracts phone from raw text (fast, no API call)
2. If phone exists in DB → skip Claude, just update `last_updated`
3. If phone is new (or not found by regex) → call Claude for full extraction
4. Claude returns `business_name`, `phone`, `telegram_username`, `category`, `description`
5. Second DB check with Claude's phone (catches formatting differences)
6. If still new → insert row + generate HTML page
7. If duplicate with new info (e.g. adds description) → update existing row only

This means a business posting every day generates exactly **one** landing page.
