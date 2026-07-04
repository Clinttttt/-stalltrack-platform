// Shared formatting helpers for the admin console.
// Faithful port of the React apps/admin/src/lib/format.js.

export function fmtDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(
    'en-US',
    withTime
      ? { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' },
  );
}

export function fmtLog(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function peso(n: number): string {
  if (typeof n !== 'number') return n;
  return `₱${n.toLocaleString('en-PH')}`;
}
