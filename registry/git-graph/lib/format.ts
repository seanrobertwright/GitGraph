export function shortSha(sha: string): string {
  if (sha.length < 7) return sha;
  return sha.slice(0, 7);
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(ts: number | string, now: number = Date.now()): string {
  const parsed = typeof ts === "number" ? ts : Date.parse(ts);
  if (Number.isNaN(parsed)) return "unknown";
  const delta = Math.max(0, now - parsed);
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  if (delta < MONTH) return `${Math.floor(delta / DAY)}d`;
  if (delta < YEAR) return `${Math.floor(delta / MONTH)}mo`;
  return `${Math.floor(delta / YEAR)}y`;
}
