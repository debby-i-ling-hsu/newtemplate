export const nt = (n: number) => "NT$ " + Number(n || 0).toLocaleString("en-US");

// 2026-07-01 → 07/01
export const md = (iso: string) => (iso ? iso.slice(5).replace("-", "/") : "");

export const SLOTS = ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-20:00"];

export const CITIES = ["台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市"];

export const DISTRICTS = [
  "中區",
  "東區",
  "南區",
  "西區",
  "北區",
  "北屯區",
  "西屯區",
  "南屯區",
  "豐原區",
];

// 取未來 n 天，回傳 { iso, md, weekday }
export function futureDates(n: number): { iso: string; md: string; weekday: string }[] {
  const wd = ["日", "一", "二", "三", "四", "五", "六"];
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      md: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: "週" + wd[d.getDay()],
    });
  }
  return out;
}
