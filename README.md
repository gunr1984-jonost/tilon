# Tilon — Alert Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/gunr1984-jonost/tilon?style=flat)](https://github.com/gunr1984-jonost/tilon/stargazers)
[![Live Site](https://img.shields.io/badge/live-homefront.protocol22.com-blue)](https://homefront.protocol22.com)

Real-time dashboard tracking Israeli Home Front Command (Pikud HaOref) alerts, sourced from the public Telegram channel [@PikudHaOref_all](https://t.me/PikudHaOref_all).

Public URL: **[homefront.protocol22.com](https://homefront.protocol22.com)**

## Disclaimer

This is an independent, unofficial tool built for personal and civic use. Data is sourced from the public [@PikudHaOref_all](https://t.me/PikudHaOref_all) Telegram channel and processed locally. It is not affiliated with or endorsed by the Israeli Home Front Command (Pikud HaOref).

**For real-time life-safety alerts, always use official channels: the [Pikud HaOref app](https://www.oref.org.il), official website, and Home Front Command notifications.** This tool does not guarantee uptime or accuracy during critical events.

## Features

- **Region selector** — dropdown with 11 city views (Ein Hod, Etz Efraim, Givatayim, Mevaseret Zion, Netaim, Ness Ziyona, Ra'anana, Rehovot, Rishon LeZion East/West, Tel Aviv) plus **Nationwide**; all stats, charts, and timeline update accordingly. City filtering uses runtime `raw_text LIKE '%<hebrew>%'` — works on all historical data without schema migration
- **Live status** — current alert state (Active Siren / Pre-Alert / All Clear) with pulsing indicator; shown for city scopes only (hidden in Nationwide view)
- **10s polling** — browser refreshes every 10 seconds; API responses are Cloudflare-edge-cached (`s-maxage=5–30` depending on route) so origin load is constant regardless of concurrent users; HTML shell is served `no-store` so deploys are always picked up immediately
- **Automatic catch-up** — on every restart, syncs all messages since the last known Telegram message ID so no alerts are missed
- **Period picker** — 28/2 (since war began), 1w, 2w, All
- **Bar charts** with auto-scaling granularity (daily / weekly / monthly):
  - *By type* — Pre-alerts (amber) vs Sirens (red), side by side per column
  - *Night sirens* — sirens between 21:00–06:30 only (indigo)
- **Scrollable timeline** — colour-coded event list with night indicators, filterable by All / Sirens / Night sirens; hover any row to see the full message text
- **Stat tiles** — Sirens, Night sirens, Pre-alerts, Nights disrupted, Avg saferoom time (siren → all clear; city scopes only)
- **Threat clock** — 24-hour radial heatmap showing which hours of the day have the most sirens; displays current time at centre
- **Nationwide note** — in Nationwide view, a footnote explains that counts reflect Telegram message clusters (one message may cover multiple regions)

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router, TypeScript |
| Database | SQLite via `better-sqlite3`, WAL mode |
| Telegram | `telegram` (GramJS MTProto client) |
| Real-time | 10s client polling, Cloudflare edge cache |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |

## Project structure

```
app/
  page.tsx                   — dashboard (client component); region dropdown + period picker
  api/
    status/route.ts          — GET current status (?scope=<city>|national); lastSyncAt from meta table
    alerts/route.ts          — GET recent alerts (?days=N&scope=<city>|national)
    stats/route.ts           — GET daily counts + saferoom avg (?days=N&scope=<city>|national)
    hourly-stats/route.ts    — GET hourly siren counts for ThreatClock (?days=N&scope=<city>|national)
    sync/route.ts            — POST manual catch-up trigger (requires WORKER_SECRET header)
    internal/notify/route.ts — POST from worker → SSE broadcast (requires WORKER_SECRET header)

components/
  StatusBadge.tsx            — pulsing status pill (urgent states) or calm indicator (all clear)
  Charts.tsx                 — grouped bar chart with auto-granularity, gap-filled date range
  Timeline.tsx               — scrollable colour-coded event list; hover row shows full message
  ThreatClock.tsx            — radial 24h siren heat map

lib/
  schema.sql                 — alerts + meta table DDL
  db.ts                      — better-sqlite3 singleton, WAL, auto-creates ./data/
  regions.ts                 — shared scope constants (CITY_REGIONS, SCOPE_OPTIONS, etc.); no server imports, safe for client bundles
  queries.ts                 — all DB queries; stat functions accept scope: CityScope | "national"
  classifier.ts              — Hebrew substring → state classification
  emitter.ts                 — EventEmitter for internal notify route
  telegram-service.ts        — Telegram connect, catch-up, live listener; writes last_sync_at to meta table

instrumentation.ts           — Next.js boot hook; starts Telegram service with exponential-backoff restart
worker/telegram.ts           — standalone Telegram worker (optional fallback / auth setup)
scripts/import-history.ts    — one-time full channel history sweep
```

## Deployment

This app runs as a Docker container on a home server (Debian/Linux), exposed publicly via Cloudflare Tunnel — no port forwarding required.

| URL | Notes |
|---|---|
| http://localhost:3001 | LAN access (direct Docker port) |
| https://your-domain | Public access via Cloudflare Tunnel |

The `cloudflared` container runs alongside `homefront` in `compose.yml` (see `compose.yml.example`). The tunnel is managed at Cloudflare Zero Trust → Networks → Tunnels.

To build and redeploy after source changes:

```bash
docker build -t homefront:latest ./src
docker rm -f homefront && docker compose up -d homefront
```

> **Note:** `WAR_START` in `app/page.tsx` is hardcoded to the date the current conflict began. Update it to match your deployment context before building.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

```env
TG_API_ID=<your numeric app ID from my.telegram.org/apps>
TG_API_HASH=<your app hash>
TG_SESSION=<GramJS StringSession — see Authentication below>

# Optional
TG_CHANNEL=PikudHaOref_all   # channel username without @
DB_PATH=./data/alerts.db
WORKER_SECRET=<shared secret for /api/sync and /api/internal/notify>
PORT=3000
```

### 3. Authenticate with Telegram (first run only)

```bash
export $(grep -v '^#' .env | xargs) && npx tsx worker/telegram.ts
```

Follow the prompts (phone number → verification code → 2FA if set). The `TG_SESSION` string will be printed — save it in `.env`. You only need to do this once.

### 4. Import history (optional, one-time)

Sweeps the full channel history into the local database. Safe to re-run (deduplicates by Telegram message ID).

```bash
export $(grep -v '^#' .env | xargs) && npm run import-history
```

### 5. Run

```bash
npm run dev
```

This single command starts both the Next.js dashboard **and** the Telegram listener. On boot it automatically syncs any messages missed since the last known message ID.

Open [http://localhost:3000](http://localhost:3000).

## How it works

### Message ingestion

The Telegram MTProto client connects on Next.js server boot via `instrumentation.ts`. It:
1. Queries the DB for `MAX(tg_msg_id)`
2. Fetches up to 200 messages since that ID (catch-up for any missed alerts)
3. Registers a live `NewMessage` handler, filtered by the resolved numeric channel ID
4. Writes `last_sync_at` to the `meta` table after every successful catch-up and on every live message received

### Sync liveness

`lastSyncAt` is persisted in the `meta` table so it survives restarts and is readable by API routes without cross-module state sharing. The `/api/status` response includes `lastSyncAt` and `warnStaleMs` (5 min) — an external watchdog script can poll this endpoint to detect Telegram service failures independently of container health.

### State classification

Hebrew substring matching in `lib/classifier.ts` (order matters — first match wins):

| Trigger phrase | State | Notes |
|---|---|---|
| `האירוע הסתיים` | `ALL_CLEAR` | "event ended" |
| `ניתן לצאת מהמרחב המוגן` | `ALL_CLEAR` | "you may leave the shelter" |
| `סיום שהייה בסמיכות למרחב המוגן` | `ALL_CLEAR` | end of stay-near-shelter order |
| `בדקות הקרובות צפויות להתקבל התרעות` | `PRE_ALERT` | covers both singular and plural phrasings |
| `שהייה בסמיכות למרחב מוגן` | `PRE_ALERT` | stay-near-shelter readiness order |
| `יש לשהות בסמיכות למרחב המוגן` | `PRE_ALERT` | alternate stay-near-shelter phrasing |
| `עדכון - התרעות` | `ACTIVE_SIREN` | pre-2022 Telegram message format |
| `ירי רקטות וטילים` | `ACTIVE_SIREN` | current format |
| *(no match)* | `OTHER` | drones, security situations, informational |

A message is marked `relevant = 1` only if it contains `תל אביב - מרכז העיר` (Tel Aviv city center).

### Scope system

All API routes accept `?scope=<value>` (default: `tel-aviv`). Valid values:

| Scope | Filter | Hebrew match |
|---|---|---|
| `ein-hod` | `raw_text LIKE '%עין הוד%'` | Ein Hod |
| `etz-efraim` | `raw_text LIKE '%עץ אפרים%'` | Etz Efraim |
| `givatayim` | `raw_text LIKE '%גבעתיים%'` | Givatayim |
| `mevaseret-zion` | `raw_text LIKE '%מבשרת ציון%'` | Mevaseret Zion |
| `netaim` | `raw_text LIKE '%נטעים%'` | Netaim |
| `ness-ziyona` | `raw_text LIKE '%נס ציונה%'` | Ness Ziyona |
| `raanana` | `raw_text LIKE '%רעננה%'` | Ra'anana |
| `rehovot` | `raw_text LIKE '%רחובות%'` | Rehovot |
| `rishon-lezion-east` | `raw_text LIKE '%ראשון לציון - מזרח%'` | Rishon LeZion East |
| `rishon-lezion-west` | `raw_text LIKE '%ראשון לציון - מערב%'` | Rishon LeZion West |
| `tel-aviv` | `raw_text LIKE '%תל אביב%'` | Tel Aviv |
| `national` | `state != 'OTHER'` | All areas |

City filtering is applied at query time against `raw_text` — no schema migration needed, works on all historical data. City scopes also filter `state != 'OTHER'` on top of the LIKE filter.

Scope differences in the UI:
- Status badge and Avg saferoom tile are shown for city scopes only (hidden in Nationwide)
- A footnote explains Telegram message clustering in Nationwide view
- Unknown `?scope=` values fall back silently to `tel-aviv`

### Live updates

The browser polls `/api/status`, `/api/stats`, and `/api/alerts` every 10 seconds. API routes return `Cache-Control: public, max-age=0, s-maxage=N` (no `stale-while-revalidate`) so Cloudflare serves most requests from its edge cache without ever serving intentionally stale content — the origin receives at most one request per cache window per PoP regardless of how many users are watching. The HTML shell (`/`) is served with `Cache-Control: no-store` so browsers and Cloudflare never cache it — deploys are picked up immediately without a hard refresh. On tab focus or period change, a fresh fetch fires immediately (previous in-flight request is cancelled via `AbortController`).

Cache TTLs by route:
- `/api/status` — `s-maxage=5` (most time-sensitive; drives status badge)
- `/api/alerts`, `/api/stats` — `s-maxage=10`
- `/api/hourly-stats` — `s-maxage=30`

### Chart granularity

The bar chart auto-selects granularity based on the selected period, and always fills in the full date range (zero-value bars for quiet days):

| Period | Granularity |
|---|---|
| 28/2, 1w, 2w | Daily |
| All | Yearly |

### Night definition

21:00–06:30 local time, applied in both SQLite queries and the client-side timeline filter.

## Security

- `/api/sync` and `/api/internal/notify` require `x-worker-secret` header matching `WORKER_SECRET` env var
- Security headers set on all responses via `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- Cloudflare rate limiting: 20 req/10s per IP on `/api/*` paths
- `cloudflared` image pinned to a specific digest in `compose.yml` to prevent unexpected updates

## Database schema

```sql
CREATE TABLE IF NOT EXISTS alerts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_msg_id INTEGER UNIQUE NOT NULL,  -- dedup key
  sent_at   INTEGER NOT NULL,         -- Unix timestamp (seconds)
  raw_text  TEXT    NOT NULL,
  state     TEXT    NOT NULL CHECK (state IN ('PRE_ALERT','ACTIVE_SIREN','ALL_CLEAR','OTHER')),
  area      TEXT    NOT NULL DEFAULT '',
  relevant  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- meta keys in use: last_sync_at (ISO 8601, written by telegram-service on every sync)
```
