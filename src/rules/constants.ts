import type { FillMethod, GasType } from "./types";

/** 充填位数量：只有排入队列的瓶子占用，待处理区不占位 */
export const FILL_STATIONS = 4;

export const GAS_LABEL: Record<GasType, string> = {
  AIR: "空气",
  NITROX: "高氧",
  TRIMIX: "Trimix",
};

export const METHOD_LABEL: Record<FillMethod, string> = {
  AIR_TOP: "空气直充",
  PARTIAL_PRESSURE: "分压充填",
  BLEND_BANK: "混气柜充填",
  BOOSTER: "增压机充填",
};

/** 各气体类型的默认目标比例（%），AIR 固定 21/0 */
export const DEFAULT_MIX: Record<GasType, { o2: number; he: number }> = {
  AIR: { o2: 21, he: 0 },
  NITROX: { o2: 32, he: 0 },
  TRIMIX: { o2: 18, he: 45 },
};

/** 各气体允许的充填方式 */
export const ALLOWED_METHODS: Record<GasType, FillMethod[]> = {
  AIR: ["AIR_TOP", "BOOSTER"],
  NITROX: ["PARTIAL_PRESSURE", "BLEND_BANK", "BOOSTER"],
  TRIMIX: ["PARTIAL_PRESSURE", "BLEND_BANK", "BOOSTER"],
};

export const REASON = {
  INSPECTION_EXPIRED: "检验有效期已过",
  RESIDUAL_OVER_TARGET: "残压高于目标压力，无需充填",
} as const;
