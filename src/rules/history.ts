import type { FillRecord } from "./types";

export interface BottleHistory {
  serial: string;
  volumeL: number;
  customer: string;
  fills: FillRecord[]; // 时间正序，逐次保留
  total: number;
  lastFillAt?: string;
}

/** 单瓶履历：同一编号的全部充填按时间正序排列（编号统一在收瓶时转大写） */
export function historyForBottle(
  fills: FillRecord[],
  serial: string
): BottleHistory | null {
  const key = serial.trim().toUpperCase();
  const mine = fills
    .filter((f) => f.serial === key)
    .sort((a, b) => a.filledAt.localeCompare(b.filledAt) || a.id.localeCompare(b.id));
  if (!mine.length) return null;
  const last = mine[mine.length - 1];
  return {
    serial: key,
    volumeL: last.volumeL,
    customer: last.customer,
    fills: mine,
    total: mine.length,
    lastFillAt: last.filledAt,
  };
}

/** 全部单瓶履历，按最近充填时间倒序 */
export function allBottleHistories(fills: FillRecord[]): BottleHistory[] {
  const map = new Map<string, FillRecord[]>();
  for (const f of fills) {
    const arr = map.get(f.serial) ?? [];
    arr.push(f);
    map.set(f.serial, arr);
  }
  return [...map.values()]
    .map((arr) => historyForBottle(arr, arr[0].serial)!)
    .sort(
      (a, b) =>
        (b.lastFillAt ?? "").localeCompare(a.lastFillAt ?? "") ||
        a.serial.localeCompare(b.serial)
    );
}
