/**
 * One-time history import.
 *
 * Run with:  npx tsx scripts/import-history.ts
 *
 * Uses the same env vars as the worker. Sweeps the full channel history
 * in batches of 100, inserting records with INSERT OR IGNORE to skip dupes.
 */

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram";
import bigInt from "big-integer";
import input from "input";
import { upsertAlert } from "../lib/queries";
import { parseMessage } from "../lib/classifier";

const API_ID = parseInt(process.env.TG_API_ID ?? "", 10);
const API_HASH = process.env.TG_API_HASH ?? "";
const SESSION_STRING = process.env.TG_SESSION ?? "";
const CHANNEL = process.env.TG_CHANNEL ?? "PikudHaOref_all";
const BATCH = 100;

if (!API_ID || !API_HASH) {
  console.error("TG_API_ID and TG_API_HASH must be set.");
  process.exit(1);
}

async function main() {
  const session = new StringSession(SESSION_STRING);
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => input.text("Phone number: "),
    password: async () => input.text("2FA password (leave blank if none): "),
    phoneCode: async () => input.text("Verification code: "),
    onError: (err) => console.error("Auth error:", err),
  });

  const savedSession = client.session.save() as unknown as string;
  if (savedSession && savedSession !== SESSION_STRING) {
    console.log("\n=== TG_SESSION ===\n" + savedSession + "\n=================\n");
  }

  console.log(`Importing history from @${CHANNEL}…`);

  let offsetId = 0;
  let total = 0;
  let relevant = 0;

  while (true) {
    const result = await client.invoke(
      new Api.messages.GetHistory({
        peer: CHANNEL,
        offsetId,
        limit: BATCH,
        addOffset: 0,
        maxId: 0,
        minId: 0,
        hash: bigInt(0),
      })
    );

    const messages =
      (result as Api.messages.Messages | Api.messages.MessagesSlice).messages;

    if (!messages || messages.length === 0) break;

    for (const msg of messages) {
      if (!(msg instanceof Api.Message) || !msg.message) continue;

      const parsed = parseMessage(msg.message, msg.id, msg.date);
      upsertAlert(
        parsed.tgMsgId,
        parsed.sentAt,
        parsed.rawText,
        parsed.state,
        parsed.area,
        parsed.relevant
      );
      total++;
      if (parsed.relevant) relevant++;
    }

    const lastMsg = messages[messages.length - 1] as Api.Message;
    offsetId = lastMsg.id;

    process.stdout.write(`\r  processed ${total} messages, ${relevant} relevant…`);

    // If we got fewer messages than requested we've reached the beginning
    if (messages.length < BATCH) break;

    // Polite rate-limit pause
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone. Imported ${total} messages total, ${relevant} relevant.`);
  await client.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
