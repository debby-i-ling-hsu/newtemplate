export const nt = (n: number) => "NT$ " + Number(n || 0).toLocaleString("en-US");

export const md = (iso: string) => (iso ? iso.slice(5).replace("-", "/") : "");

export const SLOTS = ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-20:00"];

export function futureDates(n: number): { iso: string; label: string }[] {
  const wd = ["日", "一", "二", "三", "四", "五", "六"];
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: `${d.getMonth() + 1}/${d.getDate()} 週${wd[d.getDay()]}`,
    });
  }
  return out;
}
