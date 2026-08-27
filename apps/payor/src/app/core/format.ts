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
