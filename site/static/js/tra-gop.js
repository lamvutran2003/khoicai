/* Lịch trả nợ vay trả góp theo tháng.
 *   method "declining": trả gốc đều mỗi tháng, lãi tính trên dư nợ còn lại (ngân hàng hay dùng)
 *   method "annuity":   tổng tiền trả mỗi tháng bằng nhau, lãi trên dư nợ giảm dần
 *   method "flat":      lãi phẳng, lãi mỗi tháng tính trên số tiền vay ban đầu (công ty tài chính, trả góp mua hàng)
 */
(function (root) {
  function schedule(principal, ratePerYear, months, method) {
    var r = ratePerYear / 100 / 12, bal = principal, rows = [], i;
    var gocDeu = principal / months;
    var annuity = r ? principal * r / (1 - Math.pow(1 + r, -months)) : principal / months;
    for (i = 1; i <= months; i++) {
      var interest, princ;
      if (method === "flat") { interest = principal * r; princ = gocDeu; }
      else if (method === "annuity") { interest = bal * r; princ = i === months ? bal : annuity - interest; }
      else { interest = bal * r; princ = i === months ? bal : gocDeu; }
      bal = Math.max(0, bal - princ);
      rows.push({ month: i, principal: princ, interest: interest, payment: princ + interest, balance: bal });
    }
    var totalInterest = rows.reduce(function (s, x) { return s + x.interest; }, 0);
    return { rows: rows, totalInterest: totalInterest, total: principal + totalInterest, first: rows[0].payment, last: rows[rows.length - 1].payment };
  }

  // Lãi suất năm tương đương trên dư nợ giảm dần cho một khoản trả đều mỗi tháng (dùng để so lãi phẳng với lãi ngân hàng)
  function equivalentRate(principal, payment, months) {
    var lo = 0, hi = 2;   // lãi tháng 0%–200%
    for (var k = 0; k < 200; k++) {
      var mid = (lo + hi) / 2, p = mid ? principal * mid / (1 - Math.pow(1 + mid, -months)) : principal / months;
      if (p > payment) hi = mid; else lo = mid;
    }
    return lo * 12 * 100;
  }

  var API = { schedule: schedule, equivalentRate: equivalentRate };
  if (typeof module === "object" && module.exports) module.exports = API; else root.TraGop = API;
})(this);
