import type { AlertState } from "./db";

/** Target area — messages must mention this string to be "relevant" */
export const TARGET_AREA = "תל אביב - מרכז העיר";

/**
 * State classification — ordered from most-specific to least-specific.
 * Each entry is [trigger substring, resulting state].
 *
 * ORDER MATTERS:
 * - ALL_CLEAR must come before ACTIVE_SIREN: some messages contain both
 *   "ירי רקטות וטילים" and "האירוע הסתיים" (e.g. "ירי רקטות וטילים - האירוע הסתיים").
 *   These are clearance messages and must match ALL_CLEAR first.
 * - Shelter-proximity clearance ("סיום שהייה בסמיכות") must come before its
 *   opening counterpart ("שהייה בסמיכות") because the clearance message contains
 *   the opening phrase as a substring.
 * - PRE_ALERT trigger is the shared prefix of both message variants:
 *   "באזורך" (singular, older format) and "באיזורים הבאים" (plural, newer format).
 */
const STATE_RULES: [string, AlertState][] = [
  ["האירוע הסתיים",                              "ALL_CLEAR"   ],
  ["ניתן לצאת מהמרחב המוגן",                    "ALL_CLEAR"   ],
  ["סיום שהייה בסמיכות למרחב המוגן",            "ALL_CLEAR"   ],  // end of shelter-proximity readiness
  ["בדקות הקרובות צפויות להתקבל התרעות",        "PRE_ALERT"   ],
  ["שהייה בסמיכות למרחב מוגן",                  "PRE_ALERT"   ],  // stay-near-shelter readiness order
  ["יש לשהות בסמיכות למרחב המוגן",              "PRE_ALERT"   ],  // alternate phrasing
  ["עדכון - התרעות",                             "ACTIVE_SIREN"],  // old pre-2022 Telegram format
  ["ירי רקטות וטילים",                           "ACTIVE_SIREN"],
];

export function classifyMessage(text: string): AlertState {
  const normalized = text.normalize("NFC");
  for (const [trigger, state] of STATE_RULES) {
    if (normalized.includes(trigger)) return state;
  }
  return "OTHER";
}

export function isRelevant(text: string): boolean {
  return text.normalize("NFC").includes(TARGET_AREA);
}

export function parseMessage(text: string, tgMsgId: number, sentAt: number) {
  const state = classifyMessage(text);
  const relevant = isRelevant(text);
  // Extract matched area name (TARGET_AREA if relevant, else empty)
  const area = relevant ? TARGET_AREA : "";
  return { tgMsgId, sentAt, rawText: text, state, area, relevant };
}
