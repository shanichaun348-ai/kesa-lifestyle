"use client";

import * as React from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";

type AnnouncementBarProps = {
  /** Stable id so a dismissal applies to this message only. */
  id: string;
  message: string;
  href?: string;
  linkLabel?: string;
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

/**
 * Single-line announcement, max one active at a time, dismissible for 7 days.
 * Dismissal state lives in localStorage and is read through
 * useSyncExternalStore, so the server render (snapshot "not dismissed") and
 * the client agree without a flash or an effect-driven re-render.
 */
export function AnnouncementBar({ id, message, href, linkLabel = "Shop now" }: AnnouncementBarProps) {
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
        <p className="min-w-0">
          {message}
          {href ? (
            <>
              {" "}
              <Link href={href} className="underline underline-offset-4 hover:no-underline">
                {linkLabel}
              </Link>
            </>
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
