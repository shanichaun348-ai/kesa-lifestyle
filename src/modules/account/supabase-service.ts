import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { INDIAN_STATES } from "@/lib/india-states";
import { formatOrderNumber, listOrdersForCustomer, type AdminOrder } from "@/modules/admin/orders-data";
import type { OrderStatus } from "@/modules/orders/types";

import { AccountError } from "./errors";

export type Profile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acceptsMarketing: boolean;
  createdAt: string;
};

export type ProfileInput = { firstName?: string | undefined; lastName?: string | undefined; phone?: string | null | undefined };

export type AddressInput = {
  label?: string | undefined;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | undefined;
  landmark?: string | undefined;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  isDefaultShipping?: boolean | undefined;
};

export type Address = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  stateCode: string | null;
  pincode: string;
  isDefaultShipping: boolean;
};

/** Customer-facing order states, simplified from the fulfilment state machine. */
export type AccountOrderStatus = "pending_payment" | "failed" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export type AccountOrderSummary = {
  orderNumber: string;
  status: AccountOrderStatus;
  totalPaise: number;
  placedAt: string;
  itemCount: number;
};

export type AccountOrder = AccountOrderSummary & {
  items: AdminOrder["items"];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  gstPaise: number;
  couponCode: string | null;
  shippingAddress: AdminOrder["shippingAddress"];
  razorpayPaymentId: string | null;
  paidAt: string | null;
};

