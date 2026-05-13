# Valaron — IdleMMO Personal Command Center
Personal stats dashboard for IdleMMO. Read-only, single-user, multi-character (alts).

---
## Quick Context for Next Chat
If picking this up in a fresh Claude session:
- **Builder:** Mike (Polish, casual style, prefers directness, no motivational fluff)
- **Stack:** Next.js 15 + SQLite (local) / Turso (prod) + Anthropic API
- **Scope:** Personal use, single IdleMMO account, multiple characters (alts)
- **Visual reference:** `idle-mmo-dashboard.jsx` — attach this mockup file when starting fresh chat
- **Explicitly dropped:** multi-user sharing / multi-tenant SaaS. Single user only.

---
## Decisions Already Locked
- Personal use only — no auth, no signup, key in env var
- Multi-character support (alts) via character switcher in top bar
- Tech stack: Next.js 15 (App Router) + **SQLite locally / Turso in prod** + Anthropic API + Recharts + Tailwind
- Visual direction: "Bloomberg terminal × dark fantasy command center" — palette and typography locked (see Design System)
- Mockup is the source of truth for UI layout: `idle-mmo-dashboard.jsx`
- **Supabase dropped** — overkill for single-user. SQLite locally, Turso when deploying.

---
## IdleMMO API — VERIFIED (Phase 0 complete)

### Base URL & Auth
```
Base: https://api.idle-mmo.com/v1
Auth: Authorization: Bearer <key>
User-Agent: Valaron/0.1 (Contact: michalfoksa@gmail.com)
Rate limit: 20 req/min
```

### Account
- API key page: https://web.idle-mmo.com/account/api
- Auth check: `GET /v1/auth/check` → returns `{authenticated, user.id, character.{id,hashed_id,name}, api_key}`

