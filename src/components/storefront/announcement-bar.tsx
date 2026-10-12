"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";

type AnnouncementBarProps = {
  /** Stable id so a dismissal applies to this message only. */
  id: string;
  message: string;
  /** Coupon code shown as a copyable chip. */
  code?: string | undefined;
  href?: string | undefined;
  linkLabel?: string | undefined;
};

const DISMISS_DAYS = 7;
const listeners = new Set<() => void>();

function storageKey(id: string) {
  return `kesa:announcement:${id}`;
}

function isDismissed(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    const until = raw ? Number(raw) : 0;
    return Boolean(until && until > Date.now());
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** The coupon code as a chip that copies itself on click. */
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the code is still readable */
    }
  }

  React.useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `Code ${code} copied` : `Copy code ${code}`}
      className="inline-flex items-center gap-1.5 rounded-sm border border-current/40 px-2 py-0.5 font-mono text-[0.8em] font-semibold tracking-wider transition-colors hover:bg-bg/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:bg-brand/10"
    >
      {code}
      {copied ? <CheckIcon className="size-3.5" aria-hidden="true" /> : <CopyIcon className="size-3.5 opacity-70" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">{copied ? "Copied" : ""}</span>
    </button>
  );
}

/**
 * Single-line announcement, max one active at a time, dismissible for 7 days.
 * Dismissal state lives in localStorage and is read through
 * useSyncExternalStore, so the server render (snapshot "not dismissed") and
 * the client agree without a flash or an effect-driven re-render.
 */
export function AnnouncementBar({ id, message, code, href, linkLabel = "Shop now" }: AnnouncementBarProps) {
  const dismissed = React.useSyncExternalStore(
    subscribe,
    () => isDismissed(id),
    () => false,
  );

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(id), String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      /* storage unavailable: the bar simply returns next visit */
    }
    listeners.forEach((l) => l());
  }

  if (dismissed) return null;

  return (
    <div role="region" aria-label="Announcement" className="bg-ink text-bg dark:border-b dark:border-line dark:bg-surface dark:text-brand">
      <div className="container-page flex min-h-10 items-center justify-center gap-3 py-2 text-center text-xs tracking-wide sm:text-sm">
        <p className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>{message}</span>
          {code ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="opacity-80">Code</span>
              <CopyCode code={code} />
            </span>
          ) : null}
          {href ? (
            <Link href={href} className="underline underline-offset-4 hover:no-underline">
              {linkLabel}
            </Link>
          ) : null}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-bg/80 hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg dark:text-brand/80 dark:hover:text-brand dark:focus-visible:outline-brand"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
