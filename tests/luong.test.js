const test = require("node:test");
const assert = require("node:assert");
const L = require("../site/static/js/luong.js");

test("PIT brackets", () => {
  assert.strictEqual(L.pit(0), 0);
  assert.strictEqual(L.pit(10e6), 500000);
  assert.strictEqual(L.pit(30e6), 500000 + 2000000);
  assert.strictEqual(L.pit(60e6), 2500000 + 6000000);
  assert.strictEqual(L.pit(100e6), 8500000 + 12000000);
  assert.strictEqual(L.pit(120e6), 20500000 + 7000000);
});

test("gross to net, 30 triệu, no dependents", () => {
  const r = L.fromGross(30e6, { region: 1 });
  assert.strictEqual(r.insurance.total, 3150000);
  assert.strictEqual(r.taxable, 11350000);
  assert.strictEqual(r.tax, 635000);
  assert.strictEqual(r.net, 26215000);
  assert.strictEqual(r.cost, 30e6 + 30e6 * 0.215);
});

test("caps on insurance (50,6 triệu social, 20 × regional minimum unemployment)", () => {
  const r = L.fromGross(100e6, { region: 1, dependents: 1 });
  assert.strictEqual(r.insurance.bhxh, 4048000);
  assert.strictEqual(r.insurance.bhyt, 759000);
  assert.strictEqual(r.insurance.bhtn, 1000000);
  assert.strictEqual(r.taxable, 72493000);
  assert.strictEqual(r.tax, 12247900);
  assert.strictEqual(r.net, 81945100);
  assert.strictEqual(L.fromGross(150e6, { region: 4 }).insurance.bhtn, 740000);
});

test("below the threshold pays no tax; custom insurance base", () => {
  assert.strictEqual(L.fromGross(15e6).tax, 0);
  const r = L.fromGross(40e6, { insuranceBase: 10e6 });
  assert.strictEqual(r.insurance.total, 1050000);
});

test("net to gross inverts gross to net", () => {
  for (const g of [8e6, 17320000, 30e6, 55555555, 100e6, 250e6]) {
    for (const deps of [0, 2]) {
      const n = L.fromGross(g, { dependents: deps }).net, back = L.fromNet(n, { dependents: deps });
      assert.strictEqual(back.net, n, `net ${g} ${deps}`);
      assert.ok(Math.abs(back.gross - g) <= 2, `gross ${g} -> ${back.gross}`);
    }
  }
  assert.strictEqual(L.fromNet(26215000).gross, 30e6);
});