### Confirmed Endpoints

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /v1/auth/check` | user id, primary character | |
| `GET /v1/character/{hashed_id}/information` | full character (see below) | |
| `GET /v1/character/{hashed_id}/metrics` | lifetime stats (items gathered, kills, etc.) | |
| `GET /v1/character/{hashed_id}/effects` | active buffs/debuffs | |
| `GET /v1/character/{hashed_id}/characters` | list of alts | call from any alt's hashed_id |
| `GET /v1/character/{hashed_id}/current-action` | `{type, title, expires_at, started_at}` | UNSTABLE per SDK |
| `GET /v1/character/{hashed_id}/pets` | pets list | |
| `GET /v1/character/{hashed_id}/museum` | museum items (paginated) | |
| `GET /v1/combat/world_bosses/list` | bosses with status/timers | |
| `GET /v1/combat/dungeons/list` | dungeon list | |
| `GET /v1/combat/enemies/list` | enemy list with loot | |
| `GET /v1/item/search?query=&type=&page=` | item catalog search | |
| `GET /v1/item/{hashed_id}/inspect` | full item detail, stats, upgrade_requirements | |
| `GET /v1/item/{hashed_id}/market-history?tier=1&type=listings` | daily avg price + volume | |
| `GET /v1/shrine/progress` | shrine tiers and progress | |
| `GET /v1/world/locations/list` | locations with weather forecast | |
| `GET /v1/guild/{id}/information` | guild info | guild id needed, not in char info if no guild |
| `GET /v1/guild/{id}/members` | member list | |
| `GET /v1/guild/conquest/view` | conquest zones | |
| `GET /v1/pets/companion-exchange/listings` | pet market | |

### `/character/{id}/information` response shape
```json
{
  "character": {
    "id": 711238,
    "hashed_id": "oyA279pNzKmGjYKRDEWm",
    "name": "PoteznyKara",
    "class": "WARRIOR",
    "gold": 23939,
    "tokens": 70,
    "shards": 0,
    "total_level": 194,
    "current_status": "ONLINE|IDLING|OFFLINE",
    "location": { "id": 5, "name": "Skyreach Peak" },
    "equipped_pet": { "id": 378323, "name": "Leafy", "level": 2, "image_url": "..." },
    "guild": null,
    "skills": {
      "mining": { "experience": 117603, "level": 48 },
      "woodcutting": { "experience": 8703, "level": 22 }
      // ...all skills here
    },
    "stats": {
      "strength": { "experience": 40312, "level": 37 },
      "defence": { "experience": 2959, "level": 13 },
      "speed": { "experience": 575, "level": 4 },
      "dexterity": { "experience": 1175, "level": 7 }
    },
    "created_at": "2026-05-09T04:44:08+00:00"
  }
}
```

### Known API Gaps (NOT available)
- **No inventory endpoint** — can't see bag contents via API
- **No equipment endpoint** — can't see what items character is wearing
- **No bank endpoint** — can't see bank contents
- **No market listing feed** — market only per specific item (history), no global feed
- **No HP** — hp_current/hp_max not in any endpoint
- **No XP-to-next** — only accumulated XP; compute rate via snapshot deltas
- **Inventory/drop tracking** — impossible via API alone

### Real account data
- Primary char: **PoteznyKara** (WARRIOR), hashed: `oyA279pNzKmGjYKRDEWm`
- Alt: **PanKara** (RANGER, total_level 371), hashed: `7Do6jgkY0AR6jL8BAdKX`
- User ID: 561888

---
## Tech Stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) | RSC for data fetching from SQLite |
| Styling | Tailwind CSS + shadcn/ui primitives | Custom theme tokens (see Design System) |
| Charts | Recharts | Sparklines, area charts |
| Icons | lucide-react | |
| Fonts | Cinzel + Fraunces + JetBrains Mono | Google Fonts |
| DB (local) | SQLite via Drizzle ORM + better-sqlite3 | Zero setup, instant start |
| DB (prod) | Turso | SQLite-compatible, drop-in swap |
| Polling (local) | `tsx watch scripts/poll.ts` | Simple Node script, no cron needed locally |
| Polling (prod) | Vercel Cron | 1 min min on hobby tier |
| AI | Anthropic API, Claude Sonnet (current) | Brief generation |
| Hosting (prod) | Vercel | |

---
## Data Model (SQLite / Drizzle)

Single user — no auth, no RLS. Schema reflects what API actually provides.

```typescript
// characters — roster of alts
characters: {
  hashed_id: text primaryKey,        // IdleMMO hashed_id
  numeric_id: integer,
  name: text,
  class: text,                        // WARRIOR, RANGER, etc.
  is_primary: integer default 0,
  created_at: text
}

// character_snapshots — taken every ~1 min
character_snapshots: {
  id: integer primaryKey autoIncrement,
  hashed_id: text references characters,
  taken_at: text,                     // ISO timestamp
  total_level: integer,
  gold: integer,
  tokens: integer,
  shards: integer,
  current_status: text,
  location_name: text,
  raw: text                           // full JSON for forensics
}

// skill_snapshots — bundled with character poll (skills are in /information)
skill_snapshots: {
  id: integer primaryKey autoIncrement,
  hashed_id: text references characters,
  taken_at: text,
  skill_name: text,
  level: integer,
  experience: integer                 // accumulated, compute delta for rate
}

// stat_snapshots — strength/defence/speed/dexterity
stat_snapshots: {
  id: integer primaryKey autoIncrement,
  hashed_id: text references characters,
  taken_at: text,
  stat_name: text,
  level: integer,
  experience: integer
}

// action_log — derived from current-action snapshots
action_log: {
  id: integer primaryKey autoIncrement,
  hashed_id: text references characters,
  action_type: text,                  // MINING, HUNTING, etc.
  action_title: text,                 // e.g., "Mercury Ore"
  started_at: text,
  expires_at: text,
  detected_at: text
}

// market_snapshots — per item, fetched when in watchlist
market_snapshots: {
  id: integer primaryKey autoIncrement,
  item_hashed_id: text,
  taken_at: text,
  average_price: integer,
  total_sold: integer,
  tier: integer default 1
}

