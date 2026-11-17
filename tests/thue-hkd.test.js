const test = require("node:test");
const assert = require("node:assert");
const T = require("../site/static/js/thue-hkd.js");

test("dưới ngưỡng 1 tỷ không nộp GTGT, TNCN", () => {
  const r = T.calc({ group: "dich-vu", revenue: 1e9 });
  assert.strictEqual(r.exempt, true);
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.einvoice, false);
  assert.strictEqual(r.filing, "notice");
});

test("hộ bán lẻ 2 tỷ: GTGT 1% toàn bộ doanh thu, TNCN 0,5% phần vượt 1 tỷ, giảm 30%", () => {
  // Ví dụ công bố: GTGT 2 tỷ × 1% = 20 triệu; TNCN (2 tỷ − 1 tỷ) × 0,5% = 5 triệu; giảm 30% còn 3,5 triệu
  const r = T.calc({ group: "hang-hoa", revenue: 2e9, year: 2026 });
  assert.strictEqual(r.vat, 20000000);
  assert.strictEqual(r.pitBeforeCut, 5000000);
  assert.strictEqual(r.pitCut, 1500000);
  assert.strictEqual(r.pit, 3500000);
  assert.strictEqual(r.total, 23500000);
  assert.strictEqual(r.einvoice, true);
  assert.strictEqual(r.filing, "quarter");
});

test("trên 3 tỷ: thuế TNCN trên thu nhập 17% (đến 50 tỷ), 20% (trên 50 tỷ)", () => {
  // Ví dụ công bố: doanh thu 5 tỷ, chi phí 4 tỷ: (5 − 4) tỷ × 17% = 170 triệu (trước giảm 30%)
  const r = T.calc({ group: "hang-hoa", revenue: 5e9, cost: 4e9, year: 2028 });
  assert.strictEqual(r.pit, 170000000);
  assert.strictEqual(r.methods.length, 1);
  assert.strictEqual(T.calc({ group: "hang-hoa", revenue: 5e9, cost: 4e9, year: 2026 }).pit, 119000000);
  assert.strictEqual(T.calc({ group: "hang-hoa", revenue: 60e9, cost: 48e9, year: 2026 }).pit, 12e9 * 0.2);  // trên 10 tỷ: không được giảm
  assert.strictEqual(T.calc({ group: "hang-hoa", revenue: 5e9 }).needCost, true);
});

test("1–3 tỷ: chọn phương pháp có số thuế thấp hơn", () => {
  const r = T.calc({ group: "dich-vu", revenue: 2.5e9, cost: 2.2e9, year: 2028 });
  // tỷ lệ: 1,5 tỷ × 2% = 30 triệu; thu nhập: 0,3 tỷ × 15% = 45 triệu
  assert.deepStrictEqual(r.methods.map(m => m.tax), [30000000, 45000000]);
  assert.strictEqual(r.chosen.id, "revenue");
  assert.strictEqual(T.calc({ group: "dich-vu", revenue: 2.5e9, cost: 2.45e9, year: 2028 }).chosen.id, "income");
});

test("giảm 20% tỷ lệ GTGT chỉ trong năm 2026", () => {
  assert.strictEqual(T.calc({ group: "san-xuat", revenue: 2e9, vatCut: true, year: 2026 }).vat, Math.round(2e9 * 0.024));
  assert.strictEqual(T.calc({ group: "san-xuat", revenue: 2e9, vatCut: true, year: 2027 }).vat, 2e9 * 0.03);
});
