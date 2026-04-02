/**
 * Telegram service — connects, catches up on missed messages, then listens live.
 * Called from instrumentation.ts on Next.js server boot.
 */

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { batchUpsertAlerts, setMeta, type AlertInsert } from "./queries";
import { parseMessage } from "./classifier";
import { getDb } from "./db";
import emitter from "./emitter";
import { invalidateCache } from "./cache";

const CHANNEL           = process.env.TG_CHANNEL ?? "PikudHaOref_all";
const CATCH_UP_BATCH    = 200;
const HEARTBEAT_MS      = 30_000;       // how often we check
const STALE_MS          = 2 * 60_000;   // how long since last sync before heartbeat acts
const WARN_STALE_MS     = 5 * 60_000;   // expose via getLastSyncAt for UI warning
const FETCH_TIMEOUT_MS  = 30_000;       // max time to wait for a single getMessages call

/** Races a promise against a hard timeout, so callers never hang indefinitely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withTimeout(promise: Promise<any>, ms: number): Promise<any> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`FETCH_TIMEOUT: getMessages timed out after ${ms}ms`)), ms)
    ),
  ]);
}

let lastSyncAt: Date | null = null;
let activeClient: TelegramClient | null = null;
let catchUpInProgress = false;
export function getLastSyncAt(): Date | null { return lastSyncAt; }
export function getWarnStaleMs(): number { return WARN_STALE_MS; }

export async function triggerCatchUp(): Promise<void> {
  if (!activeClient) throw new Error("Telegram service not running");
  await catchUp(activeClient);
}

function getClient() {
  const apiId = parseInt(process.env.TG_API_ID ?? "", 10);
  const apiHash = process.env.TG_API_HASH ?? "";
  const session = process.env.TG_SESSION ?? "";

  if (!apiId || !apiHash || !session) {
    throw new Error("TG_API_ID, TG_API_HASH and TG_SESSION must all be set.");
  }

  return new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 10,
  });
}

function getMaxTgMsgId(): number {
  const row = getDb()
    .prepare("SELECT MAX(tg_msg_id) AS m FROM alerts")
    .get() as { m: number | null };
  return row.m ?? 0;
}

function extractFloodWaitSecs(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/flood.{0,20}?(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function toParsed(text: string, tgMsgId: number, sentAt: number) {
  return parseMessage(text, tgMsgId, sentAt);
}

async function catchUp(client: TelegramClient) {
  if (catchUpInProgress) return;
  catchUpInProgress = true;
  try {
    await _catchUp(client);
  } finally {
    catchUpInProgress = false;
  }
}

async function _catchUp(client: TelegramClient) {
  // Ensure connection is alive — no-op if already connected, reconnects after sleep
  await client.connect();

  const minId = getMaxTgMsgId();
  console.log(`[tg] Catching up from msg id ${minId}…`);

  let added = 0;
  let relevantAdded = 0;
  let offsetId = 0; // 0 = start from newest

  while (true) {
    let messages;
    try {
      messages = await withTimeout(
        client.getMessages(CHANNEL, {
          limit: CATCH_UP_BATCH,
          ...(offsetId > 0 ? { offsetId } : {}),
          ...(minId > 0 ? { minId } : {}),
        }),
        FETCH_TIMEOUT_MS
      );
    } catch (err) {
      const waitSecs = extractFloodWaitSecs(err);
      if (waitSecs > 0) {
        console.warn(`[tg] Flood wait ${waitSecs}s — pausing before retry…`);
        await new Promise(r => setTimeout(r, (waitSecs + 1) * 1000));
        continue; // retry same batch
      }
      throw err;
    }

    if (messages.length === 0) break;

    // Parse all messages in this batch then write in one transaction
    const batch: AlertInsert[] = [];
    for (const msg of messages) {
      if (!msg.text) continue;
      const parsed = toParsed(msg.text, msg.id, msg.date);
      batch.push(parsed);
      if (parsed.relevant) {
        relevantAdded++;
        console.log(`[tg] catchup ${new Date(msg.date * 1000).toISOString()} ${parsed.state} ★ — ${msg.text.slice(0, 80)}`);
      }
    }
    batchUpsertAlerts(batch);
    added += batch.length;

    if (messages.length < CATCH_UP_BATCH) break;
    offsetId = messages[messages.length - 1].id;
  }

  if (added > 0) invalidateCache();
  console.log(`[tg] Caught up: ${added} new message(s), ${relevantAdded} relevant.`);
  lastSyncAt = new Date();
  setMeta("last_sync_at", lastSyncAt.toISOString());

  if (relevantAdded > 0) emitter.emit("alert", { type: "catchup" });
}

async function listenLive(client: TelegramClient, channelId: string) {
  console.log(`[tg] Live listener active for channel id ${channelId}`);

  client.addEventHandler(async (event: NewMessageEvent) => {
    const msg = event.message;
    if (!msg?.text) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatId: string | undefined = (msg.peerId as any)?.channelId?.toString();
    if (chatId !== channelId) return;

    const parsed = toParsed(msg.text, msg.id, msg.date);
    batchUpsertAlerts([parsed]);
    invalidateCache();
    lastSyncAt = new Date();
    setMeta("last_sync_at", lastSyncAt.toISOString());

    console.log(
      `[tg] ${new Date(msg.date * 1000).toISOString()} ${parsed.state}${parsed.relevant ? " ★" : ""} — ${msg.text.slice(0, 80)}`
    );

    if (parsed.relevant) {
      emitter.emit("alert", parsed);
    }
  }, new NewMessage({}));
}

export async function startTelegramService() {
  const client = getClient();

  await client.connect();
  activeClient = client;
  console.log("[tg] Connected.");

  const shutdown = async () => {
    console.log("[tg] Disconnecting…");
    await client.disconnect();
    process.exit(0);
  };
  process.once("SIGINT",  shutdown);
  process.once("SIGTERM", shutdown);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entity = await client.getEntity(CHANNEL);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelId: string = (entity as any).id.toString();

  await catchUp(client);
  await listenLive(client, channelId);

  // Heartbeat: fires every 30s. If the last sync is stale (computer was
  // asleep or connection silently dropped), reconnect and catch up immediately.
  // setInterval is paused during sleep, so on wake the first tick detects
  // staleness within ≤30s and triggers a catch-up.
  // On repeated failures, exponential backoff (30s→60s→120s→240s→300s cap)
  // prevents hammering Telegram during congestion. After 3 consecutive failures
  // the MTProto client is fully disconnected and reconnected before retrying.
  let consecutiveFailures = 0;
  let nextRetryAt = 0;
  setInterval(async () => {
    const stale = !lastSyncAt || (Date.now() - lastSyncAt.getTime()) > STALE_MS;
    if (!stale) { consecutiveFailures = 0; nextRetryAt = 0; return; }
    if (Date.now() < nextRetryAt) return; // backoff still active

    console.log("[tg] Stale sync detected — catching up…");
    try {
      if (consecutiveFailures >= 3) {
        console.warn("[tg] Forcing client reconnect after repeated failures…");
        try { await client.disconnect(); } catch {}
        await client.connect();
      }
      await catchUp(client);
      consecutiveFailures = 0;
      nextRetryAt = 0;
    } catch (err) {
      consecutiveFailures++;
      const backoffSecs = Math.min(30 * Math.pow(2, consecutiveFailures - 1), 300);
      nextRetryAt = Date.now() + backoffSecs * 1000;
      console.error(`[tg] Catch-up failed (${consecutiveFailures}x), backing off ${backoffSecs}s: ${(err as Error).message}`);
    }
  }, HEARTBEAT_MS);

  // Keep the promise alive so startWithRetry doesn't treat a clean return as a crash
  await new Promise(() => {});
}
