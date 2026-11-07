/** YYYY-MM-DD in the user's local timezone. */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function daysAgoISO(days: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

/** "Nov 7" or "Nov 7, 2025" when not this year. */
export function formatDate(iso: string, now = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(y !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}
