import { getDb, AlertRow, AlertState } from "./db";
import { CITY_REGIONS, type CityScope, type Scope } from "./regions";

export type { Scope, CityScope };
export { CITY_REGIONS };

const VALID_STATES = new Set<AlertState>(["PRE_ALERT", "ACTIVE_SIREN", "ALL_CLEAR", "OTHER"]);

const VALID_SCOPES = new Set<Scope>([
  "national",
  ...Object.keys(CITY_REGIONS) as CityScope[],
]);

/** Parses and validates a ?scope= query param. Falls back to "tel-aviv". */
export function parseScope(param: string | null): Scope {
  if (param && VALID_SCOPES.has(param as Scope)) return param as Scope;
  return "tel-aviv";
}

/**
 * Returns a SQL fragment for the given scope, for use at the start of a WHERE condition.
 * National:  `"state != 'OTHER' AND "`
 * City:      `"raw_text LIKE '%<hebrew>%' AND state != 'OTHER' AND "`
 */
function andScope(scope: Scope, alias?: string): string {
  if (scope === "national") return "state != 'OTHER' AND ";
  const hebrew = CITY_REGIONS[scope as CityScope];
  const textCol = alias ? `${alias}.raw_text` : "raw_text";
  return `${textCol} LIKE '%${hebrew}%' AND state != 'OTHER' AND `;
}

// ---------- meta helpers ----------

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function upsertAlert(
  tgMsgId: number,
  sentAt: number,
  rawText: string,
  state: AlertState,
  area: string,
  relevant: boolean
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO alerts (tg_msg_id, sent_at, raw_text, state, area, relevant)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(tgMsgId, sentAt, rawText, state, area, relevant ? 1 : 0);
}

export interface AlertInsert {
  tgMsgId: number; sentAt: number; rawText: string;
  state: AlertState; area: string; relevant: boolean;
}

/** Inserts a batch of alerts in a single transaction. Safe to re-run (INSERT OR IGNORE). */
export function batchUpsertAlerts(alerts: AlertInsert[]): void {
  if (alerts.length === 0) return;
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO alerts (tg_msg_id, sent_at, raw_text, state, area, relevant)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const run = db.transaction(() => {
    for (const a of alerts) {
      if (!VALID_STATES.has(a.state)) {
        console.error(`[db] Invalid state "${a.state}" for msg ${a.tgMsgId} — skipping insert`);
        continue;
      }
      stmt.run(a.tgMsgId, a.sentAt, a.rawText, a.state, a.area, a.relevant ? 1 : 0);
    }
  });
  run();
}

export interface MsgIdGap { lo: number; hi: number; gap: number; }

/**
 * Finds the largest gaps in stored tg_msg_id sequence.
 * Natural gaps exist (skipped media, deleted msgs) so we only flag gaps > threshold.
 */
export function findMsgIdGaps(threshold = 500, limit = 5): MsgIdGap[] {
  return getDb()
    .prepare(
      `WITH ranked AS (
         SELECT tg_msg_id,
                LAG(tg_msg_id) OVER (ORDER BY tg_msg_id) AS prev_id
         FROM alerts
       )
       SELECT prev_id AS lo, tg_msg_id AS hi, (tg_msg_id - prev_id) AS gap
       FROM ranked
       WHERE gap > ?
       ORDER BY gap DESC
       LIMIT ?`
    )
    .all(threshold, limit) as MsgIdGap[];
}

export function getMaxMsgId(): number {
  const row = getDb()
    .prepare(`SELECT MAX(tg_msg_id) AS max_id FROM alerts`)
    .get() as { max_id: number | null };
  return row?.max_id ?? 0;
}

// days = 0 means all time
export function getLatestRelevant(limit = 50, days = 0, scope: Scope = "tel-aviv"): AlertRow[] {
  const whereClause =
    days > 0
      ? `WHERE ${andScope(scope)}sent_at >= strftime('%s', 'now', '-${days} days')`
      : `WHERE ${andScope(scope)}state != 'OTHER'`;
  return getDb()
    .prepare(`SELECT * FROM alerts ${whereClause} ORDER BY sent_at DESC LIMIT ?`)
    .all(limit) as AlertRow[];
}

