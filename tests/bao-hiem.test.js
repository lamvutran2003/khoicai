const test = require("node:test");
const assert = require("node:assert");
const B = require("../site/static/js/bao-hiem.js");
const L = require("../site/static/js/luong.js");

test("unemployment benefit: amount, cap, duration", () => {
  const a = B.unemployment(10e6, 30, 1);
  assert.deepStrictEqual([a.monthly, a.months, a.total, a.reserved], [6e6, 3, 18e6, 0]);
  const durations = [[11, 0], [12, 3], [36, 3], [47, 3], [48, 4], [60, 5], [132, 11], [144, 12], [200, 12]];
  for (const [n, d] of durations) assert.strictEqual(B.unemployment(10e6, n, 1).months, d, "months " + n);
  assert.strictEqual(B.unemployment(10e6, 50, 1).reserved, 2);            // 48 used for 4 months, 2 kept
  const c = B.unemployment(60e6, 60, 1);                                    // 60% = 36tr > 5 × 5,31tr
  assert.deepStrictEqual([c.monthly, c.capped], [26550000, true]);
  assert.strictEqual(B.unemployment(60e6, 60, 4).monthly, 18500000);
});

test("lump-sum BHXH: years, odd months, coefficients", () => {
  // 2018-01 .. 2025-12 (8 years, all from 2014), flat 10tr
  const r = B.lumpSum([{ from: { m: 1, y: 2018 }, to: { m: 12, y: 2025 }, salary: 10e6 }]);
  assert.strictEqual(r.months, 96);
  assert.strictEqual(r.yearsAfter, 8);
  const avg = 10e6 * (12 * (1.23 + 1.20 + 1.16 + 1.14 + 1.11 + 1.07 + 1.03 + 1.00)) / 96;
  assert.strictEqual(r.avg, Math.round(avg));
  assert.strictEqual(r.amount, Math.round(16 * avg));
  // 2012-07 .. 2015-09: before 2014 = 18 months (1 year + 6 carried), after = 21 -> 27 months -> 2 years + 3 -> 2.5
  const s = B.lumpSum([{ from: { m: 7, y: 2012 }, to: { m: 9, y: 2015 }, salary: 5e6 }]);
  assert.deepStrictEqual([s.monthsBefore, s.monthsAfter, s.yearsBefore, s.yearsAfter], [18, 21, 1, 2.5]);
  // 8 odd months -> 1 year
  assert.strictEqual(B.lumpSum([{ from: { m: 1, y: 2025 }, to: { m: 8, y: 2026 }, salary: 8e6 }]).yearsAfter, 2);   // 20 months = 1 year + 8 odd months (counts as 1 year)
  // under one year: 22% of contributions, max 2 months
  const u = B.lumpSum([{ from: { m: 1, y: 2026 }, to: { m: 6, y: 2026 }, salary: 10e6 }]);
  assert.deepStrictEqual([u.under1y, u.amount], [true, Math.min(0.22 * 60e6, 20e6)]);
});

test("annual PIT settlement matches 12 × the monthly withholding for a steady salary", () => {
  const m = L.fromGross(30e6);                      // monthly tax 635.000
  const s = B.settlement({ income: 360e6, insurance: 12 * m.insurance.total, dependentMonths: 0, withheld: 12 * m.tax });
  assert.strictEqual(s.tax, 12 * m.tax);
  assert.deepStrictEqual([s.refund, s.due], [0, 0]);
  const r = B.settlement({ income: 360e6, insurance: 37.8e6, dependentMonths: 12, withheld: 7.62e6 });
  assert.strictEqual(r.taxable, 360e6 - 37.8e6 - 186e6 - 74.4e6);
  assert.strictEqual(r.tax, Math.round(61.8e6 * 0.05));
  assert.strictEqual(r.refund, 7.62e6 - r.tax);
  assert.strictEqual(B.pitYear(1300e6), Math.round(120e6 * .05 + 240e6 * .1 + 360e6 * .2 + 480e6 * .3 + 100e6 * .35));
});
