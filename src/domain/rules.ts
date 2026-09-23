import type { Cylinder, GasKind, GasPlan } from "./types";

export const PPO2_MAX = 1.4;
export const MIX_TOLERANCE_PCT = 1;

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isToday(iso: string, today = todayStr()): boolean {
  return iso.slice(0, 10) === today;
}

export function daysUntil(dateStr: string, today = todayStr()): number {
  const a = new Date(dateStr + "T00:00:00").getTime();
  const b = new Date(today + "T00:00:00").getTime();
  return Math.round((a - b) / 86400000);
}

export function defaultGas(kind: GasKind): GasPlan {
  if (kind === "air") return { kind, o2: 21, he: 0 };
  if (kind === "nitrox") return { kind, o2: 32, he: 0 };
  return { kind, o2: 18, he: 45 };
}

export function gasLabel(gas: GasPlan): string {
  if (gas.kind === "air") return "空气";
  if (gas.kind === "nitrox") return `高氧 EAN${gas.o2}`;
  return `Trimix ${gas.o2}/${gas.he}`;
}

/** 最大操作深度（米），按 PPO2 上限 1.4 计算 */
export function modMeters(o2Pct: number): number | null {
  if (o2Pct <= 0) return null;
  return Math.round((PPO2_MAX / (o2Pct / 100) - 1) * 10);
}

/** 混合气比例提示，如 “高氧 EAN32 · MOD 34m (PPO₂ 1.4)” */
export function mixHint(gas: GasPlan): string {
  const mod = modMeters(gas.o2);
  return mod === null ? gasLabel(gas) : `${gasLabel(gas)} · MOD ${mod}m (PPO₂ ${PPO2_MAX})`;
}

export interface Evaluation {
  status: "queued" | "holding";
  reasons: string[];
}

/**
 * 入队评估：
 * - 检验过期 → 待处理区，不占充填位
 * - 残压高于目标压力 → 待处理区，并说明需先泄压
 */
export function evaluateCylinder(
  c: Pick<Cylinder, "inspectionUntil" | "residualBar" | "targetBar">,
  today = todayStr()
): Evaluation {
  const reasons: string[] = [];
  if (c.inspectionUntil < today) {
    reasons.push(`检验有效期 ${c.inspectionUntil} 已过，须重新检验后才能充填`);
  }
  if (c.residualBar > c.targetBar) {
    reasons.push(`残压 ${c.residualBar}bar 高于目标压力 ${c.targetBar}bar，需先泄压再排队`);
  }
  return { status: reasons.length > 0 ? "holding" : "queued", reasons };
}

/** 待充填队列排序：氧含量低者优先，其次氦含量低者，再按录入先后（先低氧后高氧，减少交叉污染） */
export function compareQueue(a: Cylinder, b: Cylinder): number {
  return a.gas.o2 - b.gas.o2 || a.gas.he - b.gas.he || a.intakeAt.localeCompare(b.intakeAt);
}

export function sortQueue(list: Cylinder[]): Cylinder[] {
  return [...list].sort(compareQueue);
}

/** 目标配比合法性校验 */
export function validateGas(kind: GasKind, o2: number, he: number): string[] {
  const errors: string[] = [];
  if (kind === "air") return errors;
  if (kind === "nitrox" && (o2 < 22 || o2 > 40)) {
    errors.push("高氧氧含量需在 22%–40% 之间");
  }
  if (kind === "trimix") {
    if (o2 < 10 || o2 > 40) errors.push("Trimix 氧含量需在 10%–40% 之间");
    if (he < 1 || he > 75) errors.push("Trimix 氦含量需在 1%–75% 之间");
  }
  if (Number.isFinite(o2) && Number.isFinite(he) && o2 + he > 100) {
    errors.push("氧氦合计不能超过 100%");
  }
  return errors;
}

/** 实测配比与目标的偏差提示（非阻断，提醒复核分析仪） */
export function mixDeviation(target: GasPlan, actualO2: number, actualHe: number): string | null {
  const dO2 = actualO2 - target.o2;
  const dHe = actualHe - target.he;
  if (Math.abs(dO2) > MIX_TOLERANCE_PCT || Math.abs(dHe) > MIX_TOLERANCE_PCT) {
    return `实测与目标偏差超过 ±${MIX_TOLERANCE_PCT}%（氧 ${fmtDelta(dO2)}%，氦 ${fmtDelta(dHe)}%），请复核分析仪后再签收`;
  }
  return null;
}

function fmtDelta(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return (rounded > 0 ? "+" : "") + rounded;
}
