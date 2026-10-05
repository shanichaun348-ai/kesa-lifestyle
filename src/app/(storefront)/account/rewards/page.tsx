import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { requireUser } from "@/lib/auth/guard";
import { site } from "@/lib/site";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Rewards", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Loyalty and referral architecture (docs/08 §12). The ledgers, balances and
 * referral codes are live; earning rules and redemption at checkout ship
 * with the loyalty launch, and the page says so rather than implying rewards
 * are already being paid.
 */
export default async function RewardsPage() {
  const user = await requireUser("/account/rewards/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const [loyalty, code, stats] = await Promise.all([service.loyalty.summary(user.id), service.referral.getOrCreateCode(user.id), service.referral.stats(user.id)]);
  const shareUrl = `${site.url}/?ref=${code}`;

  return (
    <>
      <AccountHeading title="Rewards" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Points</CardTitle>
            <CardDescription>{loyalty.tier} tier</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p>
              <span className="type-h2 text-ink">{loyalty.balancePoints}</span>
              <span className="type-small ml-2 text-ink-muted">available · {loyalty.lifetimePoints} lifetime</span>
            </p>
            <p className="type-small text-ink-muted">Earning on orders and redeeming at checkout start with the loyalty launch. Your balance is tracked from your first order so nothing is lost.</p>
            {loyalty.transactions.length > 0 ? (
              <ul className="divide-y divide-line border-t border-line text-sm">
                {loyalty.transactions.map((t) => (
                  <li key={t.id} className="flex justify-between py-2">
                    <span className="text-ink-muted">
                      {t.kind}
                      {t.note ? ` · ${t.note}` : ""}
                    </span>
                    <span className="flex gap-3">
                      <time className="type-small text-ink-subtle" dateTime={t.createdAt}>
                        {dateFormat.format(new Date(t.createdAt))}
                      </time>
                      <span className={t.deltaPoints > 0 ? "text-success" : "text-ink"}>
                        {t.deltaPoints > 0 ? "+" : ""}
                        {t.deltaPoints}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Refer a friend</CardTitle>
            <CardDescription>Your personal code</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="type-h3 tracking-wide text-ink">{code}</p>
            <p className="type-small break-all text-ink-muted">{shareUrl}</p>
            <p className="type-small text-ink-muted">
              {stats.invited} invited · {stats.rewarded} rewarded. Rewards are credited after a friend&rsquo;s first order is delivered and the return window passes; the reward amounts are announced with the loyalty launch.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
