"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/storefront/empty-state";
import { INDIAN_STATES } from "@/lib/india-states";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "@/modules/account/actions";

export type AddressRow = {
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

type Draft = { id?: string | undefined; label: string; fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; stateCode: string; pincode: string; isDefaultShipping: boolean };

const empty: Draft = { label: "", fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", stateCode: "", pincode: "", isDefaultShipping: false };

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(empty);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function edit(a?: AddressRow) {
    setErrors({});
    setDraft(
      a
        ? { id: a.id, label: a.label ?? "", fullName: a.fullName, phone: a.phone.replace(/^\+91/, ""), line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, stateCode: a.stateCode ?? "", pincode: a.pincode, isDefaultShipping: a.isDefaultShipping }
        : empty,
    );
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const result = await saveAddressAction({ ...draft, id: draft.id, label: draft.label || undefined, line2: draft.line2 || undefined, landmark: draft.landmark || undefined });
    setPending(false);
    if (result.ok) {
      toast.success("Address saved");
      setOpen(false);
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
    }
  }

  async function remove(id: string) {
    const result = await deleteAddressAction({ id });
    if (result.ok) {
      toast.success("Address removed");
      router.refresh();
    } else toast.error(result.message);
  }

  async function makeDefault(id: string) {
    const result = await setDefaultAddressAction({ id });
    if (result.ok) router.refresh();
    else toast.error(result.message);
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => edit()}>
          Add address
        </Button>
      </div>
      {addresses.length === 0 ? (
        <EmptyState title="No saved addresses" description="Save an address to speed up checkout." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">{a.label || a.fullName}</p>
                {a.isDefaultShipping ? <Badge variant="muted">Default</Badge> : null}
              </div>
              <p className="text-ink">{a.fullName}</p>
              <p className="text-ink-muted">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                {a.landmark ? `, ${a.landmark}` : ""}
              </p>
              <p className="text-ink-muted">
                {a.city}, {a.state} {a.pincode}
              </p>
              <p className="text-ink-muted">{a.phone}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button type="button" onClick={() => edit(a)} className="type-small text-brand underline underline-offset-4">
                  Edit
                </button>
                {!a.isDefaultShipping ? (
                  <button type="button" onClick={() => void makeDefault(a.id)} className="type-small text-brand underline underline-offset-4">
                    Make default
                  </button>
                ) : null}
                <button type="button" onClick={() => void remove(a.id)} className="type-small text-ink-muted underline underline-offset-4 hover:text-danger">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={(e) => void save(e)} noValidate aria-busy={pending} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit address" : "Add address"}</DialogTitle>
              <DialogDescription>Used for delivery and GST invoices.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ad-label">Label (optional)</FieldLabel>
                <Input id="ad-label" placeholder="Home, Office" value={draft.label} onChange={(e) => set("label", e.target.value)} />
              </Field>
              <Field data-invalid={errors.fullName ? "true" : undefined}>
                <FieldLabel htmlFor="ad-name">Full name</FieldLabel>
                <Input id="ad-name" autoComplete="name" value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} />
                {errors.fullName ? <FieldError>{errors.fullName}</FieldError> : null}
              </Field>
              <Field data-invalid={errors.phone ? "true" : undefined}>
                <FieldLabel htmlFor="ad-phone">Phone</FieldLabel>
                <Input id="ad-phone" inputMode="numeric" maxLength={10} value={draft.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
              </Field>
              <Field data-invalid={errors.line1 ? "true" : undefined}>
                <FieldLabel htmlFor="ad-line1">Address</FieldLabel>
                <Input id="ad-line1" autoComplete="address-line1" value={draft.line1} onChange={(e) => set("line1", e.target.value)} />
                {errors.line1 ? <FieldError>{errors.line1}</FieldError> : null}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ad-line2">Area</FieldLabel>
                  <Input id="ad-line2" value={draft.line2} onChange={(e) => set("line2", e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ad-landmark">Landmark</FieldLabel>
                  <Input id="ad-landmark" value={draft.landmark} onChange={(e) => set("landmark", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={errors.pincode ? "true" : undefined}>
                  <FieldLabel htmlFor="ad-pincode">Pincode</FieldLabel>
                  <Input id="ad-pincode" inputMode="numeric" maxLength={6} value={draft.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  {errors.pincode ? <FieldError>{errors.pincode}</FieldError> : null}
                </Field>
                <Field data-invalid={errors.city ? "true" : undefined}>
                  <FieldLabel htmlFor="ad-city">City</FieldLabel>
                  <Input id="ad-city" value={draft.city} onChange={(e) => set("city", e.target.value)} />
                  {errors.city ? <FieldError>{errors.city}</FieldError> : null}
                </Field>
              </div>
              <Field data-invalid={errors.stateCode ? "true" : undefined}>
                <FieldLabel htmlFor="ad-state">State</FieldLabel>
                <Select value={draft.stateCode} onValueChange={(v) => set("stateCode", v)}>
                  <SelectTrigger id="ad-state" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.stateCode ? <FieldError>Select your state.</FieldError> : null}
              </Field>
              <Label className="flex min-h-10 items-center gap-3 text-sm">
                <Checkbox checked={draft.isDefaultShipping} onCheckedChange={(v) => set("isDefaultShipping", v === true)} />
                Use as default delivery address
              </Label>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save address
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
