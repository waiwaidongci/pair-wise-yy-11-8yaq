import { useMemo, useState } from "react";
import { allBottleHistories, historyForBottle } from "../rules/history";
import type { FillRecord } from "../rules/types";
import { GasTag, fmtDateTime, methodName } from "./ui";

export function HistoryPage({ fills }: { fills: FillRecord[] }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");

  const bottles = useMemo(() => allBottleHistories(fills), [fills]);
  const result = searched ? historyForBottle(fills, searched) : null;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>逐次保留 · 不可删改</p>
          <h2>单瓶履历</h2>
        </div>
      </div>

      <form
        className="history-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(query.trim().toUpperCase());
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入气瓶编号查询，如 TANK-204"
        />
        <button className="primary" type="submit">
          查询
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setSearched("");
          }}
        >
          全部瓶子
        </button>
      </form>

      {searched && !result && <p className="empty">没有找到编号 {searched} 的充填履历。</p>}

      {result && (
        <div className="history-result">
          <h3>
            {result.serial}
            <span className="muted">
              {" "}
              · {result.volumeL} L · {result.customer} · 共 {result.total} 次 · 最近{" "}
              {result.lastFillAt ? fmtDateTime(result.lastFillAt) : "—"}
            </span>
          </h3>
          <ol className="fill-timeline">
            {result.fills.map((f, i) => (
              <li key={f.id}>
                <div className="timeline-no">第 {i + 1} 次</div>
                <FillDetail f={f} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {!searched &&
        (bottles.length === 0 ? (
          <p className="empty">尚无已完成的充填记录。</p>
        ) : (
          <div className="bottle-grid">
            {bottles.map((b) => (
              <article key={b.serial} className="bottle-card" onClick={() => setSearched(b.serial)}>
                <h3>{b.serial}</h3>
                <p className="meta">{b.customer}</p>
                <p className="meta">
                  <b>{b.total}</b> 次充填 · 最近 {b.lastFillAt ? fmtDateTime(b.lastFillAt) : "—"}
                </p>
                <div className="bottle-last">
                  <GasTag gas={b.fills[b.fills.length - 1].gasType}
                    o2={b.fills[b.fills.length - 1].actualO2}
                    he={b.fills[b.fills.length - 1].actualHe} />
                </div>
              </article>
            ))}
          </div>
        ))}
    </section>
  );
}

function FillDetail({ f }: { f: FillRecord }) {
  return (
    <div className="fill-detail">
      <p className="meta">
        {fmtDateTime(f.filledAt)} · {methodName(f.method)}
      </p>
      <div className="fill-kv">
        <span>
          目标 <GasTag gas={f.gasType} o2={f.targetO2} he={f.targetHe} />
        </span>
        <span>
          实测 O₂ <b>{f.actualO2}%</b>{f.gasType === "TRIMIX" && <> / He <b>{f.actualHe}%</b></>}
        </span>
        <span>
          {f.residualBar} → <b>{f.finalBar}</b> bar（目标 {f.targetBar}）
        </span>
        <span>
          操作员 <b>{f.operator}</b>
        </span>
        <span>
          签收人 <b>{f.receiver}</b>
        </span>
      </div>
      {f.note && <p className="meta">备注：{f.note}</p>}
    </div>
  );
}
