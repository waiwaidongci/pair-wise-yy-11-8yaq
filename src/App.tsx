import { useState } from "react";
import type { Cylinder } from "./domain/types";
import { isToday, todayStr } from "./domain/rules";
import { useFillStore } from "./store/useFillStore";
import { IntakeForm } from "./components/IntakeForm";
import { QueuePanel } from "./components/QueuePanel";
import { HoldingPanel } from "./components/HoldingPanel";
import { FillDialog } from "./components/FillDialog";
import { ReceiptsPanel } from "./components/ReceiptsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import "./styles.css";

function App() {
  const { state, queued, holding, intake, completeFill, updateHolding, removeCylinder, resetDemo } =
    useFillStore();
  const [filling, setFilling] = useState<Cylinder | null>(null);

  const fillsToday = state.fills.filter((f) => isToday(f.filledAt));
  const avgO2 = fillsToday.length
    ? (fillsToday.reduce((s, f) => s + f.actualO2, 0) / fillsToday.length).toFixed(1) + "%"
    : "—";
  const activeSerials = state.cylinders.filter((c) => c.status !== "filled").map((c) => c.serial);

  return (
    <main className="app">
      <header className="hero">
        <div className="hero-top">
          <p>hxyfront-62010 · 潜水店早班充填台</p>
          <button
            className="ghost"
            onClick={() => {
              if (window.confirm("清除本地存档并恢复演示数据？")) resetDemo();
            }}
          >
            重置演示数据
          </button>
        </div>
        <h1>气瓶充填排班</h1>
        <span>
          {todayStr()} · 检验过期或残压高于目标的气瓶留在待处理区，不占充填位；队列按氧含量 → 氦含量 →
          录入先后排序。数据保存在本机，重开页面后队列与履历自动恢复。
        </span>
      </header>

      <section className="metrics">
        <article>
          <small>待充填</small>
          <strong>{queued.length}</strong>
        </article>
        <article>
          <small>待处理区</small>
          <strong>{holding.length}</strong>
        </article>
        <article>
          <small>今日已充填</small>
          <strong>{fillsToday.length}</strong>
        </article>
        <article>
          <small>今日平均氧含量</small>
          <strong>{avgO2}</strong>
        </article>
      </section>

      <section className="workspace">
        <IntakeForm activeSerials={activeSerials} onIntake={intake} />
        <QueuePanel queued={queued} onStartFill={setFilling} onRemove={removeCylinder} />
      </section>

      <HoldingPanel holding={holding} onUpdate={updateHolding} onRemove={removeCylinder} />

      <section className="grid-2">
        <ReceiptsPanel fills={fillsToday} />
        <HistoryPanel cylinders={state.cylinders} fills={state.fills} />
      </section>

      {filling && (
        <FillDialog
          cylinder={filling}
          onCancel={() => setFilling(null)}
          onConfirm={(input) => {
            completeFill(filling, input);
            setFilling(null);
          }}
        />
      )}
    </main>
  );
}

export default App;
