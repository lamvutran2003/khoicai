const test = require("node:test");
const assert = require("node:assert");
const V = require("../site/static/js/van-su.js");

// Đối chiếu với lịch vạn niên đã công bố (xemlicham.com, ngaydep.com, baohatinh.vn)
test("giờ hoàng đạo", () => {
  const hrs = (d, m, y) => V.day(d, m, y).hours.map(h => h.chi).join(",");
  assert.strictEqual(hrs(17, 11, 2026), "Dần,Mão,Tỵ,Thân,Tuất,Hợi");   // Ất Mùi
  assert.strictEqual(hrs(25, 12, 2026), "Tý,Dần,Mão,Ngọ,Mùi,Dậu");     // Quý Dậu
  assert.strictEqual(hrs(11, 11, 2026), "Dần,Mão,Tỵ,Thân,Tuất,Hợi");   // Kỷ Sửu
  assert.deepStrictEqual([V.day(15, 11, 2026).hours[0].chi, V.day(15, 11, 2026).hours[0].label], ["Sửu", "Sửu (1h–3h)"]);
  // ngày Tý: giờ Tý, Sửu, Mão, Ngọ, Thân, Dậu
  assert.strictEqual(V.hours(0).map(h => h.chi).join(","), "Tý,Sửu,Mão,Ngọ,Thân,Dậu");
  assert.strictEqual(V.hours(0)[0].label, "Tý (23h–1h)");
});

test("trực and hoàng đạo", () => {
  const d = V.day(17, 11, 2026);
  assert.deepStrictEqual([d.truc, d.hoangDao, d.spirit, d.canChi.day], ["Thành", true, "Minh Đường", "Ất Mùi"]);
  assert.strictEqual(V.day(18, 11, 2026).truc, "Thu");
  assert.strictEqual(V.day(25, 12, 2026).truc, "Thu");
  assert.strictEqual(V.day(15, 11, 2026).hoangDao, false);
  // ngày bắt đầu tiết lặp lại trực của ngày trước (Lập đông 7/11/2026)
  assert.strictEqual(V.day(7, 11, 2026).truc, V.day(6, 11, 2026).truc);
});

test("tiết khí start days", () => {
  const A = require("../site/static/js/am-lich.js");
  const starts = {};
  for (let jd = A.jdFromDate(1, 1, 2026); jd < A.jdFromDate(1, 1, 2027); jd++) {
    const t = V.tiet(jd); if (t.starts) { const x = A.jdToDate(jd); starts[t.name] = x.day + "/" + x.month; }
  }
  assert.strictEqual(starts["Lập xuân"], "4/2");
  assert.strictEqual(starts["Xuân phân"], "20/3");
  assert.strictEqual(starts["Hạ chí"], "21/6");
  assert.strictEqual(starts["Lập đông"], "7/11");
  assert.strictEqual(starts["Đông chí"], "22/12");
});

test("good days exclude hắc đạo, tam nương, nguyệt kỵ", () => {
  for (const act of V.ACT_ORDER) {
    for (const d of V.goodDays(act, 12, 2026)) {
      assert.ok(d.hoangDao && !d.tamNuong && !d.nguyetKy, act + " " + d.solar.day);
      assert.ok(V.ACTS[act].truc.includes(d.truc));
    }
  }
  assert.ok(V.goodDays("cuoi-hoi", 12, 2026).length > 0);
  assert.deepStrictEqual(V.day(30, 1, 2027).goodFor, []);   // 23 tháng Chạp: nguyệt kỵ
});

test("chi relations", () => {
  const C = n => V.CHI.indexOf(n);
  assert.strictEqual(V.chiRelation(C("Tý"), C("Thìn")), "tam hợp");
  assert.strictEqual(V.chiRelation(C("Dần"), C("Hợi")), "lục hợp");
  assert.strictEqual(V.chiRelation(C("Tý"), C("Ngọ")), "lục xung");
  assert.strictEqual(V.chiRelation(C("Tý"), C("Mùi")), "lục hại");
  assert.strictEqual(V.chiRelation(C("Tý"), C("Dần")), "");
  assert.strictEqual(V.day(17, 11, 2026).xung, "Sửu");
});
