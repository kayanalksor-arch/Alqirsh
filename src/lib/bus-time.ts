const cairoClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function utcPartsAt(date: Date) {
  const parts = Object.fromEntries(cairoClock.formatToParts(date).map(({ type, value }) => [type, value]));
  return [Number(parts.year), Number(parts.month), Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)] as const;
}

export function cairoLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const [ly, lm, ld, lh, lmin, ls] = utcPartsAt(new Date(guess));
  const offset = Date.UTC(ly, lm - 1, ld, lh, lmin, ls) - guess;
  const result = new Date(guess - offset);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function cairoDateRange(value: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const [, ys, ms, ds] = match;
  const dayStart = Date.UTC(Number(ys), Number(ms) - 1, Number(ds));
  const next = new Date(dayStart + 24 * 60 * 60 * 1000);
  const format = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T00:00`;
  const start = cairoLocalDateTime(format(new Date(dayStart)));
  const end = cairoLocalDateTime(format(next));
  return start && end ? { start, end } : null;
}
