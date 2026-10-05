/**
 * Money helpers. All amounts in the application are integers in paise
 * (ADR-21). Formatting happens only at the UI edge, through this module.
 */

const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format an integer paise amount as an Indian rupee string, e.g. 129900 → "₹1,299". */
export function formatPaise(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`formatPaise expects an integer number of paise, received ${paise}`);
  }
  const rupees = paise / 100;
  return paise % 100 === 0 ? wholeRupees.format(rupees) : withPaise.format(rupees);
}

/** Whole-number percentage saved between a compare-at price and the effective price, or null. */
export function percentOff(compareAtPaise: number, pricePaise: number): number | null {
  if (compareAtPaise <= pricePaise || compareAtPaise <= 0) return null;
  return Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
}
