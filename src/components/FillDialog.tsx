import { useState, type FormEvent } from "react";
import type { Cylinder, FillMethod } from "../domain/types";
import { gasLabel, mixDeviation } from "../domain/rules";
import type { FillInput } from "../store/useFillStore";

const METHODS: FillMethod[] = ["直充压缩空气", "分压法", "连续混合", "膜分离", "预混转注"];

interface Props {
  cylinder: Cylinder;
  onCancel: () => void;
  onConfirm: (input: FillInput) => void;
}

/** 充填完成后的登记：实测氧氦、充填方式、操作员、签收人 */
export function FillDialog({ cylinder, onCancel, onConfirm }: Props) {
  const [actualO2, setActualO2] = useState(String(cylinder.gas.o2));
  const [actualHe, setActualHe] = useState(String(cylinder.gas.he));
  const [finalBar, setFinalBar] = useState(String(cylinder.targetBar));
  const [method, setMethod] = useState<FillMethod>(cylinder.gas.kind === "air" ? "直充压缩空气" : "分压法");
  const [operator, setOperator] = useState("");
  const [signedBy, setSignedBy] = useState(cylinder.customer);
  const [errors, setErrors] = useState<string[]>([]);

  const o2Num = Number(actualO2);
  const heNum = cylinder.gas.kind === "trimix" ? Number(actualHe) : 0;
  const deviation =
    Number.isFinite(o2Num) && Number.isFinite(heNum) ? mixDeviation(cylinder.gas, o2Num, heNum) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!Number.isFinite(o2Num) || o2Num <= 0 || o2Num > 100) errs.push("实测氧含量需在 0–100% 之间");
    if (cylinder.gas.kind === "trimix" && (!Number.isFinite(heNum) || heNum < 0 || heNum > 100)) {
      errs.push("实测氦含量需在 0–100% 之间");
    }
    if (Number.isFinite(o2Num) && Number.isFinite(heNum) && o2Num + heNum > 100) {
      errs.push("氧氦合计不能超过 100%");
    }
    const bar = Number(finalBar);
    if (!Number.isFinite(bar) || bar <= 0 || bar > 350) errs.push("充后压力需在 1–350bar 之间");
    if (!operator.trim()) errs.push("请填写操作员");
    if (!signedBy.trim()) errs.push("请填写签收人");
    setErrors(errs);
    if (errs.length > 0) return;

    onConfirm({
      actualO2: o2Num,
      actualHe: heNum,
      finalBar: bar,
      method,
      operator: operator.trim(),
      signedBy: signedBy.trim(),
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>充填登记 · {cylinder.serial}</h2>
        <div className="summary">
          客户 {cylinder.customer} · 目标 {gasLabel(cylinder.gas)}（O₂ {cylinder.gas.o2}% / He {cylinder.gas.he}%）·
          目标压力 {cylinder.targetBar} bar
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>实测氧含量 O₂ %</span>
            <input type="number" step="0.1" value={actualO2} onChange={(e) => setActualO2(e.target.value)} />
          </label>
          <label>
            <span>实测氦含量 He %</span>
            <input
              type="number"
              step="0.1"
              value={actualHe}
              onChange={(e) => setActualHe(e.target.value)}
              disabled={cylinder.gas.kind !== "trimix"}
            />
          </label>
          <label>
            <span>充后压力 (bar)</span>
            <input type="number" value={finalBar} onChange={(e) => setFinalBar(e.target.value)} />
          </label>
          <label>
            <span>充填方式</span>
            <select value={method} onChange={(e) => setMethod(e.target.value as FillMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>操作员</span>
            <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="充填操作员" />
          </label>
          <label>
            <span>签收人</span>
            <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="客户或代签人" />
          </label>
          {deviation && <div className="warn full">{deviation}</div>}
          {errors.length > 0 && (
            <div className="error-list full">
              <ul>
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="full actions">
            <button type="button" className="ghost" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="primary">
              完成充填并签收
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