/** Returns the most recent non-OTHER alert state for the given scope */
export function getCurrentStatus(scope: Scope = "tel-aviv"): AlertState {
  const row = getDb()
    .prepare(
      `SELECT state FROM alerts
       WHERE ${andScope(scope)}state != 'OTHER'
       ORDER BY sent_at DESC LIMIT 1`
    )
    .get() as { state: AlertState } | undefined;
  return row?.state ?? "ALL_CLEAR";
}

export interface DailyStat {
  date: string;         // YYYY-MM-DD
  total: number;
  sirens: number;
  pre_alerts: number;
  night_sirens: number;
  night_pre_alerts: number;
}

// Night = local time >= 21:00 OR < 06:30
const NIGHT_EXPR = `(
  strftime('%H%M', sent_at, 'unixepoch', 'localtime') >= '2100'
  OR strftime('%H%M', sent_at, 'unixepoch', 'localtime') < '0630'
)`;

// days = 0 means all time
export function getDailyStats(days = 30, scope: Scope = "tel-aviv"): DailyStat[] {
  // Snap to start of day and offset by (days-1) so we get exactly `days`
  // calendar bars including today — avoids a partial day at the start
  // (e.g. days=7 → midnight 6 days ago → 7 full date bars, not 8)
  const whereClause =
    days > 0
      ? `WHERE ${andScope(scope)}sent_at >= strftime('%s', 'now', 'start of day', '-${days - 1} days')`
      : `WHERE ${andScope(scope)}state != 'OTHER'`;

  return getDb()
    .prepare(
      `SELECT
         date(sent_at, 'unixepoch', 'localtime') AS date,
         COUNT(*)                                AS total,
         SUM(CASE WHEN state = 'ACTIVE_SIREN' THEN 1 ELSE 0 END) AS sirens,
         SUM(CASE WHEN state = 'PRE_ALERT'    THEN 1 ELSE 0 END) AS pre_alerts,
         SUM(CASE WHEN state = 'ACTIVE_SIREN' AND ${NIGHT_EXPR} THEN 1 ELSE 0 END) AS night_sirens,
         SUM(CASE WHEN state = 'PRE_ALERT'    AND ${NIGHT_EXPR} THEN 1 ELSE 0 END) AS night_pre_alerts
       FROM alerts
       ${whereClause}
       GROUP BY date
       ORDER BY date ASC`
    )
    .all() as DailyStat[];
}

export interface NightlyStat {
  night_date: string;   // YYYY-MM-DD of the evening the night started
  night_sirens: number;
}

/**
 * Groups night sirens by the evening they belong to:
 * - sirens >= 21:00 → that calendar date
 * - sirens < 06:30  → previous calendar date (still the same night)
 */
export function getNightlyStats(days = 30, scope: Scope = "tel-aviv"): NightlyStat[] {
  const whereClause =
    days > 0
      ? `WHERE ${andScope(scope)}state = 'ACTIVE_SIREN'
         AND sent_at >= strftime('%s', 'now', 'start of day', '-${days} days')
         AND (strftime('%H%M', sent_at, 'unixepoch', 'localtime') >= '2100'
           OR strftime('%H%M', sent_at, 'unixepoch', 'localtime') < '0630')`
      : `WHERE ${andScope(scope)}state = 'ACTIVE_SIREN'
         AND (strftime('%H%M', sent_at, 'unixepoch', 'localtime') >= '2100'
           OR strftime('%H%M', sent_at, 'unixepoch', 'localtime') < '0630')`;

  return getDb()
    .prepare(
      `SELECT
         CASE
           WHEN strftime('%H%M', sent_at, 'unixepoch', 'localtime') >= '2100'
             THEN date(sent_at, 'unixepoch', 'localtime')
           ELSE date(sent_at, 'unixepoch', 'localtime', '-1 day')
         END AS night_date,
         COUNT(*) AS night_sirens
       FROM alerts
       ${whereClause}
       GROUP BY night_date
       ORDER BY night_date ASC`
    )
    .all() as NightlyStat[];
}

