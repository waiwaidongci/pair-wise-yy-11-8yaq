import { useMemo, useState } from "react";
import type { Cylinder, FillRecord } from "../domain/types";
import { gasLabel } from "../domain/rules";
import { fmtDateTime } from "./format";

interface Props {
  cylinders: Cylinder[];
  fills: FillRecord[];
}

/** 单瓶履历：按编号查看逐次充填记录 */
export function HistoryPanel({ cylinders, fills }: Props) {
  const serials = useMemo(() => {
    const seen: string[] = [];
    for (const f of fills) if (!seen.includes(f.serial)) seen.push(f.serial);
    for (const c of cylinders) if (!seen.includes(c.serial)) seen.push(c.serial);
    return seen;
  }, [fills, cylinders]);

  const [selected, setSelected] = useState("");
  const current = selected && serials.includes(selected) ? selected : serials[0];
  const history = fills
    .filter((f) => f.serial === current)
    .sort((a, b) => a.filledAt.localeCompare(b.filledAt));

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>单瓶履历</p>
          <h2>逐次充填记录</h2>
        </div>
        {serials.length > 0 && (
          <select className="serial-select" value={current ?? ""} onChange={(e) => setSelected(e.target.value)}>
            {serials.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>
      {serials.length === 0 ? (
        <div className="empty">还没有任何气瓶记录</div>
      ) : history.length === 0 ? (
        <div className="empty">{current} 暂无充填记录</div>
      ) : (
        <div className="timeline">
          {history.map((f, i) => (
            <article key={f.id}>
              <h4>
                第 {i + 1} 次充填 · {fmtDateTime(f.filledAt)}
              </h4>
              <p>
                目标 {gasLabel(f.gas)} → 实测 O₂ {f.actualO2}%{f.actualHe > 0 ? ` / He ${f.actualHe}%` : ""} · 充至{" "}
                {f.finalBar} bar
              </p>
              <p>
                {f.method} · 操作员 {f.operator} · 签收人 {f.signedBy} · 客户 {f.customer}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