// items_catalog — built from item/search + inspect
items_catalog: {
  hashed_id: text primaryKey,
  name: text,
  type: text,                         // SWORD, CHESTPLATE, BOOTS, etc.
  quality: text,
  vendor_price: integer,
  is_tradeable: integer,
  stats: text,                        -- JSON
  requirements: text,                 -- JSON
  upgrade_requirements: text,         -- JSON
  updated_at: text
}

// goals — user-defined targets
goals: {
  id: text primaryKey,               -- UUID
  hashed_id: text references characters,
  name: text,
  metric: text,                       -- skill_level | gold | total_level | etc.
  metric_args: text,                  -- JSON e.g. {skill: "mining"}
  target: real,
  deadline: text,
  created_at: text,
  completed_at: text
}

// ai_briefs
ai_briefs: {
  id: integer primaryKey autoIncrement,
  hashed_id: text references characters,
  generated_at: text,
  scope: text,                        -- daily | on_demand
  summary: text,
  actions: text,                      -- JSON [{label, tag}]
  context_used: text                  -- JSON
}
```

### What's dropped vs original plan
- `equipment_snapshots` — no API endpoint, removed
- `inventory_snapshots` — no API endpoint, removed
- `hunting_sessions.drops` — inventory diff impossible, track action_log instead
- `hp_current/hp_max` — not in API

### Retention (implement as daily cron later)
- `character_snapshots`, `skill_snapshots`, `stat_snapshots`: full res 7 days → daily aggregate forever
- `market_snapshots`: full res 7 days → daily forever
- `action_log`, `ai_briefs`, `goals`, `items_catalog`: forever

---
## Architecture

```
Local dev:
  tsx watch scripts/poll.ts   →   IdleMMO API   →   SQLite (./valaron.db)
                                                          ↓
                                                   Next.js App (localhost:3000)
                                                          ↓
                                                   Anthropic API (on demand)

Prod:
  Vercel Cron /api/poll  →  IdleMMO API  →  Turso DB
                                                  ↓
                                            Vercel Edge / Next.js App
