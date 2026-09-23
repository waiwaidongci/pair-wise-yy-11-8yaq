// 纯 Node 验证：把 src 编译到 dist-test 后运行本脚本的逻辑（见 package test:rules）
const assert = require("assert");
const { validateIntake, evaluateIntake } = require("../dist-test/rules/intake.js");
const { buildQueueItems } = require("../dist-test/rules/queue.js");
const { validateFill, createFillRecord } = require("../dist-test/rules/fill.js");
const { historyForBottle } = require("../dist-test/rules/history.js");
const { todayStr } = require("../dist-test/rules/dates.js");

const today = todayStr();
const future = (d) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return todayStr(x);
};

let failures = 0;
const ok = (name, cond) => {
  if (cond) console.log("  ✓", name);
  else {
    failures++;
    console.error("  ✗", name);
  }
};

function intake(over) {
  return {
    serial: "T-1",
    volumeL: "12",
    inspectionDate: future(30),
    residualBar: "50",
    targetBar: "200",
    gasType: "AIR",
    targetO2: "21",
    targetHe: "0",
    customer: "客",
    ...over,
  };
}

// 1. 正常空气瓶入队
let p = validateIntake(intake({}));
ok("空气瓶字段校验通过", p.ok && p.draft.targetO2 === 21 && p.draft.targetHe === 0);
let e = evaluateIntake(p.draft, today);
ok("有效检验且残压低 → 入队", e.status === "QUEUED");

// 2. 检验过期 → 待处理且注明原因
p = validateIntake(intake({ serial: "T-2", inspectionDate: future(-1) }));
e = evaluateIntake(p.draft, today);
ok("过期瓶 → 待处理区", e.status === "PENDING" && /检验有效期已过/.test(e.reasons[0]));

// 3. 检验有效期当天仍有效
p = validateIntake(intake({ serial: "T-3", inspectionDate: today }));
e = evaluateIntake(p.draft, today);
ok("检验有效期当天不算过期", e.status === "QUEUED");

// 4. 残压高于/等于目标 → 待处理，且两条原因可并存
p = validateIntake(intake({ serial: "T-4", residualBar: "205", targetBar: "200" }));
e = evaluateIntake(p.draft, today);
ok("残压高于目标 → 拦下并说明 bar 数值", e.status === "PENDING" && /205 bar ≥ 目标 200 bar/.test(e.reasons[0]));

p = validateIntake(intake({ serial: "T-5", residualBar: "200", targetBar: "200", inspectionDate: future(-2) }));
e = evaluateIntake(p.draft, today);
ok("过期+残压相等两原因并存", e.status === "PENDING" && e.reasons.length === 2);

// 5. 高氧 / Trimix 比例约束
ok(
  "高氧 O2=21 被拒",
  validateIntake(intake({ serial: "T-6", gasType: "NITROX", targetO2: "21", targetHe: "0" })).ok === false
);
ok(
  "高氧 O2=32 通过且 He=0",
  (() => {
    const r = validateIntake(intake({ serial: "T-6", gasType: "NITROX", targetO2: "32", targetHe: "0" }));
    return r.ok && r.draft.targetO2 === 32 && r.draft.targetHe === 0;
  })()
);
ok(
  "Trimix 无氦被拒",
  validateIntake(intake({ serial: "T-7", gasType: "TRIMIX", targetO2: "18", targetHe: "0" })).ok === false
);
ok(
  "O2+He>100 被拒",
  validateIntake(intake({ serial: "T-8", gasType: "TRIMIX", targetO2: "70", targetHe: "40" })).ok === false
);
ok(
  "空气不接受手工比例输入（固定 21/0）",
  (() => {
    const r = validateIntake(intake({ gasType: "AIR", targetO2: "40", targetHe: "5" }));
    return r.ok && r.draft.targetO2 === 21 && r.draft.targetHe === 0;
  })()
);

// 6. 排序：He 升序 → O2 升序 → seq
function rec(seq, gasType, o2, he, status = "QUEUED") {
  return {
    ...intake({ serial: `R-${seq}`, gasType, targetO2: String(o2), targetHe: String(he) }),
    id: `IN-${seq}`,
    seq,
    createdAt: new Date().toISOString(),
    status,
    reasons: [],
  };
}
const air = rec(1, "AIR", 21, 0);
const trimix30 = rec(2, "TRIMIX", 21, 30);
const nitrox36 = rec(3, "NITROX", 36, 0);
const trimix45 = rec(4, "TRIMIX", 18, 45);
const nitrox32 = rec(5, "NITROX", 32, 0);
const pending = rec(6, "AIR", 21, 0, "PENDING");
const items = buildQueueItems([trimix45, nitrox36, air, pending, trimix30, nitrox32]);
const order = items.map((i) => i.serial).join(",");
ok(
  `排序 He→O2→seq（得 ${order}）`,
  order === "R-1,R-5,R-3,R-2,R-4"
);
ok("仅前 4 瓶占用充填位，待处理瓶不占位", items[0].stationNo === 1 && items[3].stationNo === 4 && items[4].stationNo === null);

// 7. 充填登记校验
let f = validateFill(
  { actualO2: "20.9", actualHe: "0", finalBar: "200", method: "AIR_TOP", operator: "赵", receiver: "周", note: "" },
  air
);
ok("空气空气直充登记通过", f.ok);
f = validateFill(
  { actualO2: "21", actualHe: "0", finalBar: "200", method: "PARTIAL_PRESSURE", operator: "赵", receiver: "周", note: "" },
  air
);
ok("空气不允许分压充填", !f.ok && /空气只能使用/.test(f.errors.method));
f = validateFill(
  { actualO2: "18", actualHe: "45", finalBar: "180", method: "PARTIAL_PRESSURE", operator: "", receiver: "", note: "" },
  trimix45
);
ok("操作员/签收人必填，终压低于目标 10bar 以上被拒", !f.ok && f.errors.operator && f.errors.receiver && f.errors.finalBar);

// 8. 履历逐次、按时间正序
const fr1 = createFillRecord(air, { intakeId: air.id, actualO2: 20.9, actualHe: 0, finalBar: 200, method: "AIR_TOP", operator: "赵", receiver: "周" }, "F-1", "2026-09-20T01:00:00.000Z");
const fr2 = createFillRecord(air, { intakeId: air.id, actualO2: 31.8, actualHe: 0, finalBar: 200, method: "PARTIAL_PRESSURE", operator: "赵", receiver: "陈" }, "F-2", "2026-09-22T01:00:00.000Z");
const h = historyForBottle([fr2, fr1], " r-1 ");
ok("单瓶履历按编号归一且时间正序保留 2 次", h && h.serial === "R-1" && h.total === 2 && h.fills[0].id === "F-1" && h.fills[1].id === "F-2");

console.log(failures ? `\n${failures} 条失败` : "\n全部规则验证通过");
process.exit(failures ? 1 : 0);
