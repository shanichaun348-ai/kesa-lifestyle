import "server-only";

import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission, ROLE_LABELS } from "@/modules/admin/rbac";
import { countOpenReturns } from "@/modules/returns/supabase-returns";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const dbConnected = isSupabaseConfigured();
  const openReturns = dbConnected && hasPermission(session.role, "orders:read") ? await countOpenReturns().catch(() => 0) : 0;

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {/* Brand */}
        <div className="flex h-14 items-center border-b border-line px-5">
          <a href="/admin/" className="font-display text-base font-medium text-ink">
            Kesa Admin
          </a>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNav role={session.role} badges={{ "/admin/returns/": openReturns }} />
        </div>

        {/* User */}
        <div className="border-t border-line p-3">
          <div className="mb-1 rounded-md px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{session.name}</p>
            <p className="truncate text-xs text-ink-subtle">{ROLE_LABELS[session.role]}</p>
          </div>
          <AdminSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
          <a href="/admin/" className="font-display text-base font-medium text-ink">
            Kesa Admin
          </a>
          <AdminSignOut />
        </div>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          {!dbConnected && (
            <div className="mb-6 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
              <strong>Demo mode:</strong> No database is connected. Changes are not persisted. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to go live.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