```

### Polling budget (20 req/min, 2 characters)

Per tick (~1 min):
- Per character: `/information` (skills+stats+gold) + `/current-action` = 2 req
- 2 chars: 4 req/min baseline
- `/characters` (alt list): every 10 min = 0.1 req/min
- World bosses: every 5 min = 0.2 req/min
- Market watchlist: every 5 min, up to 8 items = 1.6 req/min
- Shrine: every 15 min = 0.07 req/min

**Total: ~6 req/min** — massive headroom vs the 20 limit.

---
## Feature Modules (revised to match real API)

| Module | Priority | Phase | API source |
|---|---|---|---|
| Top HUD (char name, class, location, status, gold) | P0 | 1 | `/information` |
| Current action widget (type, title, countdown) | P0 | 1 | `/current-action` |
| XP/Gold sparklines (rate over time) | P0 | 1 | snapshot delta |
| Skill matrix (all skills, level, xp%) | P0 | 1 | `/information`.skills |
| Stats panel (strength/def/speed/dex) | P0 | 1 | `/information`.stats |
| Character switcher (alts) | P0 | 1 | `/characters` |
| Effects/buffs panel | P1 | 2 | `/effects` |
| World boss radar (status + timers) | P1 | 2 | `/combat/world_bosses/list` |
| AI brief panel | P1 | 3 | Anthropic + snapshot history |
| Item catalog + BiS search | P1 | 3 | `/item/search` + `/item/{id}/inspect` |
| Market intel (watchlist, history chart) | P2 | 3 | `/item/{id}/market-history` |
| Shrine progress | P2 | 3 | `/shrine/progress` |
| Action log (what were we doing when) | P2 | 4 | action_log table |
| Goal tracker | P2 | 4 | goals table |

**Dropped from original plan (no API support):**
- Drop ledger (no inventory API)
- Equipment current state panel (no equipment API)
- Daily reward / daily quest widget (no endpoint)
- Inventory snapshot

---
## Development Phases

### Phase 1: Foundation (weekend 1)
```bash
npx create-next-app@latest valaron --typescript --tailwind --app
cd valaron
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3 tsx
```

- `.env.local`: `IDLEMMO_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`
- `lib/db.ts`: Drizzle + better-sqlite3 setup, schema migrations
- `lib/idlemmo.ts`: typed fetch wrapper, rate limit counter, retry on 429
- `scripts/poll.ts`: pulls all characters + snapshots, writes to DB
- Top HUD + skill matrix + current action widget (real data)
- Run poller manually: `npx tsx scripts/poll.ts`

**Done when:** `localhost:3000` shows live data for PoteznyKara that updates on poller run.

### Phase 2: Alts + charts (weekend 2)
- Character switcher (reads from `characters` table, state via URL param)
- XP rate sparklines (delta between last N snapshots)
- Gold rate sparkline
- Stats panel (strength/defence/speed/dex)
- Effects/buffs panel
- World boss radar with countdown timers

**Done when:** can switch between PoteznyKara and PanKara, sparklines show trends.

### Phase 3: AI + market + items (weekend 3)
- Item catalog builder: `scripts/build-catalog.ts` — paginated item search → seed `items_catalog`
- BiS panel: filter `items_catalog` by slot, compare to current char level/stats requirements
- Market watchlist: config in `.env.local` (list of item hashed_ids), poll every 5 min
- Market intel panel: price history chart per item
- AI brief: `/api/brief` endpoint → Claude Sonnet with last 24h context
- Brief panel with refresh button

**Done when:** market charts live, AI brief generates on demand.

### Phase 4: Goals + polish (weekend 4)
- Action log panel (what was being done + duration history)
- Goal tracker: CRUD UI, ETA math from XP rate
- Shrine progress widget
- Loading skeletons, error states
- Retention downsampling (daily aggregate script)

### Phase 5: Deploy (when ready)
- Swap `better-sqlite3` → Turso (`@libsql/client`)
- Add `vercel.json` with cron: `{"crons": [{"path": "/api/poll", "schedule": "* * * * *"}]}`
- Secure `/api/poll` with `CRON_SECRET` header check
- Deploy: `vercel deploy`

---
## Design System

### Color tokens
```css
--bg-page: #1c1712;
--bg-panel: #2a241d;
--bg-panel-hover: #332c22;
--bg-inner: #3d3429;
--border-subtle: #4a4030;
--border-accent: #c89540;
--text-primary: #f7ead0;
--text-body: #ebdcb8;
--text-secondary: #d8c8a4;
--text-dim: #bfae87;
--text-muted: #a89972;
--gold: #f0c14a;
--gold-bright: #ffd766;
--green: #8fcc8f;
--red: #e36868;
--blue: #82b3ee;
--purple: #c896ee;
--q-common: #b5a99a;
--q-uncommon: #8fcc8f;
--q-rare: #82b3ee;
--q-epic: #c896ee;
--q-legendary: #f0c14a;
```

### Typography
- **Cinzel** (display): section headers, character name, item names
- **Fraunces** (body): AI brief, narrative text
- **JetBrains Mono** (data): all numbers, stats, timestamps, percentages

### Component primitives
- `<Panel title icon accent badge>` — bordered card with corner accents
- `<QualityBadge q name stats>` — item with quality-colored treatment
- `<Delta v>` — percentage with trend arrow, green/red
- `<PriorityDot p>` — high/mid/low/core
- `<MiniSparkline data />` — inline 1-line chart

---
## How to Use This Plan in a New Chat
1. New chat in desktop Claude
2. Attach: this file + `idle-mmo-dashboard.jsx` mockup
3. State current phase, e.g. "Phase 1, zacznijmy od setup projektu"
4. Iterate
