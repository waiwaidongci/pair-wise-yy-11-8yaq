import type { FillRecord } from "../domain/types";
import { gasLabel } from "../domain/rules";
import { fmtTime } from "./format";

/** 今日已充填并签收的记录 */
export function ReceiptsPanel({ fills }: { fills: FillRecord[] }) {
  const sorted = [...fills].sort((a, b) => b.filledAt.localeCompare(a.filledAt));
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>今日签收</p>
          <h2>{fills.length} 单</h2>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="empty">今早还没有完成的充填</div>
      ) : (
        <div className="queue-list">
          {sorted.map((f) => (
            <article key={f.id} className="cyl-card">
              <b className="idx time">{fmtTime(f.filledAt)}</b>
              <div>
                <h3>
                  {f.serial} <span className={`tag tag-${f.gas.kind}`}>{gasLabel(f.gas)}</span>
                </h3>
                <p>
                  实测 O₂ {f.actualO2}%{f.actualHe > 0 ? ` / He ${f.actualHe}%` : ""} · 充至 {f.finalBar} bar ·{" "}
                  {f.method}
                </p>
                <p>
                  客户 {f.customer} · 签收人 {f.signedBy} · 操作员 {f.operator}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
