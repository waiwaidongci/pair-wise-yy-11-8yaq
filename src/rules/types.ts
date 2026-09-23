// 领域模型类型：气瓶收瓶登记、充填登记

export type GasType = "AIR" | "NITROX" | "TRIMIX";

export type FillMethod =
  | "AIR_TOP" // 空气直充
  | "PARTIAL_PRESSURE" // 分压充填
  | "BLEND_BANK" // 混气柜充填
  | "BOOSTER"; // 增压机充填

/** 前台收瓶时录入的信息 */
export interface IntakeDraft {
  /** 气瓶编号 */
  serial: string;
  /** 容积（升） */
  volumeL: number;
  /** 检验有效期 YYYY-MM-DD */
  inspectionDate: string;
  /** 残压 bar */
  residualBar: number;
  /** 目标压力 bar */
  targetBar: number;
  /** 气体类型 */
  gasType: GasType;
  /** 目标氧含量 % */
  targetO2: number;
  /** 目标氦含量 % */
  targetHe: number;
  /** 客户 */
  customer: string;
}

export type IntakeStatus = "QUEUED" | "PENDING" | "FILLED" | "DISMISSED";

export interface IntakeRecord extends IntakeDraft {
  id: string;
  /** 全局递增序号，也是同比例下的排队先后依据 */
  seq: number;
  createdAt: string;
  status: IntakeStatus;
  /** 不能排入时的原因（待处理区展示） */
  reasons: string[];
  fillId?: string;
  filledAt?: string;
}

/** 充填完成登记的信息 */
export interface FillDraft {
  intakeId: string;
  actualO2: number; // %
  actualHe: number; // %
  finalBar: number;
  method: FillMethod;
  operator: string;
  receiver: string;
  note?: string;
}

/** 一次充填记录，逐次保留、不再改动，是单瓶履历的唯一数据源 */
export interface FillRecord {
  id: string;
  intakeId: string;
  serial: string;
  volumeL: number;
  customer: string;
  gasType: GasType;
  targetO2: number;
  targetHe: number;
  targetBar: number;
  residualBar: number;
  actualO2: number;
  actualHe: number;
  finalBar: number;
  method: FillMethod;
  operator: string;
  receiver: string;
  note?: string;
  filledAt: string;
}
