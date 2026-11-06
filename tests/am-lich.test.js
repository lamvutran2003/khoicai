const test = require("node:test");
const assert = require("node:assert");
const A = require("../site/static/js/am-lich.js");

const TET = { 2020: [25, 1], 2021: [12, 2], 2022: [1, 2], 2023: [22, 1], 2024: [10, 2], 2025: [29, 1], 2026: [17, 2], 2027: [6, 2], 2030: [2, 2] };  // 2030: lịch Việt Nam (UTC+7) ra 2/2, lịch Trung Quốc (UTC+8) ra 3/2

test("Tết Nguyên đán (mùng 1 tháng Giêng) both directions", () => {
  for (const [y, [d, m]] of Object.entries(TET)) {
    const l = A.toLunar(d, m, +y);
    assert.deepStrictEqual([l.day, l.month, l.year, l.leap], [1, 1, +y, false], "toLunar " + y);
    const s = A.toSolar(1, 1, +y, false);
    assert.deepStrictEqual([s.day, s.month, s.year], [d, m, +y], "toSolar " + y);
    // the day before Tết is the last day of month 12 of the previous lunar year
    const prev = A.jdToDate(A.jdFromDate(d, m, +y) - 1), lp = A.toLunar(prev.day, prev.month, prev.year);
    assert.deepStrictEqual([lp.month, lp.year], [12, +y - 1]);
  }
});

test("leap months", () => {
  assert.strictEqual(A.leapMonthOf(2020), 4);
  assert.strictEqual(A.leapMonthOf(2023), 2);
  assert.strictEqual(A.leapMonthOf(2025), 6);
  assert.strictEqual(A.leapMonthOf(2026), 0);
  assert.strictEqual(A.leapMonthOf(2028), 5);
  assert.strictEqual(A.toSolar(1, 6, 2026, true), null);
  const s = A.toSolar(1, 6, 2025, true); // mùng 1 tháng 6 nhuận Ất Tỵ = 25/7/2025
  assert.deepStrictEqual([s.day, s.month, s.year], [25, 7, 2025]);
  const l = A.toLunar(25, 7, 2025);
  assert.deepStrictEqual([l.day, l.month, l.leap], [1, 6, true]);
});

test("round trip every day 1990–2040", () => {
  let jd = A.jdFromDate(1, 1, 1990); const end = A.jdFromDate(31, 12, 2040);
  for (; jd <= end; jd += 1) {
    const d = A.jdToDate(jd), l = A.toLunar(d.day, d.month, d.year), s = A.toSolar(l.day, l.month, l.year, l.leap);
    if (!s || s.jd !== jd) assert.fail(`round trip ${d.day}/${d.month}/${d.year}`);
  }
});

test("can chi and weekday", () => {
  assert.strictEqual(A.canChiYear(2026), "Bính Ngọ");
  assert.strictEqual(A.canChiYear(2025), "Ất Tỵ");
  assert.strictEqual(A.canChiYear(1990), "Canh Ngọ");
  assert.strictEqual(A.canChiDay(A.jdFromDate(1, 1, 2000)), "Mậu Ngọ");
  assert.strictEqual(A.canChiMonth(1, 2026), "Canh Dần");   // tháng Giêng năm Bính Ngọ
  assert.strictEqual(A.weekday(A.jdFromDate(6, 11, 2026)), "Thứ sáu");
  assert.strictEqual(A.monthLength(12, 2025, false) + 0 >= 29, true);
});
