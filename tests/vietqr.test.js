const test = require("node:test");
const assert = require("node:assert");
const V = require("../site/static/js/vietqr.js");

// Parse an EMV TLV string into {id: value}
function parse(s) {
  const out = {}; let i = 0;
  while (i < s.length) { const id = s.substr(i, 2), n = +s.substr(i + 2, 2); out[id] = s.substr(i + 4, n); i += 4 + n; }
  return out;
}

test("CRC-16/CCITT-FALSE check value", () => {
  assert.strictEqual(V.crc16("123456789"), "29B1");
});

test("payload with amount and note", () => {
  const p = V.payload({ bin: "970436", account: "0123 456 789", amount: 150000, note: "Thanh toán đơn #25" });
  const f = parse(p);
  assert.strictEqual(f["00"], "01");
  assert.strictEqual(f["01"], "12");
  const m = parse(f["38"]);
  assert.strictEqual(m["00"], "A000000727");
  assert.deepStrictEqual(parse(m["01"]), { "00": "970436", "01": "0123456789" });
  assert.strictEqual(m["02"], "QRIBFTTA");
  assert.strictEqual(f["53"], "704");
  assert.strictEqual(f["54"], "150000");
  assert.strictEqual(f["58"], "VN");
  assert.strictEqual(parse(f["62"])["08"], "Thanh toan don 25");
  assert.strictEqual(f["63"], V.crc16(p.slice(0, -4)));
  assert.ok(p.endsWith("6304" + f["63"]));
});

test("static QR without amount; invalid input", () => {
  const f = parse(V.payload({ bin: "970422", account: "123" }));
  assert.strictEqual(f["01"], "11");
  assert.strictEqual(f["54"], undefined);
  assert.strictEqual(f["62"], undefined);
  assert.strictEqual(V.payload({ bin: "97042", account: "123" }), null);
  assert.strictEqual(V.payload({ bin: "970422", account: "" }), null);
});

test("bank list has unique BINs", () => {
  const bins = V.BANKS.map(b => b[0]);
  assert.strictEqual(new Set(bins).size, bins.length);
  assert.ok(bins.every(b => /^\d{6}$/.test(b)));
});