const STATUS: Record<OrderStatus, AccountOrderStatus> = {
  CREATED: "pending_payment",
  PAYMENT_PENDING: "pending_payment",
  PAYMENT_FAILED: "failed",
  PAID: "paid",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

type ProfileRow = { id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; accepts_marketing: boolean; created_at: string };
type AddressRow = {
  id: string; label: string | null; full_name: string; phone: string; line1: string; line2: string | null; landmark: string | null;
  city: string; state: string; state_code: string | null; pincode: string; is_default: boolean;
};

const toProfile = (r: ProfileRow): Profile => ({ id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name, phone: r.phone, acceptsMarketing: r.accepts_marketing, createdAt: r.created_at });

const toAddress = (r: AddressRow): Address => ({
  id: r.id, label: r.label, fullName: r.full_name, phone: r.phone, line1: r.line1, line2: r.line2, landmark: r.landmark,
  city: r.city, state: r.state, stateCode: r.state_code ?? INDIAN_STATES.find((s) => s.name === r.state)?.code ?? null, pincode: r.pincode, isDefaultShipping: r.is_default,
});

function summary(o: AdminOrder): AccountOrderSummary {
  return { orderNumber: formatOrderNumber(o.orderNumber), status: STATUS[o.status], totalPaise: o.totalPaise, placedAt: o.createdAt, itemCount: o.items.reduce((s, i) => s + i.quantity, 0) };
}

/**
 * Customer account data on the live Supabase schema. Every call is scoped to
 * the signed-in user's id (profiles/addresses) or email (orders), so another
 * customer's rows are indistinguishable from "not found".
 */
export function createSupabaseAccountService() {
  const db = () => getSupabaseServiceClient();

  return {
    profile: {
      /** Returns the profile, creating it from the session email if the auth trigger has not run. */
      async get(userId: string, email?: string | null): Promise<Profile | null> {
        const { data } = await db().from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) return toProfile(data as ProfileRow);
        if (!email) return null;
        const { data: created, error } = await db().from("profiles").upsert({ id: userId, email }, { onConflict: "id", ignoreDuplicates: true }).select("*").maybeSingle();
        if (error) throw new AccountError("invalid", error.message);
        return created ? toProfile(created as ProfileRow) : null;
      },
      async update(userId: string, input: ProfileInput): Promise<void> {
        const { data, error } = await db()
          .from("profiles")
          .update({ first_name: input.firstName ?? null, last_name: input.lastName ?? null, phone: input.phone ?? null })
          .eq("id", userId)
          .select("id")
          .maybeSingle();
        if (error) throw new AccountError("invalid", error.message);
        if (!data) throw new AccountError("not_found", "Profile not found.");
      },
    },

    addresses: {
      async list(userId: string): Promise<Address[]> {
        const { data, error } = await db().from("addresses").select("*").eq("profile_id", userId).order("is_default", { ascending: false }).order("created_at", { ascending: false });
        if (error) throw new AccountError("invalid", error.message);
        return ((data ?? []) as AddressRow[]).map(toAddress);
      },
      async create(userId: string, input: AddressInput): Promise<string> {
        const { count } = await db().from("addresses").select("id", { count: "exact", head: true }).eq("profile_id", userId);
        const makeDefault = Boolean(input.isDefaultShipping) || (count ?? 0) === 0;
        if (makeDefault) await db().from("addresses").update({ is_default: false }).eq("profile_id", userId);
        const { data, error } = await db().from("addresses").insert({ ...toRow(input), profile_id: userId, is_default: makeDefault }).select("id").single();
        if (error || !data) throw new AccountError("invalid", error?.message ?? "Address could not be saved.");
        return data.id as string;
      },
      async update(userId: string, id: string, input: AddressInput): Promise<void> {
        if (input.isDefaultShipping) await db().from("addresses").update({ is_default: false }).eq("profile_id", userId);
        const { data, error } = await db()
          .from("addresses")
          .update({ ...toRow(input), ...(input.isDefaultShipping ? { is_default: true } : {}) })
          .eq("id", id)
          .eq("profile_id", userId)
          .select("id")
          .maybeSingle();
        if (error) throw new AccountError("invalid", error.message);
        if (!data) throw new AccountError("not_found", "Address not found.");
      },
      async remove(userId: string, id: string): Promise<void> {
        const { data, error } = await db().from("addresses").delete().eq("id", id).eq("profile_id", userId).select("id").maybeSingle();
        if (error) throw new AccountError("invalid", error.message);
        if (!data) throw new AccountError("not_found", "Address not found.");
      },
      async setDefault(userId: string, id: string): Promise<void> {
        const { data } = await db().from("addresses").select("id").eq("id", id).eq("profile_id", userId).maybeSingle();
        if (!data) throw new AccountError("not_found", "Address not found.");
        await db().from("addresses").update({ is_default: false }).eq("profile_id", userId);
        await db().from("addresses").update({ is_default: true }).eq("id", id);
      },
    },

    orders: {
      /**
       * Orders placed with the given email — signed in or as a guest. Callers
       * must pass the email only once Supabase has confirmed it (`emailConfirmed`);
       * passing null yields nothing, so an unverified sign-up can never read a
       * guest's history by registering with their address.
       */
      async list(_userId: string, limit: number, confirmedEmail: string | null): Promise<AccountOrderSummary[]> {
        if (!confirmedEmail) return [];
        return (await listOrdersForCustomer(confirmedEmail)).slice(0, limit).map(summary);
      },
      async get(_userId: string, orderNumber: string, confirmedEmail: string | null): Promise<AccountOrder | null> {
        const m = /^KL-(\d+)$/.exec(orderNumber);
        if (!m || !confirmedEmail) return null;
        const o = (await listOrdersForCustomer(confirmedEmail)).find((x) => x.orderNumber === Number(m[1]));
        if (!o) return null;
        return {
          ...summary(o),
          items: o.items,
          subtotalPaise: o.subtotalPaise,
          discountPaise: o.discountPaise,
          shippingPaise: o.shippingPaise,
          gstPaise: o.gstPaise,
          couponCode: o.coupon?.code ?? null,
          shippingAddress: o.shippingAddress,
          razorpayPaymentId: o.razorpayPaymentId ?? null,
          paidAt: o.paidAt ?? null,
        };
      },
    },
  };
}

function toRow(input: AddressInput) {
  return {
    label: input.label ?? null,
    full_name: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 ?? null,
    landmark: input.landmark ?? null,
    city: input.city,
    state: input.state,
    state_code: input.stateCode,
    pincode: input.pincode,
    country: "IN",
  };
}

export type SupabaseAccountService = ReturnType<typeof createSupabaseAccountService>;
