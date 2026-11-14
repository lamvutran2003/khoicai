const test = require("node:test");
const assert = require("node:assert");
const G = require("../site/static/js/giao-vien.js");

test("coefficient scales match the official ranges", () => {
  assert.deepStrictEqual([G.steps("mn", "III")[0], G.steps("mn", "III").slice(-1)[0]], [2.10, 4.89]);
  assert.deepStrictEqual([G.steps("th", "III")[0], G.steps("th", "III").slice(-1)[0]], [2.34, 4.98]);
  assert.deepStrictEqual([G.steps("thcs", "II")[0], G.steps("thcs", "II").slice(-1)[0]], [4.00, 6.38]);
  assert.deepStrictEqual([G.steps("thpt", "I")[0], G.steps("thpt", "I").slice(-1)[0]], [4.40, 6.78]);
  assert.strictEqual(G.steps("mn", "I").length, 8);
});

test("salary range 5,31 – 17,15 million from 1/7/2026", () => {
  assert.strictEqual(Math.round(G.coef("A0", 1) * G.LCS), 5313000);
  assert.strictEqual(Math.round(G.coef("A2.1", 8) * G.LCS), 17153400);
});

test("NĐ 182 example: primary, coefficient 3,99, team leader 0,2, 45% → allowance 4.770.315 đ", () => {
  const r = G.salary({ level: "th", rank: "III", bac: 6, area: "thuong", years: 0, position: 0.2 });
  assert.strictEqual(r.coef, 3.99);
  assert.strictEqual(r.rate, 45);
  assert.strictEqual(r.allowance, 4770315);
});

test("allowance rates by level and area (NĐ 182/2026)", () => {
  assert.strictEqual(G.allowanceRate("mn", "thuong"), 45);
  assert.strictEqual(G.allowanceRate("thcs", "thuong"), 40);
  assert.strictEqual(G.allowanceRate("thpt", "kv12"), 45);
  assert.strictEqual(G.allowanceRate("th", "kv12"), 60);
  assert.strictEqual(G.allowanceRate("thpt", "dbkk"), 80);
});

test("seniority 5% at 5 years, +1% per year; insurance 10,5% excludes the professional allowance", () => {
  assert.strictEqual(G.seniorityRate(4), 0);
  assert.strictEqual(G.seniorityRate(5), 5);
  assert.strictEqual(G.seniorityRate(12), 12);
  // THCS hạng II bậc 1 (4,00), 10 năm, không chức vụ
  const r = G.salary({ level: "thcs", rank: "II", bac: 1, area: "thuong", years: 10, position: 0 });
  assert.strictEqual(r.basic, 10120000);
  assert.strictEqual(r.allowance, 4048000);          // 40%
  assert.strictEqual(r.seniority, 1012000);          // 10%
  assert.strictEqual(r.gross, 15180000);
  assert.strictEqual(r.insurance, Math.round((10120000 + 1012000) * 0.105));
  assert.strictEqual(r.net, r.gross - r.insurance);
});
