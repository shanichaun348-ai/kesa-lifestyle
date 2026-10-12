/**
 * Which reminder, if any, a left-behind bag is due for. Pure so it can be
 * unit-tested with an injected "now"; the job applies it to each candidate.
 *
 * Schedule: first reminder once the bag has been idle for an hour, second
 * (and last) at least 23 hours after the first, nothing after seven days.
 */
export const FIRST_REMINDER_AFTER_MS = 60 * 60 * 1000;
export const SECOND_REMINDER_GAP_MS = 23 * 60 * 60 * 1000;
export const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_REMINDERS = 2;

export type ReminderCandidate = {
  status: string;
  consent: boolean;
  email: string | null;
  reminderCount: number;
  lastRemindedAt: string | null;
  lastActivityAt: string;
  itemCount: number;
};

export type ReminderAction = "first" | "second" | "expire" | "skip";

export function reminderAction(cart: ReminderCandidate, now: Date): ReminderAction {
  if (cart.status !== "open" && cart.status !== "reminded") return "skip";
  const idleMs = now.getTime() - new Date(cart.lastActivityAt).getTime();
  if (idleMs > CART_TTL_MS) return "expire";
  if (!cart.consent || !cart.email || cart.itemCount === 0) return "skip";
  if (idleMs < FIRST_REMINDER_AFTER_MS) return "skip";
  if (cart.reminderCount >= MAX_REMINDERS) return "skip";
  if (cart.reminderCount === 0) return "first";
  if (!cart.lastRemindedAt) return "second";
  const sinceLastMs = now.getTime() - new Date(cart.lastRemindedAt).getTime();
  return sinceLastMs >= SECOND_REMINDER_GAP_MS ? "second" : "skip";
}

/** True when the shopper ordered after they last touched this bag — nothing to remind. */
export function orderedSince(cart: Pick<ReminderCandidate, "lastActivityAt">, orderCreatedAts: readonly string[]): boolean {
  const since = new Date(cart.lastActivityAt).getTime();
  return orderCreatedAts.some((at) => new Date(at).getTime() >= since);
}
