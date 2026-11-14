/* Tuổi nghỉ hưu, tiền thai sản, lương làm thêm giờ.
 *
 * Tuổi nghỉ hưu (Bộ luật Lao động 2019 Điều 169, Nghị định 135/2020/NĐ-CP):
 *   điều kiện bình thường: từ 2021 nam 60 tuổi 3 tháng, mỗi năm +3 tháng đến 62 tuổi (2028);
 *   nữ 55 tuổi 4 tháng, mỗi năm +4 tháng đến 60 tuổi (2035). Tuổi áp dụng theo năm người lao động đủ tuổi.
 *   Nghỉ hưu sớm (nặng nhọc, độc hại ≥ 15 năm, vùng đặc biệt khó khăn ≥ 15 năm, suy giảm ≥ 61%): thấp hơn tối đa 5 tuổi.
 *   Thời điểm nghỉ hưu: hết ngày cuối cùng của tháng đủ tuổi; hưởng lương hưu từ tháng liền sau.
 *   Không rõ ngày, tháng sinh: lấy 01/01 của năm sinh.
 * Thai sản khi sinh con (Luật BHXH 2024 Điều 50, 58, 59; BLLĐ Điều 139 sửa bởi Luật Dân số 2025; NĐ 168/2026/NĐ-CP):
 *   nghỉ 6 tháng; 7 tháng nếu khi sinh mẹ đang có một con đẻ còn sống (sinh con thứ hai), từ 01/7/2026;
 *   sinh đôi trở lên: từ con thứ 2 mỗi con thêm 1 tháng.
 *   mức hưởng tháng = 100% bình quân tiền lương đóng BHXH 6 tháng trước khi nghỉ (tối đa 20 lần mức tham chiếu);
 *   trợ cấp một lần = 2 lần mức tham chiếu cho mỗi con (mức tham chiếu = lương cơ sở 2.530.000 đ từ 01/7/2026).
 * Làm thêm giờ (BLLĐ 2019 Điều 98, Nghị định 145/2020/NĐ-CP Điều 55–57), tính theo lương giờ:
 *   ngày thường 150%, nghỉ hằng tuần 200%, lễ tết 300%; làm thêm ban đêm (22h–6h) cộng 30% và 20% lương ban ngày
 *   của ngày đó: 200% (ngày thường), 210% (ngày thường đã làm thêm ban ngày), 270% (nghỉ tuần), 390% (lễ tết).
 *   Phần trả cao hơn lương giờ bình thường được miễn thuế TNCN.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LaoDong = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var REF = 2530000;   // mức tham chiếu = lương cơ sở từ 01/7/2026 (Nghị định 161/2026/NĐ-CP)

  // ---- Tuổi nghỉ hưu ----
  // birthMonth 1–12 (0 = không rõ → tháng 1), sex "m" | "f", early: nghỉ hưu sớm hơn 5 tuổi
  function retire(birthMonth, birthYear, sex, early) {
    var m = birthMonth || 1, born = birthYear * 12 + (m - 1);
    var base = (sex === "m" ? 60 : 55) - (early ? 5 : 0), step = sex === "m" ? 3 : 4, cap = sex === "m" ? 24 : 60;
    var age, at, old = born + base * 12 < 2021 * 12;
    if (old) { age = base * 12; at = born + age; }
    else for (var y = 2021; ; y++) {
      age = base * 12 + Math.min(step * (y - 2020), cap); at = born + age;
      if (at < (y + 1) * 12) break;
    }
    var pay = at + 1;
    return { ageYears: Math.floor(age / 12), ageMonths: age % 12, oldRule: old,
             month: at % 12 + 1, year: Math.floor(at / 12),                 // tháng đủ tuổi = tháng nghỉ hưu
             lastDay: new Date(Date.UTC(Math.floor(at / 12), at % 12 + 1, 0)).getUTCDate(),
             payMonth: pay % 12 + 1, payYear: Math.floor(pay / 12) };
  }
  // Còn bao nhiêu tháng từ tháng (m, y) hiện tại đến hết tháng nghỉ hưu
  function monthsLeft(r, nowMonth, nowYear) { return (r.year * 12 + r.month) - (nowYear * 12 + nowMonth); }

  // ---- Thai sản khi sinh con ----
  // avgSalary: bình quân lương đóng BHXH 6 tháng; babies: số con sinh lần này; livingKids: số con đẻ còn sống trước khi sinh
  function maternity(avgSalary, babies, livingKids) {
    babies = Math.max(1, babies | 0);
    var second = livingKids === 1, months = (second ? 7 : 6) + (babies - 1);
    var cap = 20 * REF, monthly = Math.min(avgSalary, cap);
    var leave = Math.round(monthly * months), lump = 2 * REF * babies;
    return { months: months, second: second, monthly: Math.round(monthly), capped: avgSalary > cap, cap: cap,
             leave: leave, lump: lump, total: leave + lump, ref: REF };
  }

  // ---- Làm thêm giờ ----
  var RATES = { day: 1.5, dayNight: 2.0, dayNightAfter: 2.1, rest: 2.0, restNight: 2.7, hol: 3.0, holNight: 3.9 };
  // salary: lương tháng; days: ngày công chuẩn/tháng; hoursPerDay; hours: { day: 10, rest: 8, … }
  function overtime(salary, days, hoursPerDay, hours) {
    var hourly = salary / (days * hoursPerDay), rows = [], total = 0, exempt = 0, totalHours = 0;
    Object.keys(RATES).forEach(function (k) {
      var h = +(hours[k] || 0);
      if (!h) return;
      var pay = hourly * RATES[k] * h;
      rows.push({ key: k, hours: h, rate: RATES[k], pay: Math.round(pay) });
      total += pay; exempt += hourly * (RATES[k] - 1) * h; totalHours += h;
    });
    return { hourly: hourly, rows: rows, total: Math.round(total), exempt: Math.round(exempt), hours: totalHours,
             overMonth: totalHours > 40 };
  }

  return { REF: REF, retire: retire, monthsLeft: monthsLeft, maternity: maternity, overtime: overtime, RATES: RATES };
});
