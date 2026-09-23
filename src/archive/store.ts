import { todayStr } from "../rules/dates";
import { evaluateIntake } from "../rules/intake";
import { createFillRecord } from "../rules/fill";
import type {
  FillDraft,
  FillRecord,
  IntakeDraft,
  IntakeRecord,
} from "../rules/types";

const STORAGE_KEY = "diveshop.fill-shed.v1";

export interface PersistState {
  version: 1;
  seq: number; // 收瓶自增序号
  fillSeq: number; // 充填自增序号
  intakes: IntakeRecord[];
  fills: FillRecord[];
  savedAt: string;
}

function emptyState(): PersistState {
  return { version: 1, seq: 0, fillSeq: 0, intakes: [], fills: [], savedAt: "" };
}

/**
 * 重开对账：以充填履历（append-only）为准修正收瓶状态，
 * 保证队列和履历永远对得上。
 */
function reconcile(state: PersistState): PersistState {
  const fillById = new Map(state.fills.map((f) => [f.id, f]));
  for (const rec of state.intakes) {
    if (rec.fillId && fillById.has(rec.fillId)) {
      const f = fillById.get(rec.fillId)!;
      rec.status = "FILLED";
      rec.filledAt = f.filledAt;
    } else if (rec.status === "FILLED" && !rec.fillId) {
      rec.status = "QUEUED"; // 无履历支撑的“已完成”退回队列
    }
  }
  return state;
}

function readRaw(): PersistState {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (!txt) return emptyState();
    const parsed = JSON.parse(txt) as PersistState;
    if (parsed.version !== 1 || !Array.isArray(parsed.intakes) || !Array.isArray(parsed.fills)) {
      return emptyState();
    }
    return reconcile({
      version: 1,
      seq: Number(parsed.seq) || 0,
      fillSeq: Number(parsed.fillSeq) || 0,
      intakes: parsed.intakes,
      fills: parsed.fills,
      savedAt: parsed.savedAt ?? "",
    });
  } catch {
    // 存档损坏：不动旧文件，隔离到 backup 后从空开始
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localStorage.setItem(STORAGE_KEY + ".corrupt." + Date.now(), raw);
    return emptyState();
  }
}

// ---- 简单的内存单例 + 订阅 ----
let state: PersistState = readRaw();
const listeners = new Set<() => void>();

function persist() {
  state.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const store = {
  getState(): PersistState {
    return state;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** 收瓶：规则判定通过入队列，否则进待处理区并附原因 */
  addIntake(draft: IntakeDraft, today: string = todayStr()):
    | { ok: true; record: IntakeRecord }
    | { ok: false; error: string } {
    const dup = state.intakes.find(
      (r) => r.serial === draft.serial && r.status === "QUEUED"
    );
    if (dup) {
      return {
        ok: false,
        error: `气瓶 ${draft.serial} 已在充填队列中（排位序号见队列页），请勿重复收瓶`,
      };
    }

    state.seq += 1;
    const decision = evaluateIntake(draft, today);
    const record: IntakeRecord = {
      ...draft,
      id: `IN-${String(state.seq).padStart(4, "0")}`,
      seq: state.seq,
      createdAt: new Date().toISOString(),
      status: decision.status === "QUEUED" ? "QUEUED" : "PENDING",
      reasons: decision.status === "PENDING" ? decision.reasons : [],
    };
    state = { ...state, seq: state.seq, intakes: [...state.intakes, record] };
    persist();
    return { ok: true, record };
  },

  /** 充填登记：仅在队列中且占着充填位的瓶子可登记 */
  registerFill(
    draft: FillDraft,
    now: string = new Date().toISOString()
  ): { ok: true; fill: FillRecord } | { ok: false; error: string } {
    const intake = state.intakes.find((r) => r.id === draft.intakeId);
    if (!intake) return { ok: false, error: "找不到对应的收瓶记录" };
    if (intake.status !== "QUEUED")
      return { ok: false, error: `该瓶当前状态不可登记充填（${intake.status}）` };

    state.fillSeq += 1;
    const fill = createFillRecord(
      intake,
      draft,
      `F-${String(state.fillSeq).padStart(4, "0")}`,
      now
    );
    intake.status = "FILLED";
    intake.fillId = fill.id;
    intake.filledAt = fill.filledAt;
    state = {
      ...state,
      fillSeq: state.fillSeq,
      intakes: [...state.intakes],
      fills: [...state.fills, fill],
    };
    persist();
    return { ok: true, fill };
  },

  /** 待处理区瓶子确认无法处理/客户取回，移出待处理区（记录保留可查） */
  dismissIntake(id: string): { ok: true } | { ok: false; error: string } {
    const rec = state.intakes.find((r) => r.id === id);
    if (!rec) return { ok: false, error: "记录不存在" };
    if (rec.status !== "PENDING") return { ok: false, error: "仅待处理区记录可关闭" };
    rec.status = "DISMISSED";
    state = { ...state, intakes: [...state.intakes] };
    persist();
    return { ok: true };
  },

  /** 清空全部数据（含本地存档） */
  reset() {
    state = emptyState();
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((l) => l());
  },

  /** 导入演示数据（先清空） */
  loadDemo(next: PersistState) {
    state = reconcile(next);
    persist();
  },
};
