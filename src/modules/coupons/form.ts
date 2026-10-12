/**
 * Turns the admin coupon form into a CouponInput, with rupee amounts
 * converted to paise. Pure so it can be unit-tested without a request.
 */
import { CODE_PATTERN, normaliseCode } from "@/modules/checkout/coupon-rules";
import type { CouponInput } from "./admin";

export type CouponFormResult = { ok: true; input: CouponInput } | { ok: false; error: string };

type Fields = Record<string, FormDataEntryValue | null | undefined>;
type Field = FormDataEntryValue | null | undefined;

const text = (v: Field) => (typeof v === "string" ? v.trim() : "");

function rupeesToPaise(v: Field): number | null | "invalid" {
  const s = text(v);
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100);
}

function positiveInt(v: Field): number | null | "invalid" {
  const s = text(v);
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) return "invalid";
  return n;
}

/** `datetime-local` value (no zone) → ISO in the given IANA zone offset, or null when blank. */
function localToIso(v: Field): string | null | "invalid" {
  const s = text(v);
  if (s === "") return null;
  // Treat the admin's input as IST (store timezone).
  const d = new Date(`${s}:00+05:30`.replace(/(:\d{2}):00\+05:30$/, "$1:00+05:30"));
  if (Number.isNaN(d.getTime())) return "invalid";
  return d.toISOString();
}

export function parseCouponForm(f: Fields): CouponFormResult {
  const code = normaliseCode(text(f.code));
  if (!CODE_PATTERN.test(code)) return { ok: false, error: "Code must be 2–20 characters: letters, numbers, hyphens or underscores." };

  const type = text(f.type);
  if (type !== "percent" && type !== "fixed") return { ok: false, error: "Choose a discount type." };

  let value: number;
  if (type === "percent") {
    value = Number(text(f.value));
    if (!Number.isInteger(value) || value < 1 || value > 100) return { ok: false, error: "Percent discount must be a whole number from 1 to 100." };
  } else {
    const paise = rupeesToPaise(f.value);
    if (paise === null || paise === "invalid" || paise <= 0) return { ok: false, error: "Enter the discount amount in rupees, e.g. 200." };
    value = paise;
  }

  const minOrderPaise = rupeesToPaise(f.minOrderRupees);
  if (minOrderPaise === "invalid") return { ok: false, error: "Minimum order must be a rupee amount (0 for none)." };

  const maxDiscountPaise = type === "percent" ? rupeesToPaise(f.maxDiscountRupees) : null;
  if (maxDiscountPaise === "invalid" || maxDiscountPaise === 0) return { ok: false, error: "Maximum discount must be a rupee amount, or blank for no cap." };

  const usageLimit = positiveInt(f.usageLimit);
  if (usageLimit === "invalid") return { ok: false, error: "Total uses must be a whole number, or blank for unlimited." };
  const perCustomerLimit = positiveInt(f.perCustomerLimit);
  if (perCustomerLimit === "invalid") return { ok: false, error: "Uses per customer must be a whole number, or blank for unlimited." };

  const startsAt = localToIso(f.startsAt);
  const endsAt = localToIso(f.endsAt);
  if (startsAt === "invalid" || endsAt === "invalid") return { ok: false, error: "Check the start and end dates." };
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return { ok: false, error: "The end date must be after the start date." };

  return {
    ok: true,
    input: {
      code,
      description: text(f.description).slice(0, 200),
      type,
      value,
      minOrderPaise: minOrderPaise ?? 0,
      maxDiscountPaise,
      startsAt,
      endsAt,
      usageLimit,
      perCustomerLimit,
      firstOrderOnly: f.firstOrderOnly === "on" || f.firstOrderOnly === "true",
      active: f.active === "on" || f.active === "true",
    },
  };
}

/** ISO → `datetime-local` value in IST for pre-filling the form. */
export function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + 5.5 * 3_600_000);
  return ist.toISOString().slice(0, 16);
}
