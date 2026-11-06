/* Tiền điện sinh hoạt theo biểu giá bậc thang.
 * Biểu giá 5 bậc theo Quyết định 2892/QĐ-BCT, áp dụng từ 01/11/2026 (giá chưa gồm thuế GTGT).
 * Nhiều hộ dùng chung một công tơ: định mức mỗi bậc nhân với số hộ.
 * Thuế GTGT: 8% đến hết 31/12/2026 (Nghị quyết 204/2025/QH15), sau đó 10%.
 */
(function (root) {
  var TARIFF = { from: "01/11/2026", basis: "Quyết định 2892/QĐ-BCT", tiers: [[100, 1901], [200, 2289], [400, 2894], [700, 3456], [Infinity, 3844]] };

  function vatRate(date) {
    date = date || new Date();
    return date < new Date(2027, 0, 1) ? 0.08 : 0.10;
  }

  // kwh: điện năng tiêu thụ; households: số hộ dùng chung công tơ; vat: thuế suất (mặc định theo ngày hôm nay)
  function bill(kwh, households, vat) {
    households = Math.max(1, Math.floor(households || 1));
    vat = vat == null ? vatRate() : vat;
    var rows = [], lo = 0, left = Math.max(0, kwh);
    for (var i = 0; i < TARIFF.tiers.length && left > 0; i++) {
      var hi = TARIFF.tiers[i][0] * households, q = Math.min(left, hi - lo);
      rows.push({ tier: i + 1, from: lo + 1, to: hi, kwh: q, price: TARIFF.tiers[i][1], amount: Math.round(q * TARIFF.tiers[i][1]) });
      left -= q; lo = hi;
    }
    var net = rows.reduce(function (s, r) { return s + r.amount; }, 0), tax = Math.round(net * vat);
    return { rows: rows, net: net, vat: vat, tax: tax, total: net + tax };
  }

  var API = { TARIFF: TARIFF, bill: bill, vatRate: vatRate };
  if (typeof module === "object" && module.exports) module.exports = API; else root.TienDien = API;
})(this);
