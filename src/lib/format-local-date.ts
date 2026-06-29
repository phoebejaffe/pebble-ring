/** Format an epoch-ms instant in the user's local timezone. */
export function formatLocalDateTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}
