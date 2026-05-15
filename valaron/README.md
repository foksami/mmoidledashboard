# Valaron — IdleMMO Dashboard

A personal dashboard for [IdleMMO](https://idle-mmo.com) — tracks your character's skills, gear progression, market data, goals, and activity efficiency.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![SQLite](https://img.shields.io/badge/SQLite-local-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## Features

- **Character overview** — gold, tokens, shards, total level (live from API)
- **Skill bars** — all skills with XP rates from recent sessions
- **BIS gear tracker** — best-in-slot per slot, what you're missing to equip next tier
- **Next Move** — ranks pending gear upgrades by stat gain per grind hour
- **Gathering market** — ores & logs with price, volume, 7-day trends, sparklines
- **Activity efficiency** — gold/h and XP/h per activity type over last 7 days
- **Goals** — custom goals (skill level, XP, gold, total level) with ETA
- **Action countdown** — live timer for current action
- **World bosses, shrine, weather, effects**
- **Draggable / collapsible panels**

---

## Requirements

- Node.js 18+
- An IdleMMO account with API access enabled
- Your IdleMMO API key (see below)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/foksami/mmoidledashboard.git
cd mmoidledashboard
npm install
```

### 2. Get your IdleMMO API key

1. Log in to [idle-mmo.com](https://idle-mmo.com)
2. Go to **Settings → API Tokens**
3. Create a new token — needs at minimum the `character:read` scope
4. Copy the key (starts with `idlemmo_...`)

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your key:

```env
IDLEMMO_API_KEY=idlemmo_your_key_here
```

### 4. Initialize the database

```bash
npm run migrate
```

### 5. Seed the item catalog (one-time, ~15 min)

Downloads all equippable gear from the IdleMMO API and stores it locally.
Rate-limited to stay under API limits — grab a coffee.

```bash
npx tsx scripts/fetch-catalog.ts
```

### 6. Seed gear market prices (one-time, ~16 min)

Fetches current market prices for all catalog items.

```bash
npx tsx scripts/fetch-market.ts
```

### 7. Seed gathering market data (one-time, ~70 sec)

Fetches 30 days of daily price/volume history for all ores and logs.

```bash
npm run market:gathering
```

### 7b. Seed crafting recipes (one-time, ~25 min)

Fetches all 370+ recipes from the IdleMMO items API and stores them in the DB.
Required for the **Crafting** panel in the Market tab.

```bash
npm run recipes:fetch
```

### 8. Run the poller (background process)

The poller collects character snapshots every time it runs. It needs to keep running
in the background to build up XP rate history, gold tracking, and activity sessions.

```bash
npm run poll
```

Keep this running in a separate terminal, or set up a cron (see below).

### 9. Start the dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Quick start (copy-paste)

### With seed data (fastest — recommended for teammates)

```bash
git clone https://github.com/foksami/mmoidledashboard.git && cd mmoidledashboard/valaron
npm install
cp .env.example .env.local   # add your API key
npm run migrate
npm run seed:import           # loads gear catalog + market history (instant)
npm run poll &                # background poller
npm run dev
```

### Full fresh fetch (if seed is outdated)

```bash
git clone https://github.com/foksami/mmoidledashboard.git && cd mmoidledashboard/valaron
npm install
cp .env.example .env.local        # edit: add your API key
npm run migrate
npx tsx scripts/fetch-catalog.ts  # ~15 min, one-time
npx tsx scripts/fetch-market.ts   # ~16 min, one-time
npm run market:gathering           # ~70 sec, one-time
npm run recipes:fetch              # ~25 min, one-time (crafting tab)
npm run poll &                     # background poller
npm run dev
```

---

## Keeping data fresh: cron jobs

For the dashboard to stay up to date, you need two things running regularly:
the **poller** (character snapshots) and the **market refresh** (price history).

### Option A: crontab (Linux / macOS)

```bash
crontab -e
```

Add these lines (replace `/path/to/mmoidledashboard` with your actual path):

```cron
# Poll character data every 5 minutes
*/5 * * * * cd /path/to/mmoidledashboard && npm run poll >> /tmp/valaron-poll.log 2>&1

# Refresh gathering market data daily at 6:23am
23 6 * * * cd /path/to/mmoidledashboard && npm run market:gathering >> /tmp/valaron-market.log 2>&1

# Refresh gear market prices weekly (Sunday 3am, takes ~16 min)
0 3 * * 0 cd /path/to/mmoidledashboard && npm run market:gear >> /tmp/valaron-market-gear.log 2>&1
```

### Option B: PM2 (recommended for always-on servers)

```bash
npm install -g pm2

# Persistent poller
pm2 start "npm run poll" --name valaron-poll

# Web server (production build)
npm run build
pm2 start "npm start" --name valaron-web

# Market refresh as cron tasks
pm2 start "npm run market:gathering" --name valaron-market-gathering \
  --cron "23 6 * * *" --no-autorestart
pm2 start "npm run market:gear" --name valaron-market-gear \
  --cron "0 3 * * 0" --no-autorestart

# Save and enable autostart on reboot
pm2 save
pm2 startup
```

### Option C: systemd (Linux)

Create `/etc/systemd/system/valaron-poll.service`:

```ini
[Unit]
Description=Valaron IdleMMO poller
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mmoidledashboard
EnvironmentFile=/path/to/mmoidledashboard/.env.local
ExecStart=/usr/bin/npm run poll
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now valaron-poll
```

For the market refresh, add a systemd timer or use a crontab entry alongside systemd.

---

## All npm scripts

| Command | What it does | Frequency |
|---------|-------------|-----------|
| `npm run dev` | Start dev server on localhost:3000 | — |
| `npm run build && npm start` | Production build + server | — |
| `npm run poll` | Snapshot character (skills, gold, action, sessions) | Every 5 min |
| `npm run migrate` | Apply DB schema migrations | After `git pull` |
| `npm run market:gathering` | Refresh 30d daily history for ores + logs (~70s) | Daily |
| `npm run market:smelting` | Refresh market history for ores + bars (~140s) | Daily |
| `npm run market:gear` | Refresh market prices for all gear (~16 min) | Weekly |
| `npm run market:all` | All items — gathering + bars + gear | — |
| `npm run recipes:fetch` | Seed crafting recipes from API (~25 min) | Once |
| `npm run seed:export` | Export catalog + market data to `data/seed.json` | After big fetch |
| `npm run seed:import` | Import seed.json into local DB (instant) | Fresh install |
| `npm run db:generate` | Generate Drizzle migration after schema changes | Dev only |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) | Dev only |
| `npx tsx scripts/fetch-catalog.ts` | Seed gear catalog from API | Once |
| `npx tsx scripts/fetch-market.ts` | Seed gear market prices | Once + weekly |
| `npx tsx scripts/patch-catalog-images.ts` | Update item image URLs | Rarely |

---

## Adding goals

Via the Goals panel in the dashboard (click **+ Add goal**), or from the CLI:

```bash
# Skill level
npx tsx scripts/add-goal.ts --name "Woodcutting 50" --metric skill_level --skill woodcutting --target 50

# Gold target
npx tsx scripts/add-goal.ts --name "1M gold" --metric gold --target 1000000

# XP milestone
npx tsx scripts/add-goal.ts --name "Mining 500k XP" --metric skill_xp --skill mining --target 500000

# Total level
npx tsx scripts/add-goal.ts --name "Total level 200" --metric total_level --target 200
```

---

## Hosting on a VPS (Hetzner / DigitalOcean / etc.)

Cheapest option (~€4/month), full control, SQLite works perfectly.

```bash
# On server
git clone https://github.com/foksami/mmoidledashboard.git
cd mmoidledashboard
npm install
cp .env.example .env.local   # add your key
npm run migrate
npx tsx scripts/fetch-catalog.ts
npx tsx scripts/fetch-market.ts
npm run market:gathering
npm run recipes:fetch          # optional, ~25 min
npm run build

# Start with PM2
npm install -g pm2
pm2 start "npm start" --name valaron-web
pm2 start "npm run poll" --name valaron-poll
pm2 save && pm2 startup

# (optional) nginx reverse proxy for port 80/443
```

## Hosting on Railway

1. Fork this repo on GitHub
2. New Railway project → **Deploy from GitHub repo**
3. Add environment variable: `IDLEMMO_API_KEY=your_key`
4. Add a **Volume**, mount at `/data`, set `DB_PATH=/data/valaron.db`
5. Add a second Railway service (same repo), start command: `npm run poll`
6. Deploy

---

## Tech stack

- [Next.js 16](https://nextjs.org) — App Router, React Server Components
- [SQLite](https://sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Drizzle ORM](https://orm.drizzle.team)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [dnd-kit](https://dndkit.com) — draggable panels

---

## API rate limits

IdleMMO allows 20 requests/minute. The app stays under 18 req/min. Long-running
scripts space requests at 3.5s intervals automatically and handle 429s with backoff.

---

## License

MIT
