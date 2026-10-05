"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/auth/session-provider";
import { useCart } from "@/components/cart/cart-provider";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/modules/auth/actions";

type Errors = Record<string, string>;

function useSubmit<T>(run: () => Promise<{ ok: true; value: T } | { ok: false; message: string; fieldErrors?: Errors | undefined }>, onSuccess: (value: T) => void) {
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setErrors({});
    const result = await run();
    setPending(false);
    if (result.ok) onSuccess(result.value);
    else {
      setMessage(result.message);
      setErrors(result.fieldErrors ?? {});
    }
  }
  return { pending, message, errors, submit };
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const session = useSession();
  const cart = useCart();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const form = useSubmit(
    () => loginAction({ email, password, next }),
    async (value) => {
      await Promise.all([session.refresh(), cart.refresh()]);
      if (value.claimedOrders > 0) toast.success(`Welcome back. ${value.claimedOrders} earlier ${value.claimedOrders === 1 ? "order is" : "orders are"} now in your account.`);
      router.push(value.next);
      router.refresh();
    },
  );

  return (
    <form onSubmit={(e) => void form.submit(e)} className="flex flex-col gap-6" noValidate aria-busy={form.pending}>
      {form.message ? (
        <Alert variant="danger">
          <AlertTitle>Could not sign in</AlertTitle>
          <AlertDescription>{form.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field data-invalid={form.errors.email ? "true" : undefined}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input id="login-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {form.errors.email ? <FieldError>{form.errors.email}</FieldError> : null}
        </Field>
        <Field data-invalid={form.errors.password ? "true" : undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Link href="/forgot-password/" className="type-small text-brand underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {form.errors.password ? <FieldError>{form.errors.password}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" fullWidth loading={form.pending}>
        Sign in
      </Button>
      <p className="type-small text-center text-ink-muted">
        New to Kesa?{" "}
        <Link href={`/register/?next=${encodeURIComponent(next)}`} className="text-brand underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const session = useSession();
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [acceptsMarketing, setAcceptsMarketing] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const form = useSubmit(
    () => registerAction({ firstName, lastName: lastName || undefined, email, password, acceptsMarketing, next }),
    async (value) => {
      if (value.needsConfirmation) {
        setDone(true);
        return;
      }
      await session.refresh();
      router.push(value.next);
      router.refresh();
    },
  );

  if (done) {
    return (
      <Alert variant="success">
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>If this email is new to us, a confirmation link is on its way. Open it to activate your account. If you already have an account, sign in instead.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={(e) => void form.submit(e)} className="flex flex-col gap-6" noValidate aria-busy={form.pending}>
      {form.message ? (
        <Alert variant="danger">
          <AlertTitle>Could not create the account</AlertTitle>
          <AlertDescription>{form.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={form.errors.firstName ? "true" : undefined}>
            <FieldLabel htmlFor="reg-first">First name</FieldLabel>
            <Input id="reg-first" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            {form.errors.firstName ? <FieldError>{form.errors.firstName}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="reg-last">Last name</FieldLabel>
            <Input id="reg-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field data-invalid={form.errors.email ? "true" : undefined}>
          <FieldLabel htmlFor="reg-email">Email</FieldLabel>
          <Input id="reg-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {form.errors.email ? <FieldError>{form.errors.email}</FieldError> : null}
        </Field>
        <Field data-invalid={form.errors.password ? "true" : undefined}>
          <FieldLabel htmlFor="reg-password">Password</FieldLabel>
          <Input id="reg-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
          <FieldDescription>At least 12 characters. A short sentence works well.</FieldDescription>
          {form.errors.password ? <FieldError>{form.errors.password}</FieldError> : null}
        </Field>
        <Label className="flex min-h-11 items-start gap-3 text-sm">
          <Checkbox checked={acceptsMarketing} onCheckedChange={(v) => setAcceptsMarketing(v === true)} className="mt-0.5" />
          <span className="text-ink-muted">Email me new arrivals and offers. Unsubscribe any time.</span>
        </Label>
      </FieldGroup>
      <Button type="submit" size="lg" fullWidth loading={form.pending}>
        Create account
      </Button>
      <p className="type-small text-center text-ink-muted">
        Already have an account?{" "}
        <Link href={`/login/?next=${encodeURIComponent(next)}`} className="text-brand underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  const form = useSubmit(() => forgotPasswordAction({ email }), () => setDone(true));

  if (done) {
    return (
      <Alert variant="success">
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>If an account exists for that email, a reset link is on its way. It expires in an hour.</AlertDescription>
      </Alert>
    );
  }
  return (
    <form onSubmit={(e) => void form.submit(e)} className="flex flex-col gap-6" noValidate aria-busy={form.pending}>
      {form.message ? (
        <Alert variant="danger">
          <AlertTitle>Could not send the link</AlertTitle>
          <AlertDescription>{form.message}</AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={form.errors.email ? "true" : undefined}>
        <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
        <Input id="forgot-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {form.errors.email ? <FieldError>{form.errors.email}</FieldError> : null}
      </Field>
      <Button type="submit" size="lg" fullWidth loading={form.pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const form = useSubmit(
    () => resetPasswordAction({ password, confirm }),
    () => {
      toast.success("Password updated");
      router.push("/account/");
      router.refresh();
    },
  );
  return (
    <form onSubmit={(e) => void form.submit(e)} className="flex flex-col gap-6" noValidate aria-busy={form.pending}>
      {form.message ? (
        <Alert variant="danger">
          <AlertTitle>Could not update the password</AlertTitle>
          <AlertDescription>{form.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field data-invalid={form.errors.password ? "true" : undefined}>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input id="reset-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
          {form.errors.password ? <FieldError>{form.errors.password}</FieldError> : null}
        </Field>
        <Field data-invalid={form.errors.confirm ? "true" : undefined}>
          <FieldLabel htmlFor="reset-confirm">Confirm password</FieldLabel>
          <Input id="reset-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {form.errors.confirm ? <FieldError>{form.errors.confirm}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" fullWidth loading={form.pending}>
        Update password
      </Button>
    </form>
  );
}
