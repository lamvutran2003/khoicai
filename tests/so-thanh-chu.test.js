const test = require("node:test");
const assert = require("node:assert");
const S = require("../site/static/js/so-thanh-chu.js");

const r = (x, o) => S.read(x, o);

test("small numbers and the special readings (mốt, tư, lăm, linh, mười)", () => {
  const cases = {
    "0": "Không đồng", "5": "Năm đồng", "10": "Mười đồng", "11": "Mười một đồng", "15": "Mười lăm đồng",
    "14": "Mười bốn đồng", "21": "Hai mươi mốt đồng", "24": "Hai mươi tư đồng", "25": "Hai mươi lăm đồng",
    "105": "Một trăm linh năm đồng", "110": "Một trăm mười đồng", "111": "Một trăm mười một đồng",
    "1001": "Một nghìn không trăm linh một đồng", "1010": "Một nghìn không trăm mười đồng",
  };
  for (const [n, want] of Object.entries(cases)) assert.strictEqual(r(n), want, n);
});

test("invoice-sized amounts", () => {
  assert.strictEqual(r("1.250.000"), "Một triệu hai trăm năm mươi nghìn đồng");
  assert.strictEqual(r("1.005.000"), "Một triệu không trăm linh năm nghìn đồng");
  assert.strictEqual(r("1.000.005"), "Một triệu không trăm linh năm đồng");
  assert.strictEqual(r("21.450.000.000"), "Hai mươi mốt tỷ bốn trăm năm mươi triệu đồng");
  assert.strictEqual(r("2.000.500.000.000"), "Hai nghìn tỷ năm trăm triệu đồng");
  assert.strictEqual(r("1.000.000.000.000.000"), "Một triệu tỷ đồng");
  assert.strictEqual(r("1.000.000.000.000.000.000"), "Một tỷ tỷ đồng");
});

test("options: lẻ, ngàn, bốn, chẵn, units and capitalisation", () => {
  assert.strictEqual(r("1.024", { linh: "lẻ", nghin: "ngàn", tu: false }), "Một ngàn không trăm hai mươi bốn đồng");
  assert.strictEqual(r("105", { linh: "lẻ" }), "Một trăm lẻ năm đồng");
  assert.strictEqual(r("5.000.000", { chan: true }), "Năm triệu đồng chẵn");
  assert.strictEqual(r("12,50", { unit: "usd" }), "Mười hai đô la Mỹ và năm mươi xu");
  assert.strictEqual(r("12", { unit: "usd", chan: true }), "Mười hai đô la Mỹ chẵn");
  assert.strictEqual(r("3,05", { unit: "eur" }), "Ba euro và năm cent");
  assert.strictEqual(r("12,5", { unit: "none" }), "Mười hai phẩy năm");
  assert.strictEqual(r("2,05", { unit: "none" }), "Hai phẩy không năm");
  assert.strictEqual(r("1.250.000", { caps: "upper" }), "MỘT TRIỆU HAI TRĂM NĂM MƯƠI NGHÌN ĐỒNG");
  assert.strictEqual(r("21", { caps: "title" }), "Hai Mươi Mốt Đồng");
  assert.strictEqual(r("-5.000"), "Âm năm nghìn đồng");
});

test("parsing Vietnamese and English number formats", () => {
  assert.deepStrictEqual(S.parse("1.250.000"), { neg: false, int: "1250000", frac: "" });
  assert.deepStrictEqual(S.parse("1,250,000"), { neg: false, int: "1250000", frac: "" });
  assert.deepStrictEqual(S.parse("1 250 000 đ"), { neg: false, int: "1250000", frac: "" });
  assert.deepStrictEqual(S.parse("1.250.000,50"), { neg: false, int: "1250000", frac: "50" });
  assert.deepStrictEqual(S.parse("1,250,000.50"), { neg: false, int: "1250000", frac: "50" });
  assert.deepStrictEqual(S.parse("12,5"), { neg: false, int: "12", frac: "5" });
  assert.deepStrictEqual(S.parse("1.25"), { neg: false, int: "1", frac: "25" });
  assert.strictEqual(S.parse("1.25.000"), null);
  assert.strictEqual(S.parse("abc"), null);
  assert.strictEqual(S.format(S.parse("1250000,5")), "1.250.000,5");
});
