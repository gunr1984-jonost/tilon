export async function register() {
  // Only run in the Node.js runtime (not edge), and only when Telegram creds are present
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.TG_API_ID || !process.env.TG_SESSION) {
    console.warn("[tg] Skipping Telegram service — TG_API_ID / TG_SESSION not set.");
    return;
  }

  const { startTelegramService } = await import("./lib/telegram-service");

  // Auto-restart with exponential backoff — service must never die silently
  async function startWithRetry() {
    let delay = 5_000;
    while (true) {
      try {
        await startTelegramService();
        // startTelegramService runs indefinitely; reaching here means it returned unexpectedly
        console.warn("[tg] Service exited unexpectedly, restarting…");
      } catch (err) {
        console.error(`[tg] Service crashed: ${(err as Error).message}. Retrying in ${delay / 1000}s…`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30_000); // cap at 30s — fast recovery during active situations
    }
  }

  startWithRetry();
}
