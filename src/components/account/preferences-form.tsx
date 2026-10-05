"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updatePreferencesAction } from "@/modules/account/actions";

type Prefs = { offers: boolean; new_arrivals: boolean; journal: boolean };

const TOPICS: Array<{ key: keyof Prefs; label: string; description: string }> = [
  { key: "new_arrivals", label: "New arrivals", description: "A note when new pieces land, about twice a month." },
  { key: "offers", label: "Offers", description: "Sale and early-access emails. Never more than weekly." },
  { key: "journal", label: "Journal", description: "Styling and care stories from the journal." },
];

export function PreferencesForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = React.useState<Prefs>(initial);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await updatePreferencesAction(prefs);
    setPending(false);
    if (result.ok) toast.success("Preferences saved");
    else toast.error(result.message);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-md flex-col gap-5" aria-busy={pending}>
      {TOPICS.map((t) => (
        <Label key={t.key} className="flex items-start gap-3 text-sm">
          <Checkbox checked={prefs[t.key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [t.key]: v === true }))} className="mt-0.5" />
          <span>
            <span className="block text-ink">{t.label}</span>
            <span className="type-small text-ink-muted">{t.description}</span>
          </span>
        </Label>
      ))}
      <p className="type-small text-ink-subtle">Order and delivery emails are always sent. Every change is recorded with a timestamp, as the DPDP Act requires.</p>
      <Button type="submit" loading={pending} className="self-start">
        Save preferences
      </Button>
    </form>
  );
}
