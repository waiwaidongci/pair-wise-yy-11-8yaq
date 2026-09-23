import { FILL_STATIONS } from "./constants";
import type { IntakeRecord } from "./types";

/**
 * 按目标氧氦比例排好待充填队列：
 * 1. 目标 He 升序（空气/高氧 0% 在前，Trimix 按氦浓度从低到高）
 * 2. 目标 O2 升序（同氦量下空气 → 低氧 → 高氧，贴近充填作业顺序）
 * 3. 收瓶先后（seq）
 */
export function orderQueue(intakes: IntakeRecord[]): IntakeRecord[] {
  return intakes
    .filter((r) => r.status === "QUEUED")
    .sort(
      (a, b) =>
        a.targetHe - b.targetHe || a.targetO2 - b.targetO2 || a.seq - b.seq
    );
}

export interface QueueItem extends IntakeRecord {
  /** 在排序后队列中的位置，1 开始 */
  position: number;
  /** 是否占用充填位 */
  inStation: boolean;
  /** 充填位编号（1..N），未上站为 null */
  stationNo: number | null;
}

/** 前 FILL_STATIONS 瓶占用充填位；待处理区与已完成瓶不占位 */
export function buildQueueItems(intakes: IntakeRecord[]): QueueItem[] {
  return orderQueue(intakes).map((rec, i) => ({
    ...rec,
    position: i + 1,
    inStation: i < FILL_STATIONS,
    stationNo: i < FILL_STATIONS ? i + 1 : null,
  }));
}
