export function formatAge(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;

  const totalMinutes = Math.floor(s / 60);
  const remSeconds = s % 60;
  if (totalMinutes < 60) {
    return remSeconds === 0 ? `${totalMinutes}m` : `${totalMinutes}m${remSeconds}s`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  return `${hours}h${remMinutes}m`;
}
