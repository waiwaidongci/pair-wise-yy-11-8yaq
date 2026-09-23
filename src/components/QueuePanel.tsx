import type { Cylinder } from "../domain/types";
import { daysUntil, gasLabel, mixHint } from "../domain/rules";
import { fmtTime } from "./format";

interface Props {
  queued: Cylinder[];
  onStartFill: (c: Cylinder) => void;
  onRemove: (id: string) => void;
}

export function QueuePanel({ queued, onStartFill, onRemove }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>待充填队列</p>
          <h2>{queued.length} 只待充</h2>
          <p className="sub">排序：氧含量低 → 氦含量低 → 录入早（先低氧后高氧，减少交叉污染）</p>
        </div>
      </div>
      {queued.length === 0 ? (
        <div className="empty">队列已清空，等待前台录入</div>
      ) : (
        <div className="queue-list">
          {queued.map((c, i) => {
            const days = daysUntil(c.inspectionUntil);
            return (
              <article key={c.id} className="cyl-card">
                <b className="idx">{i + 1}</b>
                <div>
                  <h3>
                    {c.serial} <span className={`tag tag-${c.gas.kind}`}>{gasLabel(c.gas)}</span>
                  </h3>
                  <p>
                    {c.customer} · {c.volumeL}L · 残压 {c.residualBar} → 目标 {c.targetBar} bar
                  </p>
                  <p>{mixHint(c.gas)}</p>
                  <p className={days <= 30 ? "amber" : ""}>
                    检验有效期 {c.inspectionUntil}
                    {days <= 30 ? `（剩余 ${days} 天）` : ""} · 录入 {fmtTime(c.intakeAt)}
                  </p>
                </div>
                <div className="actions">
                  <button className="primary" onClick={() => onStartFill(c)}>
                    开始充填
                  </button>
                  <button className="ghost danger" onClick={() => onRemove(c.id)}>
                    移出
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
