const test = require("node:test");
const assert = require("node:assert");
const B = require("../site/static/js/bang-luong.js");
const L = require("../site/static/js/luong.js");

test("simple full month matches the gross-net engine", () => {
  const r = B.row({ name: "A", base: 20e6, deps: 1 }, { stdDays: 26, region: 1 });
  const g = L.fromGross(20e6, { dependents: 1, region: 1 });
  assert.strictEqual(r.gross, 20e6);
  assert.strictEqual(r.insTotal, g.insurance.total);
  assert.strictEqual(r.tax, g.tax);
  assert.strictEqual(r.net, g.net);
  assert.strictEqual(r.company, g.company.total);
  assert.strictEqual(r.union, 400000);
});

test("partial month, overtime exempt part, non-taxable allowance, deductions", () => {
  const r = B.row({ base: 10.4e6, insBase: 8e6, days: 24, allowFree: 730000, otDay: 10, otRest: 8, otHol: 0, bonus: 1e6, deduct: 500000 }, { stdDays: 26, region: 1 });
  assert.strictEqual(r.worked, 9600000);
  assert.strictEqual(r.ot, 50000 * (15 + 16));             // 50.000 đ/giờ
  assert.strictEqual(r.otFree, 50000 * (5 + 8));
  assert.strictEqual(r.gross, 9600000 + 730000 + 1550000 + 1e6);
  assert.strictEqual(r.insTotal, 8e6 * 0.105);
  assert.strictEqual(r.taxable, 0);                         // dưới mức giảm trừ 15,5 triệu
  assert.strictEqual(r.net, r.gross - r.insTotal - 500000);
});

test("insurance caps and no-insurance rows", () => {
  const r = B.row({ base: 100e6 }, { stdDays: 26, region: 2 });
  assert.strictEqual(r.bhxh, Math.round(20 * 2530000 * 0.08));
  assert.strictEqual(r.bhtn, Math.round(20 * 4730000 * 0.01));
  const z = B.row({ base: 6e6, insBase: 0 }, { stdDays: 26, region: 1, union: false });
  assert.strictEqual(z.insTotal, 0); assert.strictEqual(z.union, 0);
});

test("paste parsing: Vietnamese and English number formats, header row skipped", () => {
  const rows = B.parsePaste("Họ tên\tLương\nNguyễn Văn A\t12.000.000\t\t25\nTran B\t9,500,000\t8000000\t26\t\t\t1,5\n");
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].base, 12e6); assert.strictEqual(rows[0].insBase, ""); assert.strictEqual(rows[0].days, 25);
  assert.strictEqual(rows[1].base, 9.5e6); assert.strictEqual(rows[1].otDay, 1.5);
});

test("xlsx parts are well-formed and carry formulas", () => {
  const parts = B.xlsx([{ name: "A & B <test>", base: 20e6 }], { stdDays: 26, region: 1 });
  assert.ok(parts["xl/worksheets/sheet1.xml"].includes("<f>ROUND(C6*E6/$C$3,0)</f>"));
  assert.ok(parts["xl/worksheets/sheet1.xml"].includes("A &amp; B &lt;test&gt;"));
});
