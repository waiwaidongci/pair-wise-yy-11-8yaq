import { useState } from "react";
import { ALLOWED_METHODS, FILL_STATIONS, GAS_LABEL, METHOD_LABEL } from "../rules/constants";
import { validateFill, type FillFieldErrors } from "../rules/fill";
import { buildQueueItems } from "../rules/queue";
import { store } from "../archive/store";
import type { FillMethod, IntakeRecord } from "../rules/types";
import { GasTag, fmtDateTime } from "./ui";

const LAST_OPERATOR_KEY = "diveshop.lastOperator";

function FillForm({ intake, onDone }: { intake: IntakeRecord; onDone: () => void }) {
  const [v, setV] = useState({
    actualO2: String(intake.targetO2),
    actualHe: String(intake.targetHe),
    finalBar: String(intake.targetBar),
    method: ALLOWED_METHODS[intake.gasType][0],
    operator: localStorage.getItem(LAST_OPERATOR_KEY) ?? "",
    receiver: "",
    note: "",
  });
  const [errors, setErrors] = useState<FillFieldErrors>({});

  const submit = () => {
    const parsed = validateFill(v, intake);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    const res = store.registerFill({ intakeId: intake.id, ...parsed.draft });
    if (!res.ok) {
      setErrors({ receiver: res.error });
      return;
    }
    localStorage.setItem(LAST_OPERATOR_KEY, parsed.draft.operator);
    onDone();
  };

  const e = (k: keyof FillFieldErrors) =>
    errors[k] ? <small className="field-error">{errors[k]}</small> : null;

  return (
    <div className="fill-form">
      <div className="fill-row">
        <label>
          <span>实际 O₂ %</span>
          <input
            type="number"
            step="0.1"
            value={v.actualO2}
            onChange={(ev) => setV({ ...v, actualO2: ev.target.value })}
          />
          {e("actualO2")}
        </label>
        <label className={intake.gasType !== "TRIMIX" ? "locked" : ""}>
          <span>实际 He %</span>
          <input
            type="number"
            step="0.1"
            disabled={intake.gasType !== "TRIMIX"}
            value={v.actualHe}
            onChange={(ev) => setV({ ...v, actualHe: ev.target.value })}
          />
          {e("actualHe")}
        </label>
        <label>
          <span>终压 bar</span>
          <input
            type="number"
            value={v.finalBar}
            onChange={(ev) => setV({ ...v, finalBar: ev.target.value })}
          />
          {e("finalBar")}
        </label>
      </div>
      <div className="fill-row">
        <label>
          <span>充填方式</span>
          <select
            value={v.method}
            onChange={(ev) => setV({ ...v, method: ev.target.value as FillMethod })}
          >
            {ALLOWED_METHODS[intake.gasType].map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
          {e("method")}
        </label>
        <label>
          <span>操作员</span>
          <input value={v.operator} onChange={(ev) => setV({ ...v, operator: ev.target.value })} />
          {e("operator")}
        </label>
        <label>
          <span>签收人</span>
          <input value={v.receiver} onChange={(ev) => setV({ ...v, receiver: ev.target.value })} />
          {e("receiver")}
        </label>
      </div>
      <label className="note-label">
        <span>备注（可选）</span>
        <input value={v.note} onChange={(ev) => setV({ ...v, note: ev.target.value })} />
      </label>
      <div className="form-actions">
        <button className="primary" onClick={submit}>
          登记充填并签收
        </button>
        <button onClick={onDone}>取消</button>
      </div>
    </div>
  );
}

export function QueuePage({ intakes }: { intakes: IntakeRecord[] }) {
  const items = buildQueueItems(intakes);
  const [openId, setOpenId] = useState<string | null>(null);
  const waiting = items.length - FILL_STATIONS;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>按 O₂/He 比例自动排序</p>
          <h2>待充填队列</h2>
        </div>
        <div className="station-summary">
          充填位 <b>{Math.min(items.length, FILL_STATIONS)}/{FILL_STATIONS}</b>
          {waiting > 0 && <span className="waiting">· {waiting} 瓶等位</span>}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="empty">队列中暂无气瓶。完成一瓶后，后面的瓶子会自动顶上充填位。</p>
      ) : (
        <div className="queue-list">
          {items.map((it) => (
            <article
              key={it.id}
              className={it.inStation ? "queue-card on-station" : "queue-card waiting-card"}
            >
              <div className="queue-main">
                <div className="queue-pos">
                  <span className="pos-no">{it.position}</span>
                  {it.stationNo ? (
                    <span className="station-no">充填位 {it.stationNo}</span>
                  ) : (
                    <span className="station-wait">等位中</span>
                  )}
                </div>
                <div className="queue-info">
                  <h3>{it.serial}</h3>
                  <p className="meta">
                    {it.volumeL} L · {it.customer} · 收瓶 {fmtDateTime(it.createdAt)}
                  </p>
                  <p className="meta">
                    残压 {it.residualBar} → 目标 {it.targetBar} bar
                  </p>
                </div>
                <div className="queue-side">
                  <GasTag gas={it.gasType} o2={it.targetO2} he={it.targetHe} />
                  <small>检验至 {it.inspectionDate}</small>
                  {it.inStation && (
                    <button
                      className={openId === it.id ? "link-btn open" : "link-btn"}
                      onClick={() => setOpenId(openId === it.id ? null : it.id)}
                    >
                      {openId === it.id ? "收起" : "充填完成登记"}
                    </button>
                  )}
                </div>
              </div>
              {openId === it.id && <FillForm intake={it} onDone={() => setOpenId(null)} />}
            </article>
          ))}
        </div>
      )}

      <p className="rule-note">
        排序规则：目标 He 升序 → 目标 O₂ 升序 → 收瓶先后；只有排在前 {FILL_STATIONS} 位的瓶子占用充填位，
        {GAS_LABEL.AIR}与待处理区瓶子均不占位。
      </p>
    </section>
  );
}
