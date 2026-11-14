const test = require("node:test");
const assert = require("node:assert");
const L = require("../site/static/js/lao-dong.js");

const pay = r => `${r.ageYears}y${r.ageMonths}m pension ${r.payMonth}/${r.payYear}`;

test("retirement age: rows of Nghị định 135/2020 Phụ lục I (men)", () => {
  assert.strictEqual(pay(L.retire(1, 1961, "m")), "60y3m pension 5/2021");
  assert.strictEqual(pay(L.retire(9, 1961, "m")), "60y3m pension 1/2022");
  assert.strictEqual(pay(L.retire(10, 1961, "m")), "60y6m pension 5/2022");
  assert.strictEqual(pay(L.retire(4, 1966, "m")), "62y0m pension 5/2028");     // đạt 62 tuổi năm 2028
  assert.strictEqual(pay(L.retire(5, 1990, "m")), "62y0m pension 6/2052");
});

test("retirement age: rows of Phụ lục I (women) and the 2035 cap", () => {
  assert.strictEqual(pay(L.retire(1, 1966, "f")), "55y4m pension 6/2021");
  assert.strictEqual(pay(L.retire(8, 1966, "f")), "55y4m pension 1/2022");
  assert.strictEqual(pay(L.retire(9, 1966, "f")), "55y8m pension 6/2022");
  assert.strictEqual(pay(L.retire(4, 1975, "f")), "59y8m pension 1/2035");   // đủ 59 tuổi 8 tháng trong 2034
  assert.strictEqual(pay(L.retire(5, 1975, "f")), "60y0m pension 6/2035");   // từ tháng 5/1975: 60 tuổi
  assert.strictEqual(pay(L.retire(6, 1990, "f")), "60y0m pension 7/2050");
});

test("early retirement: Phụ lục II first rows", () => {
  assert.strictEqual(pay(L.retire(1, 1966, "m", true)), "55y3m pension 5/2021");
  assert.strictEqual(pay(L.retire(3, 1966, "m", true)), "55y3m pension 7/2021");
  assert.strictEqual(pay(L.retire(1, 1971, "f", true)), "50y4m pension 6/2021");
});

test("retirement: before 2021 uses the old ages; unknown month = January; last day of month", () => {
  assert.strictEqual(pay(L.retire(6, 1960, "m")), "60y0m pension 7/2020");
  assert.ok(L.retire(6, 1960, "m").oldRule);
  assert.strictEqual(pay(L.retire(0, 1961, "m")), pay(L.retire(1, 1961, "m")));
  const r = L.retire(10, 1964, "m");                       // 61 tuổi 6 tháng → tháng 4/2026
  assert.strictEqual(`${r.lastDay}/${r.month}/${r.year}`, "30/4/2026");
  assert.strictEqual(L.monthsLeft(r, 11, 2026), -7);
});

test("maternity: 6 months, 7 for the second child, +1 per extra baby, lump sum 2 × 2,53 tr per baby", () => {
  let m = L.maternity(10e6, 1, 0);
  assert.deepStrictEqual([m.months, m.leave, m.lump, m.total], [6, 60e6, 5.06e6, 65.06e6]);
  m = L.maternity(10e6, 1, 1);                              // ví dụ FDVN: 10 triệu × 7 tháng = 70 triệu
  assert.deepStrictEqual([m.months, m.leave, m.total], [7, 70e6, 75.06e6]);
  assert.strictEqual(L.maternity(10e6, 2, 1).months, 8);    // sinh đôi lần thứ hai (Bộ Nội vụ trả lời: 8 tháng)
  assert.strictEqual(L.maternity(10e6, 2, 0).months, 7);
  assert.strictEqual(L.maternity(10e6, 1, 2).months, 6);    // con thứ ba
  m = L.maternity(80e6, 1, 0);
  assert.ok(m.capped); assert.strictEqual(m.monthly, 50.6e6);
});

test("overtime: rates from NĐ 145/2020 and the tax-exempt part", () => {
  // lương 10,4 triệu, 26 ngày × 8 giờ → 50.000 đ/giờ
  const r = L.overtime(10.4e6, 26, 8, { day: 10, dayNightAfter: 2, rest: 8, holNight: 1 });
  assert.strictEqual(r.hourly, 50000);
  assert.deepStrictEqual(r.rows.map(x => x.pay), [750000, 210000, 800000, 195000]);
  assert.strictEqual(r.total, 1955000);
  assert.strictEqual(r.exempt, 1955000 - 50000 * 21);       // phần cao hơn lương giờ bình thường
  assert.strictEqual(r.hours, 21);
  assert.ok(!r.overMonth);
  assert.ok(L.overtime(10.4e6, 26, 8, { day: 41 }).overMonth);
});
