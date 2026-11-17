const test = require("node:test");
const assert = require("node:assert");
const P = require("../site/static/js/pdf-tools.js");

test("page ranges", () => {
  assert.deepStrictEqual(P.parsePages("1-3, 5", 10).pages, [0, 1, 2, 4]);
  assert.deepStrictEqual(P.parsePages("8-", 10).pages, [7, 8, 9]);
  assert.deepStrictEqual(P.parsePages("-2", 10).pages, [0, 1]);
  assert.deepStrictEqual(P.parsePages("3–1", 10).pages, [2, 1, 0]);   // gạch dài, đảo thứ tự
  assert.ok(P.parsePages("12", 10).error.includes("10 trang"));
  assert.ok(P.parsePages("abc", 10).error);
  assert.ok(P.parsePages("", 10).error);
});

test("chunks and labels", () => {
  assert.deepStrictEqual(P.chunks(5, 2), [[0, 1], [2, 3], [4]]);
  assert.strictEqual(P.label([0, 1, 2, 4, 6, 7]), "1-3, 5, 7-8");
});

test("image placement on A4", () => {
  const r = P.placeImage(1000, 500, "a4", "auto", 0);       // ảnh ngang -> trang ngang
  assert.ok(r.pageW > r.pageH);
  assert.ok(Math.abs(r.w - r.pageW) < 1e-6);
  const s = P.placeImage(800, 600, "image");
  assert.deepStrictEqual([s.pageW, s.pageH], [800, 600]);
  const q = P.placeImage(100, 100, "a4", "portrait", 36);
  assert.ok(Math.abs(q.w - (595.28 - 72)) < 1e-6);
});
