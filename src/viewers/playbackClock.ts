/** Clock like `1:05` or `1:02:03`. Missing or negative times are `0:00`, not a dash. */
export function formatPlaybackClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const total = Math.floor(seconds);
  const hours = Math.trunc(total / 3600);
  const minutes = Math.trunc((total % 3600) / 60);
  const remainder = total % 60;
  const paddedSeconds = String(remainder).padStart(2, '0');

  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  }

  return `${String(minutes)}:${paddedSeconds}`;
}
