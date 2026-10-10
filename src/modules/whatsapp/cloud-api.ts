import "server-only";

/**
 * WhatsApp Business Platform (Meta Cloud API) transport.
 *
 * Business-initiated messages must use a template approved in Meta Business
 * Manager, so this module only sends templates. The shop sets the template
 * name and language in the environment; the message copy itself lives on
 * Meta's side.
 */

export type SendWhatsAppInput = {
  /** Destination in international format without "+", e.g. "919876543210". */
  to: string;
  /** Approved template name, e.g. "order_confirmed". */
  template: string;
  /** Template language code, e.g. "en" or "en_US". */
  language: string;
  /** Values for {{1}}, {{2}}, … in the template body, in order. */
  bodyParams: string[];
};

export type SendWhatsAppResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function log(level: "info" | "warn" | "error", action: string, extra: Record<string, unknown>) {
  const line = JSON.stringify({ level, event: "whatsapp", action, ...extra, ts: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Send one template message. Never throws: a failed or unconfigured message
 * must never break checkout.
 */
export async function sendWhatsAppTemplate(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    log("warn", "skipped_unconfigured", { template: input.template });
    return { ok: false, error: "WhatsApp is not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).", skipped: true };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to,
        type: "template",
        template: {
          name: input.template,
          language: { code: input.language },
          components: input.bodyParams.length > 0 ? [{ type: "body", parameters: input.bodyParams.map((text) => ({ type: "text", text })) }] : [],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } };
    const id = json.messages?.[0]?.id;
    if (!res.ok || !id) {
      const error = json.error?.message ?? `WhatsApp API responded ${res.status}`;
      log("error", "send_failed", { template: input.template, status: res.status, code: json.error?.code, error });
      return { ok: false, error };
    }

    log("info", "sent", { id, template: input.template });
    return { ok: true, id };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown";
    log("error", "send_error", { template: input.template, error });
    return { ok: false, error };
  }
}
