// "$1,234.50" / "-$10.00"
export function formatMoney(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${amount < 0 ? '-' : ''}$${abs}`;
}

// A date-only "YYYY-MM-DD" (pay periods) as "Fri, Oct 10". Parsed as a LOCAL
// date on purpose: new Date('2025-10-10') is UTC midnight, which shows as
// the previous day anywhere west of UTC.
export function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// "Oct 4 – Oct 10"
export function formatPeriod(start: string, end: string): string {
  const short = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  return `${short(start)} – ${short(end)}`;
}
