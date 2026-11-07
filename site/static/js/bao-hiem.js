/* Trợ cấp thất nghiệp, BHXH một lần, quyết toán thuế TNCN năm.
 *
 * Trợ cấp thất nghiệp (Luật Việc làm 74/2025/QH15, Điều 39, từ 01/01/2026):
 *   mức hằng tháng = 60% bình quân tiền lương đóng BHTN 6 tháng gần nhất, tối đa 5 × lương tối thiểu vùng tháng cuối;
 *   đóng đủ 12 đến đủ 36 tháng: 3 tháng trợ cấp; sau đó mỗi 12 tháng đóng thêm: thêm 1 tháng; tối đa 12 tháng.
 * BHXH một lần (Luật BHXH 2024, Điều 70; tháng lẻ theo Điều 5):
 *   1,5 tháng lương bình quân cho mỗi năm đóng trước 2014, 2 tháng cho mỗi năm từ 2014;
 *   tháng lẻ 1–6 tính nửa năm, 7–11 tính một năm; tháng lẻ trước 2014 chuyển sang giai đoạn từ 2014;
 *   đóng dưới 1 năm: bằng số tiền đã đóng (22% tiền lương) nhưng không quá 2 tháng lương bình quân;
 *   tiền lương từng năm nhân hệ số điều chỉnh (khu vực ngoài nhà nước) do BHXH Việt Nam công bố.
 * Quyết toán thuế TNCN từ tiền lương, kỳ tính thuế 2026 (Luật 109/2025/QH15): biểu luỹ tiến 5 bậc theo năm,
 *   giảm trừ bản thân 186 triệu/năm, người phụ thuộc 74,4 triệu/năm (6,2 triệu/tháng).
 */
(function (root) {
  var REGION_MIN = { 1: 5310000, 2: 4730000, 3: 4140000, 4: 3700000 };   // Nghị định 293/2025/NĐ-CP

  function unemployment(avgSalary, months, region) {
    var cap = 5 * REGION_MIN[region || 1], raw = 0.6 * avgSalary, monthly = Math.min(raw, cap);
    var n = Math.floor(months), dur = n < 12 ? 0 : n <= 36 ? 3 : Math.min(12, 3 + Math.floor((n - 36) / 12));
    var used = dur === 0 ? 0 : dur === 3 ? Math.min(n, 36) : 36 + 12 * (dur - 3);
    return { monthly: Math.round(monthly), capped: raw > cap, cap: cap, months: dur, total: Math.round(monthly) * dur,
             reserved: dur && dur < 12 ? n - used : 0 };   // bảo lưu: chỉ tính khi chưa đạt mức tối đa 12 tháng
  }

  // Hệ số điều chỉnh tiền lương tháng đã đóng BHXH, áp dụng năm 2026 (Công văn 340/BHXH-CSXH ngày 03/02/2026)
  var COEF_2026 = { 1994: 5.81, 1995: 4.91, 1996: 4.65, 1997: 4.50, 1998: 4.18, 1999: 4.01, 2000: 4.07, 2001: 4.09, 2002: 3.94,
    2003: 3.81, 2004: 3.54, 2005: 3.27, 2006: 3.05, 2007: 2.81, 2008: 2.29, 2009: 2.14, 2010: 1.96, 2011: 1.65, 2012: 1.51,
    2013: 1.42, 2014: 1.36, 2015: 1.36, 2016: 1.32, 2017: 1.28, 2018: 1.23, 2019: 1.20, 2020: 1.16, 2021: 1.14, 2022: 1.11,
    2023: 1.07, 2024: 1.03, 2025: 1.00, 2026: 1.00 };
  function coef(year) { return year <= 1994 ? COEF_2026[1994] : COEF_2026[year] || 1; }

  // periods: [{ from: {m, y}, to: {m, y}, salary }] — mỗi giai đoạn đóng BHXH với một mức lương
  function lumpSum(periods) {
    var before = 0, after = 0, adjSum = 0, months = 0;
    periods.forEach(function (p) {
      for (var y = p.from.y, m = p.from.m; y < p.to.y || (y === p.to.y && m <= p.to.m); m++) {
        if (m > 12) { m = 1; y++; if (y > p.to.y) break; }
        if (y === p.to.y && m > p.to.m) break;
        if (y < 2014) before++; else after++;
        adjSum += p.salary * coef(y); months++;
      }
    });
    if (!months) return null;
    var avg = adjSum / months;
    var yBefore = Math.floor(before / 12), carry = before % 12, aft = after + carry;
    var yAfter = Math.floor(aft / 12), odd = aft % 12;
    yAfter += odd === 0 ? 0 : odd <= 6 ? 0.5 : 1;
    var amount;
    if (months < 12) amount = Math.min(0.22 * adjSum, 2 * avg);
    else amount = (1.5 * yBefore + 2 * yAfter) * avg;
    return { months: months, monthsBefore: before, monthsAfter: after, yearsBefore: yBefore, yearsAfter: yAfter,
             avg: Math.round(avg), amount: Math.round(amount), under1y: months < 12 };
  }

  var BRACKETS_YEAR = [[120e6, 0.05], [360e6, 0.10], [720e6, 0.20], [1200e6, 0.30], [Infinity, 0.35]];
  function pitYear(taxable) {
    var tax = 0, lo = 0;
    for (var i = 0; i < BRACKETS_YEAR.length && taxable > lo; i++) {
      var hi = BRACKETS_YEAR[i][0]; tax += (Math.min(taxable, hi) - lo) * BRACKETS_YEAR[i][1]; lo = hi;
    }
    return Math.round(tax);
  }
  // o: { income, insurance, dependentMonths, other, withheld }
  function settlement(o) {
    var self = 186e6, deps = 6.2e6 * (o.dependentMonths || 0);
    var taxable = Math.max(0, (o.income || 0) - (o.insurance || 0) - self - deps - (o.other || 0));
    var tax = pitYear(taxable), diff = (o.withheld || 0) - tax;
    return { selfDeduction: self, dependentDeduction: deps, taxable: taxable, tax: tax, refund: diff > 0 ? diff : 0, due: diff < 0 ? -diff : 0 };
  }

  var API = { REGION_MIN: REGION_MIN, unemployment: unemployment, COEF_2026: COEF_2026, coef: coef, lumpSum: lumpSum, pitYear: pitYear, settlement: settlement };
  if (typeof module === "object" && module.exports) module.exports = API; else root.BaoHiem = API;
})(this);
