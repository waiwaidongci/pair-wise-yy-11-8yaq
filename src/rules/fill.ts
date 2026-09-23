import { ALLOWED_METHODS, GAS_LABEL, METHOD_LABEL } from "./constants";
import type { FillDraft, FillRecord, IntakeRecord } from "./types";

export type FillFieldErrors = Partial<
  Record<"actualO2" | "actualHe" | "finalBar" | "method" | "operator" | "receiver", string>
>;

/** 充填完成登记校验：实际比例、压力范围、方式与气体类型匹配、人员齐全 */
export function validateFill(
  input: {
    actualO2: string;
    actualHe: string;
    finalBar: string;
    method: string;
    operator: string;
    receiver: string;
    note?: string;
  },
  intake: IntakeRecord
): { ok: true; draft: Omit<FillDraft, "intakeId"> } | { ok: false; errors: FillFieldErrors } {
  const errors: FillFieldErrors = {};
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const actualO2 = num(input.actualO2);
  const actualHe = num(input.actualHe);
  const finalBar = num(input.finalBar);

  if (Number.isNaN(actualO2) || actualO2 < 0 || actualO2 > 100)
    errors.actualO2 = "实际 O2 需在 0–100% 之间";
  if (Number.isNaN(actualHe) || actualHe < 0 || actualHe > 100)
    errors.actualHe = "实际 He 需在 0–100% 之间";
  if (!Number.isNaN(actualO2) && !Number.isNaN(actualHe) && actualO2 + actualHe > 100)
    errors.actualO2 = "O2 + He 不能超过 100%";

  if (Number.isNaN(finalBar) || finalBar < 0 || finalBar > 400)
    errors.finalBar = "终压需在 0–400 bar 之间";
  else if (finalBar <= intake.residualBar)
    errors.finalBar = `终压需高于残压 ${intake.residualBar} bar`;
  else if (finalBar < intake.targetBar - 10)
    errors.finalBar = `终压低于目标 ${intake.targetBar} bar 超过 10 bar，需说明或重试`;

  const allowed = ALLOWED_METHODS[intake.gasType];
  if (!allowed.includes(input.method as FillDraft["method"])) {
    errors.method = `${GAS_LABEL[intake.gasType]}只能使用：${allowed
      .map((m) => METHOD_LABEL[m])
      .join("、")}`;
  }

  if (!input.operator.trim()) errors.operator = "请填写操作员";
  if (!input.receiver.trim()) errors.receiver = "请填写签收人";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    draft: {
      actualO2,
      actualHe,
      finalBar,
      method: input.method as FillDraft["method"],
      operator: input.operator.trim(),
      receiver: input.receiver.trim(),
      note: input.note?.trim() || undefined,
    },
  };
}

/** 生成不可变充填记录（履历项） */
export function createFillRecord(
  intake: IntakeRecord,
  draft: FillDraft,
  id: string,
  filledAt: string
): FillRecord {
  return {
    id,
    intakeId: intake.id,
    serial: intake.serial,
    volumeL: intake.volumeL,
    customer: intake.customer,
    gasType: intake.gasType,
    targetO2: intake.targetO2,
    targetHe: intake.targetHe,
    targetBar: intake.targetBar,
    residualBar: intake.residualBar,
    actualO2: draft.actualO2,
    actualHe: draft.actualHe,
    finalBar: draft.finalBar,
    method: draft.method,
    operator: draft.operator,
    receiver: draft.receiver,
    note: draft.note,
    filledAt,
  };
}
