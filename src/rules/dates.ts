// 日期统一按本地日历日处理，避免 toISOString 的 UTC 偏移导致“提前一天过期”

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 解析 YYYY-MM-DD 为本地零点；非法返回 null */
export function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

/** 检验有效期当天仍有效，早于今天才算过期 */
export function isInspectionExpired(dateStr: string, today: string = todayStr()): boolean {
  if (!parseDate(dateStr)) return true;
  return dateStr < today;
}

export function daysUntil(dateStr: string, today: string = todayStr()): number | null {
  const d = parseDate(dateStr);
  const t = parseDate(today);
  if (!d || !t) return null;
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
