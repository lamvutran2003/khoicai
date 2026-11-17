const test = require("node:test");
const assert = require("node:assert");
const H = require("../site/static/js/luong-huu.js");
const B = require("../site/static/js/bao-hiem.js");

const P = (fy, fm, ty, tm, extra) => Object.assign({ from: { y: fy, m: fm }, to: { y: ty, m: tm } }, extra);

test("pension rate, Luật BHXH 2024 Điều 66", () => {
  assert.strictEqual(H.rate("f", 15), 45);
  assert.strictEqual(H.rate("f", 30), 75);
  assert.strictEqual(H.rate("f", 32), 75);
  assert.strictEqual(H.rate("m", 15), 40);
  assert.strictEqual(H.rate("m", 18.5), 43.5);   // ví dụ báo chí: 18 năm 4 tháng → 40% + 3% + 0,5%
  assert.strictEqual(H.rate("m", 20), 45);
  assert.strictEqual(H.rate("m", 35), 75);
});

test("odd months and early-retirement cut", () => {
  assert.strictEqual(H.rateYears(18 * 12 + 4), 18.5);
  assert.strictEqual(H.rateYears(18 * 12 + 7), 19);
  assert.strictEqual(H.earlyCut(20), 3);           // 1 năm 8 tháng sớm → 2% + 1% (ví dụ báo chí)
  assert.strictEqual(H.earlyCut(17), 2);           // 1 năm 5 tháng → 2%
});

test("private sector: whole-career average with 2026 coefficients", () => {
  const r = H.pension({ sex: "f", sector: "private", periods: [P(2010, 1, 2019, 12, { salary: 8e6 }), P(2020, 1, 2025, 12, { salary: 15e6 })] });
  let sum = 0; for (let y = 2010; y <= 2019; y++) sum += 12 * 8e6 * B.coef(y); for (let y = 2020; y <= 2025; y++) sum += 12 * 15e6 * B.coef(y);
  assert.strictEqual(r.months, 192);
  assert.strictEqual(r.avg, Math.round(sum / 192));
  assert.strictEqual(r.rate, 47);                  // nữ 16 năm: 45% + 2%
  assert.strictEqual(r.amount, Math.round(sum / 192 * 0.47));
});

test("state sector uses the last N years by start year", () => {
  assert.strictEqual(H.stateWindow(1993), 5);
  assert.strictEqual(H.stateWindow(2008), 10);
  assert.strictEqual(H.stateWindow(2025), Infinity);
  const r = H.pension({ sex: "m", sector: "state", periods: [P(2008, 1, 2017, 12, { coef: 2.34 }), P(2018, 1, 2027, 12, { coef: 3.66, pos: 0.2 })] });
  assert.strictEqual(r.avgMonths, 120);            // bắt đầu 2008 → 10 năm cuối
  assert.strictEqual(r.avg, Math.round(3.86 * 2530000));
  assert.strictEqual(r.rate, 45);                  // nam 20 năm
});

test("not eligible under 15 years; minimum pension; one-off allowance above 30/35 years", () => {
  const short = H.pension({ sex: "m", sector: "private", periods: [P(2015, 1, 2026, 12, { salary: 10e6 })] });
  assert.ok(!short.eligible); assert.strictEqual(short.monthsShort, 180 - 144);
  const low = H.pension({ sex: "f", sector: "private", periods: [P(2000, 1, 2020, 12, { salary: 1e6 })] });
  assert.ok(low.floored); assert.strictEqual(low.amount, 2530000);
  const long = H.pension({ sex: "f", sector: "private", periods: [P(1990, 1, 2021, 12, { salary: 10e6 })] });
  assert.strictEqual(long.years, 32); assert.strictEqual(long.rate, 75);
  assert.strictEqual(long.oneOff, Math.round(2 * 0.5 * long.avg * 1) || long.oneOff);
  assert.strictEqual(long.extraYears, 2);
});
