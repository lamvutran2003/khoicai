/* Lương giáo viên công lập (mầm non, tiểu học, THCS, THPT), áp dụng từ 01/7/2026.
 *
 * Lương = hệ số lương × lương cơ sở (2.530.000 đ, Nghị định 161/2026/NĐ-CP).
 *   Hệ số theo hạng chức danh (Thông tư 01–04/2021/TT-BGDĐT, sửa đổi 2023):
 *     mầm non: hạng III A0 (2,10–4,89), hạng II A1 (2,34–4,98), hạng I A2.2 (4,00–6,38);
 *     tiểu học, THCS, THPT: hạng III A1 (2,34–4,98), hạng II A2.2 (4,00–6,38), hạng I A2.1 (4,40–6,78).
 *   Hệ số lương đặc thù (×1,15) mới là dự thảo, chưa áp dụng.
 * Phụ cấp ưu đãi theo nghề (Nghị định 182/2026/NĐ-CP, áp dụng từ 01/01/2026):
 *   = (hệ số + phụ cấp chức vụ) × lương cơ sở × tỷ lệ;
 *   mầm non, tiểu học 45%; THCS, THPT 40%; xã khu vực I, II vùng DTTS & miền núi, biên giới, đảo: 60% / 45%;
 *   vùng kinh tế – xã hội đặc biệt khó khăn, trường chuyên, phổ thông dân tộc nội trú: 80%;
 *   phổ thông dân tộc bán trú, trường năng khiếu: 60%.
 * Phụ cấp thâm niên nhà giáo (Nghị định 77/2021/NĐ-CP): đủ 5 năm 5%, từ năm thứ 6 mỗi năm thêm 1%,
 *   tính trên (hệ số + phụ cấp chức vụ) × lương cơ sở; vẫn hưởng đến khi thực hiện chính sách tiền lương mới.
 * Khấu trừ: BHXH 8%, BHYT 1,5%, BHTN 1% trên lương hệ số + phụ cấp chức vụ + thâm niên (không gồm ưu đãi).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GiaoVien = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var LCS = 2530000;
  var SCALES = {
    A0: { start: 2.10, step: 0.31, steps: 10 },
    A1: { start: 2.34, step: 0.33, steps: 9 },
    "A2.2": { start: 4.00, step: 0.34, steps: 8 },
    "A2.1": { start: 4.40, step: 0.34, steps: 8 }
  };
  var RANKS = {   // cấp học -> hạng -> nhóm ngạch
    mn: { III: "A0", II: "A1", I: "A2.2" },
    th: { III: "A1", II: "A2.2", I: "A2.1" }, thcs: { III: "A1", II: "A2.2", I: "A2.1" }, thpt: { III: "A1", II: "A2.2", I: "A2.1" }
  };
  // nơi công tác -> tỷ lệ ưu đãi [mầm non/tiểu học, THCS/THPT]
  var AREAS = { thuong: [45, 40], kv12: [60, 45], dbkk: [80, 80], noitru: [80, 80], bantru: [60, 60] };

  var round2 = function (x) { return Math.round(x * 100) / 100; };
  function coef(scale, bac) { var s = SCALES[scale]; return round2(s.start + s.step * (Math.min(Math.max(bac, 1), s.steps) - 1)); }
  function steps(level, rank) {
    var sc = RANKS[level][rank], s = SCALES[sc], out = [];
    for (var i = 1; i <= s.steps; i++) out.push(coef(sc, i));
    return out;
  }
  function allowanceRate(level, area) { return AREAS[area][level === "mn" || level === "th" ? 0 : 1]; }
  function seniorityRate(years) { years = Math.floor(years || 0); return years >= 5 ? 5 + (years - 5) : 0; }

  // o: { level, rank, bac, area, years, position (hệ số chức vụ) }
  function salary(o) {
    var k = coef(RANKS[o.level][o.rank], o.bac), pos = +o.position || 0;
    var basic = k * LCS, posPay = pos * LCS, base = basic + posPay;
    var rate = allowanceRate(o.level, o.area), sen = seniorityRate(o.years);
    var uuDai = base * rate / 100, thamNien = base * sen / 100;
    var gross = basic + posPay + uuDai + thamNien, ins = (basic + posPay + thamNien) * 0.105;
    var R = Math.round;
    return { coef: k, basic: R(basic), position: R(posPay), rate: rate, allowance: R(uuDai), seniorityRate: sen,
             seniority: R(thamNien), gross: R(gross), insurance: R(ins), net: R(gross) - R(ins), lcs: LCS };
  }

  return { LCS: LCS, SCALES: SCALES, RANKS: RANKS, AREAS: AREAS, coef: coef, steps: steps,
           allowanceRate: allowanceRate, seniorityRate: seniorityRate, salary: salary };
});
