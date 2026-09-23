import { useMemo, useState, useSyncExternalStore } from "react";
import { store, type PersistState } from "./archive/store";
import { buildDemoState } from "./archive/demo";
import { buildQueueItems } from "./rules/queue";
import { FILL_STATIONS } from "./rules/constants";
import { fmtPct } from "./pages/ui";
import { IntakePage, recordToForm } from "./pages/IntakePage";
import { QueuePage } from "./pages/QueuePage";
import { PendingPage } from "./pages/PendingPage";
import { HistoryPage } from "./pages/HistoryPage";
import type { IntakeRecord } from "./rules/types";
import type { IntakeFormInput } from "./rules/intake";
import "./styles.css";

type Tab = "intake" | "queue" | "pending" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "intake", label: "收瓶登记" },
  { key: "queue", label: "充填队列" },
  { key: "pending", label: "待处理区" },
  { key: "history", label: "单瓶履历" },
];

function App() {
  const state = useSyncExternalStore<PersistState>(store.subscribe, store.getState);
  const [tab, setTab] = useState<Tab>("intake");
  const [prefill, setPrefill] = useState<{ form: IntakeFormInput; fromId: string } | null>(null);

  const queueItems = useMemo(() => buildQueueItems(state.intakes), [state.intakes]);
  const queued = queueItems.length;
  const onStations = queueItems.filter((q) => q.inStation).length;
  const pendingCount = state.intakes.filter((r) => r.status === "PENDING").length;
  const expiredCount = state.intakes.filter(
    (r) => r.status === "PENDING" && r.reasons.some((x) => x.startsWith("检验有效期已过"))
  ).length;
  const avgO2 = queued
    ? queueItems.reduce((s, q) => s + q.targetO2, 0) / queued
    : 0;

  const reedit = (r: IntakeRecord) => {
    setPrefill({ form: recordToForm(r), fromId: r.id });
    setTab("intake");
  };

  return (
    <main className="app">
      <header className="hero">
        <p>潜水店 · 早晨气瓶充填排程</p>
        <h1>充填工作台</h1>
        <span>
          前台收瓶 → 按氧氦比例自动排队 → 检验过期 / 残压异常留待处理区（不占充填位）→
          完成登记实际氧氦、方式、操作员与签收人，单瓶履历逐次保留。数据保存在本机浏览器，重开后队列与履历对账一致。
        </span>
      </header>

      <section className="metrics">
        <article>
          <small>待充填（在充填位）</small>
          <strong>
            {onStations}
            <em>/{FILL_STATIONS}</em>
          </strong>
        </article>
        <article>
          <small>队列等位</small>
          <strong>{Math.max(queued - FILL_STATIONS, 0)}</strong>
        </article>
        <article>
          <small>待处理区（过期 {expiredCount}）</small>
          <strong className={pendingCount ? "warn-num" : ""}>{pendingCount}</strong>
        </article>
        <article>
          <small>队列平均目标 O₂</small>
          <strong>{queued ? fmtPct(Math.round(avgO2 * 10) / 10) : "—"}</strong>
        </article>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab on" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && <i className="badge">{pendingCount}</i>}
          </button>
        ))}
        <span className="tab-spacer" />
        <button
          className="tab-ghost"
          onClick={() => {
            if (confirm("载入演示数据？将覆盖当前全部数据。")) store.loadDemo(buildDemoState());
          }}
        >
          载入演示数据
        </button>
        <button
          className="tab-ghost danger"
          onClick={() => {
            if (confirm("确认清空全部收瓶、队列与履历数据？此操作不可恢复。")) store.reset();
          }}
        >
          清空数据
        </button>
      </nav>

      {tab === "intake" && (
        <IntakePage
          initialForm={prefill}
          onConsumed={() => setPrefill(null)}
        />
      )}
      {tab === "queue" && <QueuePage intakes={state.intakes} />}
      {tab === "pending" && <PendingPage intakes={state.intakes} onReedit={reedit} />}
      {tab === "history" && <HistoryPage fills={state.fills} />}

      <footer className="footnote">
        规则（src/rules）、存档（src/archive）、页面（src/pages）三层分离；充填履历只增不改，
        重开时以履历为准对账收瓶状态。最近保存：{state.savedAt ? new Date(state.savedAt).toLocaleString() : "—"}
      </footer>
    </main>
  );
}

export default App;
