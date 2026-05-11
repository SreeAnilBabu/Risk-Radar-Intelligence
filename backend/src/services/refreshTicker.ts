const REFRESH_INTERVAL_MS = 15_000;

export function getRefreshTimestamp(now = new Date()): string {
  const roundedMs = Math.floor(now.getTime() / REFRESH_INTERVAL_MS) * REFRESH_INTERVAL_MS;
  return new Date(roundedMs).toISOString();
}

export function getRefreshIntervalMs(): number {
  return REFRESH_INTERVAL_MS;
}
