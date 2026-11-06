const test = require("node:test");
const assert = require("node:assert");
const D = require("../site/static/js/dat-dai.js");

test("conversions by region", () => {
  assert.strictEqual(D.toM2(1, "sao", "bac"), 360);
  assert.strictEqual(D.toM2(1, "mau", "bac"), 3600);
  assert.strictEqual(D.toM2(1, "thuoc", "bac"), 24);
  assert.strictEqual(D.toM2(1, "sao", "trung"), 497);
  assert.strictEqual(D.toM2(1, "sao", "trung", { trungSao: 500 }), 500);
  assert.strictEqual(D.toM2(1, "mau", "trung"), 4970);
  assert.strictEqual(D.toM2(1, "cong", "nam"), 1000);
  assert.strictEqual(D.toM2(1, "cong", "nam", { namCong: 1296 }), 1296);
  assert.strictEqual(D.toM2(2, "ha", "bac"), 20000);
  assert.strictEqual(D.fromM2(1800, "sao", "bac"), 5);
  assert.throws(() => D.toM2(1, "cong", "bac"));
});

test("mixed breakdown: mẫu sào thước", () => {
  const s = p => p.map(x => x.n + " " + x.name).join(" ");
  assert.strictEqual(s(D.mixed(5000, "bac")), "1 mẫu 3 sào 13 thước 8 m²");
  assert.strictEqual(s(D.mixed(360, "bac")), "1 sào");
  assert.strictEqual(s(D.mixed(100, "bac")), "4 thước 4 m²");
  assert.strictEqual(s(D.mixed(10, "bac")), "10 m²");
  assert.strictEqual(s(D.mixed(0, "bac")), "0 m²");
  assert.strictEqual(s(D.mixed(2500, "nam")), "2 công 500 m²");
  assert.strictEqual(s(D.mixed(994, "trung")), "2 sào");
});

test("number parsing", () => {
  assert.strictEqual(D.num("1,5"), 1.5);
  assert.strictEqual(D.num("1.5"), 1.5);
  assert.strictEqual(D.num("3.600"), 3600);
  assert.strictEqual(D.num("3 600"), 3600);
  assert.strictEqual(D.num("1.234,5"), 1234.5);
  assert.strictEqual(D.num("1,234.5"), 1234.5);
  assert.strictEqual(D.num("12"), 12);
  assert.strictEqual(D.num(",5"), 0.5);
  assert.strictEqual(D.num("abc"), null);
  assert.strictEqual(D.num(""), null);
  assert.strictEqual(D.num("1.2.3"), null);
});
