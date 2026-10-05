import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/lib/auth/guard";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const profile = await service.profile.get(user.id);

  return (
    <>
      <AccountHeading title="Profile" />
      <ProfileForm initial={{ email: user.email ?? "", firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "", phone: profile?.phone?.replace(/^\+91/, "") ?? "" }} />
      <div className="mt-10 border-t border-line pt-6">
        <h2 className="type-h3">Password</h2>
        <p className="type-small mt-1 text-ink-muted">Choose a new password while signed in.</p>
        <Button variant="secondary" size="sm" className="mt-3" asChild>
          <Link href="/account/reset-password/">Change password</Link>
        </Button>
      </div>
    </>
  );
}
