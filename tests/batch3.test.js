const test = require("node:test");
const assert = require("node:assert");
const G = require("../site/static/js/tra-gop.js");
const T = require("../site/static/js/tuoi.js");

test("loan: declining balance, equal principal", () => {
  const s = G.schedule(120e6, 12, 12, "declining");
  assert.strictEqual(s.rows[0].principal, 10e6);
  assert.strictEqual(Math.round(s.rows[0].interest), 1.2e6);        // 120tr × 1%
  assert.strictEqual(Math.round(s.rows[11].interest), 100000);      // 10tr × 1%
  assert.strictEqual(Math.round(s.totalInterest), 7.8e6);           // 1% × (120+110+…+10) tr
  assert.strictEqual(Math.round(s.rows[11].balance), 0);
});

test("loan: annuity and flat", () => {
  const a = G.schedule(100e6, 12, 12, "annuity");
  assert.strictEqual(Math.round(a.first), 8884879);
  assert.ok(Math.abs(a.rows[5].payment - a.first) < 1);
  assert.strictEqual(Math.round(a.rows[11].balance), 0);
  const f = G.schedule(100e6, 12, 12, "flat");
  assert.strictEqual(Math.round(f.totalInterest), 12e6);
  // flat 12%/year ≈ 21.5%/year on a declining balance
  assert.strictEqual(Math.round(G.equivalentRate(100e6, f.first, 12) * 10) / 10, 21.5);
  assert.strictEqual(Math.round(G.equivalentRate(100e6, a.first, 12) * 100) / 100, 12);
});

test("age, lunar year, can chi, con giáp, mệnh", () => {
  const r = T.age({ day: 15, month: 3, year: 1998 }, { day: 6, month: 11, year: 2026 });
  assert.deepStrictEqual([r.years, r.months, r.days], [28, 7, 22]);
  assert.strictEqual(r.info.canChi, "Mậu Dần");
  assert.strictEqual(r.info.animal, "Hổ");
  assert.strictEqual(r.info.napAm, "Thành Đầu Thổ");
  assert.strictEqual(r.nominal, 29);
  // born before Tết belongs to the previous lunar year
  const b = T.age({ day: 20, month: 1, year: 1998 }, { day: 6, month: 11, year: 2026 });
  assert.strictEqual(b.info.canChi, "Đinh Sửu");
  assert.strictEqual(b.nominal, 30);
  assert.strictEqual(T.yearInfo(2026).napAm, "Thiên Hà Thủy");
  assert.strictEqual(T.yearInfo(1984).napAm, "Hải Trung Kim");
  assert.strictEqual(T.yearInfo(1990).element, "Thổ");
  const leap = T.age({ day: 29, month: 2, year: 2000 }, { day: 1, month: 3, year: 2026 });
  assert.strictEqual(leap.nextBirthdayIn, 364);
});
