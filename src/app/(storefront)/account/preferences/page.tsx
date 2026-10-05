import type { Metadata } from "next";

import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { PreferencesForm } from "@/components/account/preferences-form";
import { requireUser } from "@/lib/auth/guard";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false, follow: false } };

export default async function PreferencesPage() {
  const user = await requireUser("/account/preferences/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const prefs = await service.preferences.get(user.id);
  return (
    <>
      <AccountHeading title="Email preferences" />
      <PreferencesForm initial={prefs} />
    </>
  );
}
