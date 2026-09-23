import { useEffect, useMemo, useReducer } from "react";
import type { Cylinder, FillMethod, FillRecord, FillState, GasPlan } from "../domain/types";
import { evaluateCylinder, sortQueue } from "../domain/rules";
import { clearState, loadState, saveState } from "./storage";
import { seedState } from "./seed";

type Action =
  | { type: "intake"; cylinder: Cylinder }
  | { type: "completeFill"; cylinderId: string; record: FillRecord }
  | { type: "updateHolding"; cylinderId: string; inspectionUntil: string; residualBar: number }
  | { type: "removeCylinder"; cylinderId: string }
  | { type: "reset"; state: FillState };

function reducer(state: FillState, action: Action): FillState {
  switch (action.type) {
    case "intake":
      return { ...state, cylinders: [...state.cylinders, action.cylinder] };
    case "completeFill":
      return {
        cylinders: state.cylinders.map((c) =>
          c.id === action.cylinderId ? { ...c, status: "filled" as const, holdReasons: [] } : c
        ),
        fills: [...state.fills, action.record],
      };
    case "updateHolding":
      return {
        ...state,
        cylinders: state.cylinders.map((c) => {
          if (c.id !== action.cylinderId) return c;
          const next = { ...c, inspectionUntil: action.inspectionUntil, residualBar: action.residualBar };
          const ev = evaluateCylinder(next);
          return { ...next, status: ev.status, holdReasons: ev.reasons };
        }),
      };
    case "removeCylinder":
      return { ...state, cylinders: state.cylinders.filter((c) => c.id !== action.cylinderId) };
    case "reset":
      return action.state;
    default:
      return state;
  }
}

function init(): FillState {
  return loadState() ?? seedState();
}

export interface IntakeInput {
  serial: string;
  volumeL: number;
  inspectionUntil: string;
  residualBar: number;
  targetBar: number;
  customer: string;
  gas: GasPlan;
}

export interface FillInput {
  actualO2: number;
  actualHe: number;
  finalBar: number;
  method: FillMethod;
  operator: string;
  signedBy: string;
}

export function useFillStore() {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // 任何变更立即落盘，重开页面后队列与履历保持一致
  useEffect(() => {
    saveState(state);
  }, [state]);

  const api = useMemo(
    () => ({
      intake(input: IntakeInput): Cylinder {
        const base = {
          ...input,
          id: crypto.randomUUID(),
          intakeAt: new Date().toISOString(),
        };
        const ev = evaluateCylinder(base);
        const cylinder: Cylinder = { ...base, status: ev.status, holdReasons: ev.reasons };
        dispatch({ type: "intake", cylinder });
        return cylinder;
      },
      completeFill(cylinder: Cylinder, input: FillInput): void {
        const record: FillRecord = {
          id: crypto.randomUUID(),
          cylinderId: cylinder.id,
          serial: cylinder.serial,
          customer: cylinder.customer,
          gas: cylinder.gas,
          ...input,
          filledAt: new Date().toISOString(),
        };
        dispatch({ type: "completeFill", cylinderId: cylinder.id, record });
      },
      updateHolding(cylinderId: string, inspectionUntil: string, residualBar: number): void {
        dispatch({ type: "updateHolding", cylinderId, inspectionUntil, residualBar });
      },
      removeCylinder(cylinderId: string): void {
        dispatch({ type: "removeCylinder", cylinderId });
      },
      resetDemo(): void {
        clearState();
        dispatch({ type: "reset", state: seedState() });
      },
    }),
    []
  );

  const derived = useMemo(() => {
    const queued = sortQueue(state.cylinders.filter((c) => c.status === "queued"));
    const holding = state.cylinders.filter((c) => c.status === "holding");
    return { queued, holding };
  }, [state]);

  return { state, ...derived, ...api };
}
