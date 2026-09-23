export type GasKind = "air" | "nitrox" | "trimix";

/** 目标配比：氧/氦含量（%） */
export interface GasPlan {
  kind: GasKind;
  o2: number;
  he: number;
}

export type CylinderStatus = "queued" | "holding" | "filled";

export interface Cylinder {
  id: string;
  serial: string; // 气瓶编号
  volumeL: number; // 容积
  inspectionUntil: string; // 检验有效期 YYYY-MM-DD
  residualBar: number; // 残压
  targetBar: number; // 目标压力
  customer: string; // 客户
  gas: GasPlan;
  intakeAt: string; // 录入时间 ISO
  status: CylinderStatus;
  holdReasons: string[]; // 留在待处理区的原因
}

export type FillMethod = "直充压缩空气" | "分压法" | "连续混合" | "膜分离" | "预混转注";

/** 一次充填的登记记录，追加保存、逐次保留 */
export interface FillRecord {
  id: string;
  cylinderId: string;
  serial: string;
  customer: string;
  gas: GasPlan; // 目标配比
  actualO2: number; // 实测氧含量 %
  actualHe: number; // 实测氦含量 %
  finalBar: number; // 充后压力
  method: FillMethod;
  operator: string; // 操作员
  signedBy: string; // 签收人
  filledAt: string; // ISO
}

export interface FillState {
  cylinders: Cylinder[];
  fills: FillRecord[];
}
