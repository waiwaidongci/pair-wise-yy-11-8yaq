import type { FillState } from "../domain/types";

const STORAGE_KEY = "hxyfront-62010:divefill:v1";

/** 启动时读取存档；无存档或版本不符返回 null（由调用方决定种子数据） */
export function loadState(): FillState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FillState> & { version?: number };
    if (parsed.version !== 1) return null;
    if (!Array.isArray(parsed.cylinders) || !Array.isArray(parsed.fills)) return null;
    return { cylinders: parsed.cylinders, fills: parsed.fills };
  } catch {
    return null;
  }
}

export function saveState(state: FillState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
  } catch {
    // 存储被禁用或已满时静默失败，页面仍可使用
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
