import { DEFAULT_MIX, REASON } from "./constants";
import { isInspectionExpired } from "./dates";
import type { GasType, IntakeDraft } from "./types";

/** 表单原始输入（全部来自文本/数字框，可能为空或非法） */
export interface IntakeFormInput {
  serial: string;
  volumeL: string;
  inspectionDate: string;
  residualBar: string;
  targetBar: string;
  gasType: GasType;
  targetO2: string;
  targetHe: string;
  customer: string;
}

export type FieldErrors = Partial<Record<keyof IntakeFormInput, string>>;

const NUM_BOUNDS = {
  volumeL: { min: 1, max: 200, label: "容积" },
  residualBar: { min: 0, max: 400, label: "残压" },
  targetBar: { min: 1, max: 400, label: "目标压力" },
  targetO2: { min: 0, max: 100, label: "氧含量" },
  targetHe: { min: 0, max: 100, label: "氦含量" },
} as const;

/**
 * 第一层：字段格式/范围校验。不通过由表单提示，不会进入任何区域。
 * AIR 强制 21/0；NITROX 强制 He=0；比例必须在合理范围内且 O2+He<=100。
 */
export function validateIntake(
  raw: IntakeFormInput
): { ok: true; draft: IntakeDraft } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const serial = raw.serial.trim().toUpperCase();
  const customer = raw.customer.trim();

  if (!serial) errors.serial = "请填写气瓶编号";
  else if (!/^[A-Za-z0-9][A-Za-z0-9-_/]{0,30}$/.test(serial))
    errors.serial = "编号限 1–31 位字母数字及 -_/";
  if (!customer) errors.customer = "请填写客户";
  if (!raw.inspectionDate) errors.inspectionDate = "请选择检验有效期";

  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const readBound = (key: keyof typeof NUM_BOUNDS) => {
    const b = NUM_BOUNDS[key];
    const n = num(raw[key]);
    if (Number.isNaN(n) || !Number.isFinite(n)) {
      errors[key] = `${b.label}必须是数字`;
      return NaN;
    }
    if (n < b.min || n > b.max) {
      errors[key] = `${b.label}需在 ${b.min}–${b.max} 之间`;
    }
    return n;
  };

  const volumeL = readBound("volumeL");
  const residualBar = readBound("residualBar");
  const targetBar = readBound("targetBar");
  let targetO2 = readBound("targetO2");
  let targetHe = readBound("targetHe");

  // 各气体类型的比例约束
  if (raw.gasType === "AIR") {
    targetO2 = DEFAULT_MIX.AIR.o2;
    targetHe = DEFAULT_MIX.AIR.he;
  } else if (raw.gasType === "NITROX") {
    if (!Number.isNaN(targetO2) && targetO2 <= 21)
      errors.targetO2 = "高氧需 O2 > 21%（≤21% 请选空气）";
    targetHe = 0;
  } else {
    if (!Number.isNaN(targetHe) && targetHe <= 0)
      errors.targetHe = "Trimix 需含氦 > 0%（否则选高氧/空气）";
    if (!Number.isNaN(targetO2) && targetO2 < 8)
      errors.targetO2 = "Trimix 的 O2 不应低于 8%";
  }
  if (
    !Number.isNaN(targetO2) &&
    !Number.isNaN(targetHe) &&
    targetO2 + targetHe > 100
  ) {
    errors.targetO2 = "O2 + He 不能超过 100%";
  }

  // 残压 >= 目标压力属于合法收瓶但不能排入的业务情况，由 evaluateIntake 判定并说明原因。

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    draft: {
      serial,
      volumeL,
      inspectionDate: raw.inspectionDate,
      residualBar,
      targetBar,
      gasType: raw.gasType,
      targetO2,
      targetHe,
      customer,
    },
  };
}

/**
 * 第二层：排队规则。
 * - 检验过期（有效期当天仍有效）→ 待处理区
 * - 残压高于目标压力 → 待处理区（等于时也没有充填空间，一并拦下）
 * 两条原因可同时存在，全部展示给前台。
 */
export function evaluateIntake(
  draft: IntakeDraft,
  today: string
): { status: "QUEUED" } | { status: "PENDING"; reasons: string[] } {
  const reasons: string[] = [];
  if (isInspectionExpired(draft.inspectionDate, today)) {
    reasons.push(`${REASON.INSPECTION_EXPIRED}（有效期 ${draft.inspectionDate}）`);
  }
  if (draft.residualBar >= draft.targetBar) {
    reasons.push(
      `${REASON.RESIDUAL_OVER_TARGET}（残压 ${draft.residualBar} bar ≥ 目标 ${draft.targetBar} bar）`
    );
  }
  return reasons.length ? { status: "PENDING", reasons } : { status: "QUEUED" };
}
