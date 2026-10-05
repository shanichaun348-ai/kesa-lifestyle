"use client";

import { signOut } from "@/app/(admin)/admin/login/_actions";

export function AdminSignOut() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Sign out
      </button>
    </form>
  );
}
