export function formatRelativeTime(sentAt: number): string {
  const diff = Date.now() - sentAt;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) {
    return "a l'instant";
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `il y a ${min} min`;
  }
  const h = Math.floor(min / 60);
  if (h < 24) {
    return `il y a ${h} h`;
  }
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}
