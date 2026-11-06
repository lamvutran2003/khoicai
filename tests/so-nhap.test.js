const test = require("node:test");
const assert = require("node:assert");
const N = require("../site/static/js/so-nhap.js");

// type: simulate typing ch at the end of the current value
function type(seq, o) {
  let v = "";
  for (const ch of seq) {
    const raw = v + ch, r = N.formatTyped(raw, raw.length, Object.assign({ typedDot: ch === "." }, o || {}));
    v = r.value;
    assert.strictEqual(r.caret, v.length, "caret at end after typing " + ch);
  }
  return v;
}

test("groups thousands as you type", () => {
  assert.strictEqual(type("1250000"), "1.250.000");
  assert.strictEqual(type("1234"), "1.234");
  assert.strictEqual(type("123"), "123");
  assert.strictEqual(type("0005"), "5");
});

test("decimals with comma or dot", () => {
  assert.strictEqual(type("1250000,5"), "1.250.000,5");
  assert.strictEqual(type("12.5"), "12,5");
  assert.strictEqual(type("12,"), "12,");
  assert.strictEqual(type(",5"), "0,5");
  assert.strictEqual(type("1,2345"), "1,23");
  assert.strictEqual(type("1,234", { decimals: 3 }), "1,234");
  assert.strictEqual(type("12,5", { decimals: 0 }), "125");
});

test("caret stays after the same digit when editing in the middle", () => {
  // "1.250.000" -> insert "9" after "1.2" => raw "1.2950.000", caret 4
  const r = N.formatTyped("1.2950.000", 4, {});
  assert.strictEqual(r.value, "12.950.000");
  assert.strictEqual(r.value.slice(0, r.caret).replace(/\D/g, ""), "129");
  // delete a digit: "1.250.000" -> "1.25.000" caret 4
  const d = N.formatTyped("1.25.000", 4, {});
  assert.strictEqual(d.value, "125.000");
  assert.strictEqual(d.value.slice(0, d.caret).replace(/\D/g, ""), "125");
});

test("pasting English or Vietnamese formats", () => {
  assert.strictEqual(N.format("1,250,000.50"), "1.250.000,50");
  assert.strictEqual(N.format("1.250.000"), "1.250.000");
  assert.strictEqual(N.format("1250000"), "1.250.000");
  assert.strictEqual(N.format("12,5"), "12,5");
  assert.strictEqual(N.format("3.600"), "3.600");
  assert.strictEqual(N.format("1 250 000 đ"), "1.250.000");
  assert.strictEqual(N.format("-5000", { allowNeg: true }), "-5.000");
});
