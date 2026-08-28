/**
 * Money as the office writes it: the peso sign, thousands separated, two decimals always.
 *
 * One function, because a figure formatted two ways on two screens is a figure a payor cannot reconcile.
 */
export function peso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A date the API sends as an ISO day, written as the office writes it. */
export function officeDate(iso: string): string {
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * A billing period the API sends as "2026-08", written as a month: "August 2026".
 *
 * The payor reads a bill, not a database key. Anything that is not a period is returned untouched rather than guessed at.
 */
export function officeMonth(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return Number.isNaN(date.getTime())
    ? period
    : date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

/** A day written short, for a list of days where the month is already stated above them: "Wed, Aug 26". */
export function officeDayShort(iso: string): string {
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}
