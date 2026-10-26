export function dueLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  const dow = d.toLocaleDateString(undefined, { weekday: "long" });
  if (days < 0) return `Was due ${dow}`;
  if (days <= 6) return `Due ${dow}`;
  return `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function ago(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const time = (d = new Date()) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const nf = (n: number) => n.toLocaleString();
