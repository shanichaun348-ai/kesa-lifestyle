import "server-only";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | undefined;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Send one transactional email through Resend's REST API.
 * Never throws: a failed or unconfigured email must never break checkout.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(JSON.stringify({ level: "warn", event: "email", action: "skipped_unconfigured", subject: input.subject, ts: new Date().toISOString() }));
    return { ok: false, error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM).", skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok || !json.id) {
      const error = json.message ?? json.name ?? `Resend responded ${res.status}`;
      console.error(JSON.stringify({ level: "error", event: "email", action: "send_failed", subject: input.subject, status: res.status, error, ts: new Date().toISOString() }));
      return { ok: false, error };
    }

    console.log(JSON.stringify({ level: "info", event: "email", action: "sent", id: json.id, subject: input.subject, ts: new Date().toISOString() }));
    return { ok: true, id: json.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown";
    console.error(JSON.stringify({ level: "error", event: "email", action: "send_error", subject: input.subject, error, ts: new Date().toISOString() }));
    return { ok: false, error };
  }
}