/**
 * Average saferoom duration: for each ALL_CLEAR, find the FIRST ACTIVE_SIREN
 * in the same event sequence (after the previous ALL_CLEAR) and compute the gap.
 * Multiple sirens or pre-alerts in one sequence don't reset the clock — the
 * saferoom time starts when the first siren is received. Only completed sequences
 * (those with a following ALL_CLEAR within 30 min) are included.
 */
export function getAvgSaferoomSecs(days = 0, scope: Scope = "tel-aviv"): number | null {
  // Nationwide pairing (any ALL_CLEAR ↔ any ACTIVE_SIREN across all areas) is
  // not meaningful, so we return null and let the UI show "—".
  if (scope === "national") return null;

  const hebrew = CITY_REGIONS[scope as CityScope];
  const dayFilter = days > 0
    ? `AND sent_at >= strftime('%s', 'now', '-${days} days')`
    : "";

  // CTE approach: scan the table with LIKE exactly ONCE, then use window
  // functions to group consecutive events into siren→all-clear sequences.
  // Avoids the O(n²) correlated subquery of the naïve approach.
  const row = getDb()
    .prepare(
      `WITH city_events AS (
         SELECT sent_at, state
         FROM alerts
         WHERE raw_text LIKE '%${hebrew}%'
           AND state IN ('ACTIVE_SIREN', 'ALL_CLEAR')
           ${dayFilter}
       ),
       blocks AS (
         SELECT sent_at, state,
           COALESCE(
             SUM(CASE WHEN state = 'ALL_CLEAR' THEN 1 ELSE 0 END)
               OVER (ORDER BY sent_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
             0
           ) AS block_id
         FROM city_events
       ),
       block_stats AS (
         SELECT block_id,
           MIN(CASE WHEN state = 'ACTIVE_SIREN' THEN sent_at END) AS first_siren,
           MAX(CASE WHEN state = 'ALL_CLEAR'    THEN sent_at END) AS clear_at
         FROM blocks
         GROUP BY block_id
         HAVING first_siren IS NOT NULL AND clear_at IS NOT NULL
       )
       SELECT AVG(clear_at - first_siren) AS avg_secs
       FROM block_stats
       WHERE (clear_at - first_siren) <= 1800`
    )
    .get() as { avg_secs: number | null };
  return row?.avg_secs ?? null;
}

// days = 0 means all time
export function getTotalCount(days = 0, scope: Scope = "tel-aviv"): number {
  const whereClause =
    days > 0
      ? `WHERE ${andScope(scope)}sent_at >= strftime('%s', 'now', '-${days} days')`
      : `WHERE ${andScope(scope)}state != 'OTHER'`;
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM alerts ${whereClause}`)
    .get() as { n: number };
  return row.n;
}

export interface HourlyCount { hour: number; count: number; }

export function getHourlyStats(days = 0, scope: Scope = "tel-aviv"): HourlyCount[] {
  const whereClause =
    days > 0
      ? `WHERE ${andScope(scope)}state = 'ACTIVE_SIREN'
         AND sent_at >= strftime('%s', 'now', 'start of day', '-${days - 1} days')`
      : `WHERE ${andScope(scope)}state = 'ACTIVE_SIREN'`;

  const rows = getDb()
    .prepare(
      `SELECT
         CAST(strftime('%H', datetime(sent_at, 'unixepoch', 'localtime')) AS INTEGER) AS hour,
         COUNT(*) AS count
       FROM alerts
       ${whereClause}
       GROUP BY hour
       ORDER BY hour`
    )
    .all() as HourlyCount[];

  const map = new Map<number, number>(rows.map(r => [r.hour, r.count]));
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map.get(h) ?? 0 }));
}
