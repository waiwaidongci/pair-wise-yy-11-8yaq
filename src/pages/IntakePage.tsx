import { useMemo, useState } from "react";
import { DEFAULT_MIX, GAS_LABEL } from "../rules/constants";
import { validateIntake, type IntakeFormInput } from "../rules/intake";
import { store } from "../archive/store";
import type { GasType, IntakeRecord } from "../rules/types";
import { daysUntil } from "../rules/dates";
import { GasTag } from "./ui";

const EMPTY_FORM: IntakeFormInput = {
  serial: "",
  volumeL: "12",
  inspectionDate: "",
  residualBar: "50",
  targetBar: "200",
  gasType: "AIR",
  targetO2: String(DEFAULT_MIX.AIR.o2),
  targetHe: String(DEFAULT_MIX.AIR.he),
  customer: "",
};

export function recordToForm(r: IntakeRecord): IntakeFormInput {
  return {
    serial: r.serial,
    volumeL: String(r.volumeL),
    inspectionDate: r.inspectionDate,
    residualBar: String(r.residualBar),
    targetBar: String(r.targetBar),
    gasType: r.gasType,
    targetO2: String(r.targetO2),
    targetHe: String(r.targetHe),
    customer: r.customer,
  };
}

export function IntakePage({
  initialForm,
  onConsumed,
}: {
  initialForm?: { form: IntakeFormInput; fromId: string } | null;
  onConsumed: () => void;
}) {  const [form, setForm] = useState<IntakeFormInput>(initialForm?.form ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeFormInput, string>>>({});
  const [flash, setFlash] = useState<{ kind: "queued" | "pending"; text: string } | null>(
    null
  );

  if (initialForm && form !== initialForm.form) {
    setForm(initialForm.form);
    setErrors({});
    setFlash(null);
    onConsumed();
  }

  const set = <K extends keyof IntakeFormInput>(key: K, value: IntakeFormInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const switchGas = (gas: GasType) =>
    setForm((f) => ({
      ...f,
      gasType: gas,
      targetO2: String(DEFAULT_MIX[gas].o2),
      targetHe: String(DEFAULT_MIX[gas].he),
    }));

  const inspectionHint = useMemo(() => {
    if (!form.inspectionDate) return null;
    const d = daysUntil(form.inspectionDate);
    if (d === null) return null;
    if (d < 0) return { text: `检验已过期 ${-d} 天，收瓶后将进入待处理区`, cls: "hint-bad" };
    if (d <= 30) return { text: `检验有效期仅剩 ${d} 天`, cls: "hint-warn" };
    return { text: `检验有效，剩余 ${d} 天`, cls: "hint-ok" };
  }, [form.inspectionDate]);

  const submit = () => {
    setFlash(null);
    const parsed = validateIntake(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    const res = store.addIntake(parsed.draft);
    if (!res.ok) {
      setErrors({ serial: res.error });
      return;
    }
    // 由待处理区“修正后重新登记”而来：新记录已收，旧的异常记录自动关闭
    if (initialForm?.fromId) store.dismissIntake(initialForm.fromId);
    if (res.record.status === "QUEUED") {
      setFlash({
        kind: "queued",
        text: `${res.record.serial} 已排入待充填队列（${GAS_LABEL[res.record.gasType]} O₂ ${res.record.targetO2}%${
          res.record.gasType === "TRIMIX" ? ` / He ${res.record.targetHe}%` : ""
        }）`,
      });
    } else {
      setFlash({
        kind: "pending",
        text: `${res.record.serial} 进入待处理区：${res.record.reasons.join("；")}`,
      });
    }
    setForm((f) => ({ ...EMPTY_FORM, inspectionDate: "", gasType: f.gasType }));
  };

  const err = (k: keyof IntakeFormInput) =>
    errors[k] ? <small className="field-error">{errors[k]}</small> : null;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>早晨收瓶台</p>
          <h2>气瓶登记</h2>
        </div>
        <GasTag gas={form.gasType} o2={Number(form.targetO2) || 0} he={Number(form.targetHe) || 0} />
      </div>

      <div className="gas-switch">
        {(Object.keys(GAS_LABEL) as GasType[]).map((g) => (
          <button
            key={g}
            type="button"
            className={form.gasType === g ? "gas-btn on" : "gas-btn"}
            onClick={() => switchGas(g)}
          >
            {GAS_LABEL[g]}
          </button>
        ))}
      </div>

      <div className="field-grid">
        <label>
          <span>气瓶编号 *</span>
          <input value={form.serial} onChange={(e) => set("serial", e.target.value)} placeholder="如 TANK-204" />
          {err("serial")}
        </label>
        <label>
          <span>客户 *</span>
          <input value={form.customer} onChange={(e) => set("customer", e.target.value)} placeholder="客户/潜店名" />
          {err("customer")}
        </label>
        <label>
          <span>容积（升）*</span>
          <input type="number" step="0.1" value={form.volumeL} onChange={(e) => set("volumeL", e.target.value)} />
          {err("volumeL")}
        </label>
        <label>
          <span>检验有效期 *</span>
          <input type="date" value={form.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} />
          {err("inspectionDate")}
          {inspectionHint && <small className={inspectionHint.cls}>{inspectionHint.text}</small>}
        </label>
        <label>
          <span>残压（bar）*</span>
          <input type="number" value={form.residualBar} onChange={(e) => set("residualBar", e.target.value)} />
          {err("residualBar")}
        </label>
        <label>
          <span>目标压力（bar）*</span>
          <input type="number" value={form.targetBar} onChange={(e) => set("targetBar", e.target.value)} />
          {err("targetBar")}
        </label>
        <label className={form.gasType === "AIR" ? "locked" : ""}>
          <span>目标 O₂（%）{form.gasType === "AIR" && "·空气固定 21"}</span>
          <input
            type="number"
            step="0.1"
            disabled={form.gasType === "AIR"}
            value={form.targetO2}
            onChange={(e) => set("targetO2", e.target.value)}
          />
          {err("targetO2")}
        </label>
        <label className={form.gasType !== "TRIMIX" ? "locked" : ""}>
          <span>
            目标 He（%）{form.gasType === "AIR" ? "·空气固定 0" : form.gasType === "NITROX" ? "·高氧固定 0" : ""}
          </span>
          <input
            type="number"
            step="0.1"
            disabled={form.gasType !== "TRIMIX"}
            value={form.targetHe}
            onChange={(e) => set("targetHe", e.target.value)}
          />
          {err("targetHe")}
        </label>
      </div>

      <div className="form-actions">
        <button className="primary" onClick={submit}>
          收瓶并排程
        </button>
        <button onClick={() => { setForm(EMPTY_FORM); setErrors({}); setFlash(null); }}>
          清空
        </button>
      </div>

      {flash && (
        <div className={flash.kind === "queued" ? "flash flash-ok" : "flash flash-warn"}>
          {flash.kind === "queued" ? "✓ " : "⚠ "}
          {flash.text}
        </div>
      )}
    </section>
  );
}
