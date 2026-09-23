import { store } from "../archive/store";
import { daysUntil } from "../rules/dates";
import type { IntakeRecord } from "../rules/types";
import { GasTag, fmtDateTime } from "./ui";

export function PendingPage({
  intakes,
  onReedit,
}: {
  intakes: IntakeRecord[];
  onReedit: (r: IntakeRecord) => void;
}) {
  const pending = intakes
    .filter((r) => r.status === "PENDING")
    .sort((a, b) => a.seq - b.seq);
  const dismissed = intakes
    .filter((r) => r.status === "DISMISSED")
    .sort((a, b) => b.seq - a.seq);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>不占充填位</p>
          <h2>待处理区（{pending.length}）</h2>
        </div>
      </div>

      {pending.length === 0 ? (
        <p className="empty">没有需要处理的瓶子。检验过期或残压异常的瓶子会留在这里并注明原因。</p>
      ) : (
        <div className="pending-list">
          {pending.map((r) => {
            const dLeft = daysUntil(r.inspectionDate);
            return (
              <article key={r.id} className="pending-card">
                <div className="pending-head">
                  <h3>{r.serial}</h3>
                  <GasTag gas={r.gasType} o2={r.targetO2} he={r.targetHe} />
                </div>
                <p className="meta">
                  {r.volumeL} L · {r.customer} · 残压 {r.residualBar} / 目标 {r.targetBar} bar ·
                  检验至 {r.inspectionDate}
                  {dLeft !== null && dLeft < 0 && <b className="bad">（已过期 {-dLeft} 天）</b>}
                </p>
                <ul className="reason-list">
                  {r.reasons.map((reason, i) => (
                    <li key={i}>⛔ {reason}</li>
                  ))}
                </ul>
                <p className="meta">收瓶于 {fmtDateTime(r.createdAt)}</p>
                <div className="form-actions">
                  <button className="primary" onClick={() => onReedit(r)}>
                    修正后重新登记
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确认关闭 ${r.serial}？记录将标记为已处理，不再显示。`))
                        store.dismissIntake(r.id);
                    }}
                  >
                    客户取回 / 关闭
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dismissed.length > 0 && (
        <details className="dismissed">
          <summary>已关闭记录（{dismissed.length}）</summary>
          {dismissed.map((r) => (
            <p key={r.id} className="meta dismissed-line">
              {r.serial} · {r.customer} · {r.reasons.join("；") || "—"}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
