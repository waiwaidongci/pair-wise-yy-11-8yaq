import { GAS_LABEL, METHOD_LABEL } from "../rules/constants";
import type { FillMethod, GasType } from "../rules/types";

export function GasTag({ gas, o2, he }: { gas: GasType; o2: number; he: number }) {
  const cls =
    gas === "AIR" ? "tag tag-air" : gas === "NITROX" ? "tag tag-nitrox" : "tag tag-trimix";
  return (
    <span className={cls}>
      {GAS_LABEL[gas]} · O₂ {fmtPct(o2)}
      {gas === "TRIMIX" ? ` / He ${fmtPct(he)}` : ""}
    </span>
  );
}

export function fmtPct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

export function methodName(m: FillMethod): string {
  return METHOD_LABEL[m];
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

export function fmtDate(s: string): string {
  return s || "—";
}
