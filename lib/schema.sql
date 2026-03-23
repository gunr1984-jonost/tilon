CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_msg_id   INTEGER UNIQUE NOT NULL,      -- Telegram message ID (dedup key)
  sent_at     INTEGER NOT NULL,             -- Unix timestamp (seconds)
  raw_text    TEXT    NOT NULL,
  state       TEXT    NOT NULL CHECK (state IN ('PRE_ALERT','ACTIVE_SIREN','ALL_CLEAR','OTHER')),
  area        TEXT    NOT NULL DEFAULT '',  -- matched area name, empty if no match
  relevant    INTEGER NOT NULL DEFAULT 0   -- 1 if area matched our target
);

CREATE INDEX IF NOT EXISTS idx_alerts_sent_at   ON alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_relevant  ON alerts(relevant, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_state     ON alerts(state, relevant, sent_at DESC);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
