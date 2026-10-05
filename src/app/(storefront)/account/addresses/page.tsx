import type { Metadata } from "next";

import { AddressBook } from "@/components/account/address-book";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { requireUser } from "@/lib/auth/guard";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Addresses", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const addresses = await service.addresses.list(user.id);
  return (
    <>
      <AccountHeading title="Addresses" />
      <AddressBook addresses={addresses} />
    </>
  );
}
