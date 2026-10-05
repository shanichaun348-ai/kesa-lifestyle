"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/modules/account/actions";

type Props = { initial: { firstName: string; lastName: string; phone: string; email: string } };

export function ProfileForm({ initial }: Props) {
  const [firstName, setFirstName] = React.useState(initial.firstName);
  const [lastName, setLastName] = React.useState(initial.lastName);
  const [phone, setPhone] = React.useState(initial.phone);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const result = await updateProfileAction({ firstName, lastName: lastName || undefined, phone });
    setPending(false);
    if (result.ok) toast.success("Profile updated");
    else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-md flex-col gap-6" noValidate aria-busy={pending}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="pf-email">Email</FieldLabel>
          <Input id="pf-email" value={initial.email} disabled />
        </Field>
        <Field data-invalid={errors.firstName ? "true" : undefined}>
          <FieldLabel htmlFor="pf-first">First name</FieldLabel>
          <Input id="pf-first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          {errors.firstName ? <FieldError>{errors.firstName}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="pf-last">Last name</FieldLabel>
          <Input id="pf-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field data-invalid={errors.phone ? "true" : undefined}>
          <FieldLabel htmlFor="pf-phone">Mobile number</FieldLabel>
          <Input id="pf-phone" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" />
          {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" loading={pending} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
