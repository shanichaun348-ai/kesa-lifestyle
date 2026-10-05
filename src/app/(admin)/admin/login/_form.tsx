"use client";

import { useActionState } from "react";

import { signIn, type LoginState } from "./_actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none placeholder:text-ink-subtle focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink outline-none placeholder:text-ink-subtle focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:opacity-50"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="flex h-11 w-full items-center justify-center rounded-md border border-ink bg-ink text-sm font-medium text-bg transition-colors hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
