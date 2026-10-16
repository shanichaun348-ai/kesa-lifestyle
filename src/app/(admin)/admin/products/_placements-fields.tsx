"use client";

import * as React from "react";

import { MAX_LOOK_PRODUCTS } from "@/modules/content/home-look";
import { HOME_RAIL_KEYS, HOME_RAILS, type RailFlags } from "@/modules/content/home-placements";

import type { CategoryOption } from "./_category-options";

export type LookFieldState = {
  /** Whether the product is listed in "Shop the look" right now. */
  inLook: boolean;
  /** The look already has its six pieces (and this one is not among them). */
  full: boolean;
  /** Why the look cannot be edited at all, e.g. the site_content table is missing. */
  unavailable: string | null;
};

type Props = {
  categories: CategoryOption[];
  gender: "women" | "men" | "unisex";
  /** The main category chosen above; it is always included and not offered again here. */
  primaryPath: string;
  initialExtraPaths: readonly string[];
  initialRails: RailFlags;
  /** `null` on the create form: the piece is a draft until it is published, so it cannot be in the look yet. */
  look: LookFieldState | null;
  /** The form's current Visibility choice; the look only accepts published pieces. */
  status: "draft" | "active";
  disabled: boolean;
};

const SECTION = "rounded-md border border-line bg-surface p-5 space-y-5";
const SECTION_TITLE = "text-sm font-medium text-ink";
const GROUP_TITLE = "text-xs font-medium uppercase tracking-wider text-ink-subtle";
const HINT = "text-xs text-ink-subtle";
const CHECK = "size-4 shrink-0 cursor-pointer rounded-[3px] border-line-strong bg-surface accent-brand disabled:cursor-not-allowed";
const ROW = "flex items-start gap-2.5 text-sm text-ink has-[:disabled]:opacity-50";

/**
 * "Where this product shows": the extra categories it is listed under and
 * the homepage spots it is pinned to. The values go to the server as plain
 * form fields (`categoryPaths`, `homeRail`, `showInLook`) and are read by
 * `readPlacements` and the look membership step of the product actions.
 */
export function PlacementsFields({ categories, gender, primaryPath, initialExtraPaths, initialRails, look, status, disabled }: Props) {
  const [extra, setExtra] = React.useState<string[]>(() => [...initialExtraPaths]);
  const [rails, setRails] = React.useState<RailFlags>(initialRails);
  const [showInLook, setShowInLook] = React.useState(look?.inLook ?? false);

  const options = (gender === "unisex" ? categories : categories.filter((c) => c.gender === gender)).filter((c) => c.path !== primaryPath);
  const chosen = extra.filter((p) => options.some((o) => o.path === p));
  const toggleExtra = (path: string, on: boolean) => setExtra((prev) => (on ? [...new Set([...prev, path])] : prev.filter((p) => p !== path)));

  const lookDisabled = disabled || look === null || look.unavailable !== null || (look.full && !look.inLook) || (status !== "active" && !look.inLook);
  const lookHint = (() => {
    if (look === null) return "Available once the product is published (on the next screen).";
    if (look.unavailable) return look.unavailable;
    if (look.full && !look.inLook) return `The look already has ${MAX_LOOK_PRODUCTS} pieces — remove one under Content → Homepage to make room.`;
    if (status !== "active" && !look.inLook) return "Only published pieces can be shown here. Set Visibility to Published (or click Publish), save, then tick this box.";
    return "Listed beside the photo in the Shop the look section. Reorder the pieces under Content → Homepage.";
  })();

  return (
    <section className={SECTION}>
      <div>
        <h2 className={SECTION_TITLE}>Where this product shows</h2>
        <p className={HINT + " mt-1"}>It always appears on its own page, in search and in its main category. Tick anything else below.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className={GROUP_TITLE}>Also list in these categories</legend>
        {options.length === 0 ? (
          <p className={HINT}>No other categories for this gender.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((c) => {
              const id = `pl-cat-${c.path.replace(/\//g, "-")}`;
              const on = chosen.includes(c.path);
              return (
                <li key={c.path} className={ROW}>
                  <input id={id} type="checkbox" name="categoryPaths" value={c.path} checked={on} onChange={(e) => toggleExtra(c.path, e.target.checked)} disabled={disabled} className={CHECK + " mt-0.5"} />
                  <label htmlFor={id} className="cursor-pointer">{c.label}</label>
                </li>
              );
            })}
          </ul>
        )}
        <p className={HINT}>The main category (chosen above) is where breadcrumbs and “similar pieces” point; extra categories just list the product too.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={GROUP_TITLE}>Homepage</legend>
        <ul className="space-y-2">
          <li className={ROW}>
            <input id="pl-look" type="checkbox" name="showInLook" checked={showInLook} onChange={(e) => setShowInLook(e.target.checked)} disabled={lookDisabled} className={CHECK + " mt-0.5"} />
            <label htmlFor="pl-look" className="cursor-pointer">
              <span className="block">Shop the look</span>
              <span className={HINT}>{lookHint}</span>
            </label>
          </li>
          {HOME_RAIL_KEYS.map((rail) => (
            <li key={rail} className={ROW}>
              <input
                id={`pl-rail-${rail}`}
                type="checkbox"
                name="homeRail"
                value={rail}
                checked={rails[rail]}
                onChange={(e) => setRails((prev) => ({ ...prev, [rail]: e.target.checked }))}
                disabled={disabled}
                className={CHECK + " mt-0.5"}
              />
              <label htmlFor={`pl-rail-${rail}`} className="cursor-pointer">
                <span className="block">{HOME_RAILS[rail].label} row</span>
                <span className={HINT}>{HOME_RAILS[rail].hint} Shown once the product is published.</span>
              </label>
            </li>
          ))}
        </ul>
        <p className={HINT}>Chosen pieces always come first; the rest of the row fills itself with the newest or best-selling pieces. You can also manage both rows together under Content → Homepage. The full New arrivals and Bestsellers pages are not affected.</p>
      </fieldset>
    </section>
  );
}
