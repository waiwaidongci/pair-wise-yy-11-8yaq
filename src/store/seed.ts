import type { Cylinder, FillRecord, FillState } from "../domain/types";
import { evaluateCylinder, todayStr } from "../domain/rules";

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

function isoOffset(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 10, 0, 0);
  return d.toISOString();
}

/** 首次启动的演示数据：覆盖队列、待处理区与历史履历三种情形 */
export function seedState(): FillState {
  const base: Array<Omit<Cylinder, "status" | "holdReasons">> = [
    {
      id: "seed-cyl-101",
      serial: "TANK-101",
      volumeL: 12,
      inspectionUntil: dateOffset(400),
      residualBar: 30,
      targetBar: 200,
      customer: "陈教练",
      gas: { kind: "air", o2: 21, he: 0 },
      intakeAt: isoOffset(0, 7),
    },
    {
      id: "seed-cyl-204",
      serial: "TANK-204",
      volumeL: 11,
      inspectionUntil: dateOffset(280),
      residualBar: 55,
      targetBar: 200,
      customer: "林小姐",
      gas: { kind: "nitrox", o2: 32, he: 0 },
      intakeAt: isoOffset(0, 8),
    },
    {
      id: "seed-cyl-318",
      serial: "TANK-318",
      volumeL: 24,
      inspectionUntil: dateOffset(200),
      residualBar: 40,
      targetBar: 200,
      customer: "技潜阿凯",
      gas: { kind: "trimix", o2: 18, he: 45 },
      intakeAt: isoOffset(0, 9),
    },
    {
      id: "seed-cyl-077",
      serial: "TANK-077",
      volumeL: 12,
      inspectionUntil: dateOffset(-10),
      residualBar: 20,
      targetBar: 200,
      customer: "王先生",
      gas: { kind: "air", o2: 21, he: 0 },
      intakeAt: isoOffset(0, 7),
    },
    {
      id: "seed-cyl-156",
      serial: "TANK-156",
      volumeL: 10,
      inspectionUntil: dateOffset(100),
      residualBar: 230,
      targetBar: 200,
      customer: "周女士",
      gas: { kind: "nitrox", o2: 36, he: 0 },
      intakeAt: isoOffset(0, 8),
    },
  ];

  const cylinders: Cylinder[] = base.map((c) => {
    const ev = evaluateCylinder(c);
    return { ...c, status: ev.status, holdReasons: ev.reasons };
  });

  const fills: FillRecord[] = [
    {
      id: "seed-fill-1",
      cylinderId: "hist-101-a",
      serial: "TANK-101",
      customer: "陈教练",
      gas: { kind: "air", o2: 21, he: 0 },
      actualO2: 20.9,
      actualHe: 0,
      finalBar: 205,
      method: "直充压缩空气",
      operator: "老周",
      signedBy: "陈教练",
      filledAt: isoOffset(-4, 10),
    },
    {
      id: "seed-fill-2",
      cylinderId: "hist-101-b",
      serial: "TANK-101",
      customer: "陈教练",
      gas: { kind: "air", o2: 21, he: 0 },
      actualO2: 20.8,
      actualHe: 0,
      finalBar: 202,
      method: "直充压缩空气",
      operator: "老周",
      signedBy: "陈教练",
      filledAt: isoOffset(-1, 9),
    },
    {
      id: "seed-fill-3",
      cylinderId: "hist-090-a",
      serial: "TANK-090",
      customer: "阿May",
      gas: { kind: "nitrox", o2: 32, he: 0 },
      actualO2: 31.8,
      actualHe: 0,
      finalBar: 200,
      method: "膜分离",
      operator: "小赵",
      signedBy: "阿May",
      filledAt: isoOffset(0, 8),
    },
  ];

  return { cylinders, fills };
}
