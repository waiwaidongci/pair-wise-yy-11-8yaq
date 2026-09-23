import { useState, type FormEvent } from "react";
import type { Cylinder, GasKind } from "../domain/types";
import { defaultGas, gasLabel, validateGas } from "../domain/rules";
import type { IntakeInput } from "../store/useFillStore";

interface Props {
  activeSerials: string[];
  onIntake: (input: IntakeInput) => Cylinder;
}

export function IntakeForm({ activeSerials, onIntake }: Props) {
  const [serial, setSerial] = useState("");
  const [customer, setCustomer] = useState("");
  const [volumeL, setVolumeL] = useState("12");
  const [inspectionUntil, setInspectionUntil] = useState("");
  const [residualBar, setResidualBar] = useState("");
  const [targetBar, setTargetBar] = useState("200");
  const [kind, setKind] = useState<GasKind>("air");
  const [o2, setO2] = useState("21");
  const [he, setHe] = useState("0");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  function changeKind(next: GasKind) {
    setKind(next);
    const g = defaultGas(next);
    setO2(String(g.o2));
    setHe(String(g.he));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];

    const serialTrim = serial.trim().toUpperCase();
    if (!serialTrim) errs.push("请填写气瓶编号");
    else if (activeSerials.includes(serialTrim)) errs.push("该编号气瓶已在队列或待处理区，请勿重复录入");

    const vol = Number(volumeL);
    if (!Number.isFinite(vol) || vol <= 0 || vol > 50) errs.push("容积需为 0–50L 之间的数字");
    if (!inspectionUntil) errs.push("请选择检验有效期");

    const residual = Number(residualBar);
    if (residualBar === "" || !Number.isFinite(residual) || residual < 0 || residual > 350) {
      errs.push("残压需为 0–350bar 之间的数字");
    }
    const target = Number(targetBar);
    if (!Number.isFinite(target) || target <= 0 || target > 350) errs.push("目标压力需为 1–350bar 之间的数字");
    if (!customer.trim()) errs.push("请填写客户姓名");

    const o2Num = kind === "air" ? 21 : Number(o2);
    const heNum = kind === "trimix" ? Number(he) : 0;
    if (kind !== "air" && !Number.isFinite(o2Num)) errs.push("请填写氧含量");
    if (kind === "trimix" && !Number.isFinite(heNum)) errs.push("请填写氦含量");
    errs.push(...validateGas(kind, o2Num, heNum));

    setErrors(errs);
    setNotice("");
    if (errs.length > 0) return;

    const cylinder = onIntake({
      serial: serialTrim,
      volumeL: vol,
      inspectionUntil,
      residualBar: residual,
      targetBar: target,
      customer: customer.trim(),
      gas: { kind, o2: o2Num, he: heNum },
    });

    setNotice(
      cylinder.status === "queued"
        ? `${cylinder.serial} 已排入待充填队列（${gasLabel(cylinder.gas)}）`
        : `${cylinder.serial} 不能排入队列，已放入待处理区：${cylinder.holdReasons.join("；")}`
    );
    setSerial("");
    setCustomer("");
    setResidualBar("");
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>前台录入</p>
          <h2>登记气瓶</h2>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>气瓶编号</span>
          <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="如 TANK-256" />
        </label>
        <label>
          <span>客户</span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="客户姓名" />
        </label>
        <label>
          <span>容积 (L)</span>
          <input type="number" min="0" step="0.5" value={volumeL} onChange={(e) => setVolumeL(e.target.value)} />
        </label>
        <label>
          <span>检验有效期</span>
          <input type="date" value={inspectionUntil} onChange={(e) => setInspectionUntil(e.target.value)} />
        </label>
        <label>
          <span>残压 (bar)</span>
          <input type="number" min="0" value={residualBar} onChange={(e) => setResidualBar(e.target.value)} placeholder="当前瓶内压力" />
        </label>
        <label>
          <span>目标压力 (bar)</span>
          <input type="number" min="1" value={targetBar} onChange={(e) => setTargetBar(e.target.value)} />
        </label>
        <div className="full">
          <span className="field-label">气体类型</span>
          <div className="segmented">
            <button type="button" className={kind === "air" ? "active" : ""} onClick={() => changeKind("air")}>
              空气
            </button>
            <button type="button" className={kind === "nitrox" ? "active" : ""} onClick={() => changeKind("nitrox")}>
              高氧
            </button>
            <button type="button" className={kind === "trimix" ? "active" : ""} onClick={() => changeKind("trimix")}>
              Trimix
            </button>
          </div>
        </div>
        {kind !== "air" && (
          <label>
            <span>氧含量 O₂ %</span>
            <input type="number" min="0" max="100" value={o2} onChange={(e) => setO2(e.target.value)} />
          </label>
        )}
        {kind === "trimix" && (
          <label>
            <span>氦含量 He %</span>
            <input type="number" min="0" max="100" value={he} onChange={(e) => setHe(e.target.value)} />
          </label>
        )}
        {errors.length > 0 && (
          <div className="error-list full">
            <ul>
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {notice && <div className="notice full">{notice}</div>}
        <div className="full">
          <button className="primary block" type="submit">
            登记并评估
          </button>
        </div>
      </form>
    </section>
  );
}
