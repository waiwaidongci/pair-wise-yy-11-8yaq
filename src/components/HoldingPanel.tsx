import { useState } from "react";
import type { Cylinder } from "../domain/types";
import { gasLabel } from "../domain/rules";

interface Props {
  holding: Cylinder[];
  onUpdate: (id: string, inspectionUntil: string, residualBar: number) => void;
  onRemove: (id: string) => void;
}

/** 待处理区：检验过期 / 残压过高的气瓶，处理后重新评估 */
export function HoldingPanel({ holding, onUpdate, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [insp, setInsp] = useState("");
  const [residual, setResidual] = useState("");

  function startEdit(c: Cylinder) {
    setEditingId(c.id);
    setInsp(c.inspectionUntil);
    setResidual(String(c.residualBar));
  }

  function save(id: string) {
    const r = Number(residual);
    if (!insp || !Number.isFinite(r) || r < 0 || r > 350) return;
    onUpdate(id, insp, r);
    setEditingId(null);
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>待处理区</p>
          <h2>{holding.length} 只暂不能充</h2>
          <p className="sub">检验过期或残压高于目标的气瓶留在这里，不占充填位；更新检验期或泄压后自动重新排队</p>
        </div>
      </div>
      {holding.length === 0 ? (
        <div className="empty">待处理区为空</div>
      ) : (
        <div className="queue-list">
          {holding.map((c) => (
            <article key={c.id} className="cyl-card holding-card">
              <b className="idx hold">!</b>
              <div>
                <h3>
                  {c.serial} <span className={`tag tag-${c.gas.kind}`}>{gasLabel(c.gas)}</span>
                </h3>
                <p>
                  {c.customer} · {c.volumeL}L · 残压 {c.residualBar} → 目标 {c.targetBar} bar
                </p>
                {c.holdReasons.map((r) => (
                  <p key={r} className="reason">
                    {r}
                  </p>
                ))}
                {editingId === c.id && (
                  <div className="edit-row">
                    <label>
                      <span>检验有效期</span>
                      <input type="date" value={insp} onChange={(e) => setInsp(e.target.value)} />
                    </label>
                    <label>
                      <span>残压 (bar)</span>
                      <input type="number" min="0" value={residual} onChange={(e) => setResidual(e.target.value)} />
                    </label>
                    <button className="primary" onClick={() => save(c.id)}>
                      保存并重新评估
                    </button>
                    <button className="ghost" onClick={() => setEditingId(null)}>
                      取消
                    </button>
                  </div>
                )}
              </div>
              <div className="actions">
                {editingId !== c.id && (
                  <button onClick={() => startEdit(c)}>处理（检验/泄压）</button>
                )}
                <button className="ghost danger" onClick={() => onRemove(c.id)}>
                  移出登记
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
