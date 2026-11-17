/* Lương hưu hằng tháng theo Luật Bảo hiểm xã hội 2024 (41/2024/QH15, hiệu lực 01/7/2025).
 *
 * Tỷ lệ hưởng (Điều 66 khoản 1): nữ 45% ứng với 15 năm đóng, thêm mỗi năm 2%;
 *   nam 45% ứng với 20 năm, thêm mỗi năm 2%; nam đóng từ 15 đến dưới 20 năm: 40% ứng với 15 năm, thêm mỗi năm 1%;
 *   tối đa 75%. Tháng lẻ: 1–6 tháng tính nửa năm, 7–11 tháng tính một năm (Nghị định 158/2025/NĐ-CP).
 * Nghỉ hưu trước tuổi do suy giảm khả năng lao động (Điều 66 khoản 3): mỗi năm nghỉ sớm giảm 2%;
 *   phần lẻ dưới 6 tháng không giảm, từ 6 tháng giảm 1%.
 * Mức bình quân tiền lương (Điều 72): lương do người sử dụng lao động quyết định: bình quân toàn bộ thời gian,
 *   từng năm nhân hệ số điều chỉnh (Công văn 340/BHXH-CSXH, áp dụng 2026); lương do Nhà nước quy định:
 *   bình quân số năm cuối theo năm bắt đầu tham gia (trước 1995: 5 năm; 1995–2000: 6; 2001–2006: 8; 2007–2015: 10;
 *   2016–2019: 15; 2020–2024: 20; từ 2025: toàn bộ), tính bằng hệ số × mức tham chiếu hiện hành.
 * Lương hưu tối thiểu (Điều 141 khoản 11): người tham gia trước khi luật có hiệu lực, đủ 20 năm đóng: không thấp
 *   hơn mức tham chiếu. Trợ cấp một lần khi nghỉ hưu (Điều 68): mỗi năm đóng trên 35 năm (nam) / 30 năm (nữ)
 *   được 0,5 tháng mức bình quân.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./bao-hiem.js"));
  else root.LuongHuu = factory(root.BaoHiem);
})(typeof self !== "undefined" ? self : this, function (BaoHiem) {
  "use strict";
  var REF = 2530000;   // mức tham chiếu = lương cơ sở từ 01/7/2026

  function stateWindow(startYear) {   // số năm cuối để tính bình quân, khu vực Nhà nước
    return startYear < 1995 ? 5 : startYear <= 2000 ? 6 : startYear <= 2006 ? 8 : startYear <= 2015 ? 10
         : startYear <= 2019 ? 15 : startYear <= 2024 ? 20 : Infinity;
  }

  function rateYears(months) {        // số năm để tính tỷ lệ, có làm tròn tháng lẻ
    var y = Math.floor(months / 12), odd = months % 12;
    return y + (odd === 0 ? 0 : odd <= 6 ? 0.5 : 1);
  }

  function rate(sex, years) {
    var r = sex === "f" ? 45 + 2 * (years - 15) : years < 20 ? 40 + (years - 15) : 45 + 2 * (years - 20);
    return Math.min(75, r);
  }

  function earlyCut(monthsEarly) {
    var m = Math.max(0, monthsEarly | 0);
    return 2 * Math.floor(m / 12) + (m % 12 >= 6 ? 1 : 0);
  }

  // o: { sex: "m"|"f", sector: "private"|"state", earlyMonths,
  //      periods: [{ from: {m, y}, to: {m, y}, salary }]  (private: lương đóng BHXH đ/tháng)
  //               [{ from, to, coef, pos }]               (state: hệ số lương, hệ số phụ cấp chức vụ/thâm niên) }
  function pension(o) {
    var list = [];   // mỗi tháng đóng: {y, m, value}
    (o.periods || []).forEach(function (p) {
      var y = p.from.y, m = p.from.m;
      while (y < p.to.y || (y === p.to.y && m <= p.to.m)) {
        var v = o.sector === "state" ? ((+p.coef || 0) + (+p.pos || 0)) * REF : (+p.salary || 0) * BaoHiem.coef(y);
        list.push({ y: y, m: m, v: v });
        if (++m > 12) { m = 1; y++; }
      }
    });
    if (!list.length) return null;
    list.sort(function (a, b) { return a.y - b.y || a.m - b.m; });
    var months = list.length, first = list[0];
    var used = list;
    if (o.sector === "state") {
      var w = stateWindow(first.y);
      if (w !== Infinity) used = list.slice(-12 * w);
    }
    var avg = used.reduce(function (s, x) { return s + x.v; }, 0) / used.length;
    var years = rateYears(months), eligible = months >= 180;
    var r = eligible ? rate(o.sex, years) : 0, cut = eligible ? Math.min(r, earlyCut(o.earlyMonths)) : 0;
    var finalRate = r - cut;
    var amount = avg * finalRate / 100;
    var joinedBefore = first.y < 2025 || (first.y === 2025 && first.m < 7);
    var floored = eligible && joinedBefore && months >= 240 && amount < REF;
    if (floored) amount = REF;
    var full = o.sex === "f" ? 30 : 35, extra = Math.max(0, years - full);
    return { months: months, years: years, eligible: eligible, monthsShort: eligible ? 0 : 180 - months,
             avg: Math.round(avg), avgMonths: used.length, rate: r, cut: cut, finalRate: finalRate,
             amount: Math.round(amount), floored: floored, ref: REF,
             extraYears: extra, oneOff: Math.round(extra * 0.5 * avg),
             yearsToMax: Math.max(0, (o.sex === "f" ? 30 : 35) - years) };
  }

  return { REF: REF, pension: pension, rate: rate, rateYears: rateYears, earlyCut: earlyCut, stateWindow: stateWindow };
});
