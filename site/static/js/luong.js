/* Lương Gross ↔ Net cho người lao động cư trú, hợp đồng từ 3 tháng (khấu trừ theo biểu luỹ tiến).
 *
 * Quy định áp dụng (cập nhật khi luật đổi, xem RULES):
 *   - Thuế TNCN tiền lương: biểu 5 bậc 5/10/20/30/35% (Luật Thuế TNCN số 109/2025/QH15, áp dụng từ kỳ tính thuế 2026)
 *   - Giảm trừ gia cảnh: bản thân 15,5 triệu/tháng, mỗi người phụ thuộc 6,2 triệu/tháng (từ kỳ tính thuế 2026)
 *   - Bảo hiểm người lao động: BHXH 8%, BHYT 1,5%, BHTN 1%; công ty: BHXH 17,5% (gồm TNLĐ-BNN 0,5%), BHYT 3%, BHTN 1%
 *   - Trần đóng BHXH, BHYT: 20 × lương cơ sở (2.530.000 đ từ 1/7/2026 → 50,6 triệu)
 *   - Trần đóng BHTN: 20 × lương tối thiểu vùng (Nghị định 293/2025/NĐ-CP, từ 1/1/2026)
 */
(function (root) {
  var RULES = {
    updated: "07/2026",
    selfDeduction: 15500000, dependentDeduction: 6200000,
    baseSalary: 2530000,
    regionMin: { 1: 5310000, 2: 4730000, 3: 4140000, 4: 3700000 },
    employee: { bhxh: 0.08, bhyt: 0.015, bhtn: 0.01 },
    employer: { bhxh: 0.175, bhyt: 0.03, bhtn: 0.01 },
    brackets: [[10e6, 0.05], [30e6, 0.10], [60e6, 0.20], [100e6, 0.30], [Infinity, 0.35]]
  };

  function pit(taxable) {
    var tax = 0, lo = 0;
    for (var i = 0; i < RULES.brackets.length && taxable > lo; i++) {
      var hi = RULES.brackets[i][0];
      tax += (Math.min(taxable, hi) - lo) * RULES.brackets[i][1];
      lo = hi;
    }
    return tax;
  }

  // gross: lương gross/tháng; o: { dependents, region (1–4), insuranceBase (mặc định = gross) }
  function fromGross(gross, o) {
    o = o || {};
    var deps = o.dependents || 0, region = o.region || 1;
    var base = o.insuranceBase == null ? gross : o.insuranceBase;
    var capSocial = 20 * RULES.baseSalary, capUnemp = 20 * RULES.regionMin[region];
    var bSocial = Math.min(base, capSocial), bUnemp = Math.min(base, capUnemp);
    var e = RULES.employee, c = RULES.employer, round = Math.round;
    var ins = { bhxh: round(bSocial * e.bhxh), bhyt: round(bSocial * e.bhyt), bhtn: round(bUnemp * e.bhtn) };
    ins.total = ins.bhxh + ins.bhyt + ins.bhtn;
    var company = { bhxh: round(bSocial * c.bhxh), bhyt: round(bSocial * c.bhyt), bhtn: round(bUnemp * c.bhtn) };
    company.total = company.bhxh + company.bhyt + company.bhtn;
    var beforeTax = gross - ins.total;
    var deduction = RULES.selfDeduction + deps * RULES.dependentDeduction;
    var taxable = Math.max(0, beforeTax - deduction);
    var tax = round(pit(taxable));
    return { gross: gross, insurance: ins, beforeTax: beforeTax, selfDeduction: RULES.selfDeduction,
             dependentDeduction: deps * RULES.dependentDeduction, taxable: taxable, tax: tax,
             net: gross - ins.total - tax, company: company, cost: gross + company.total };
  }

  // Tìm gross cho một mức net (net tăng đơn điệu theo gross nên tìm nhị phân được)
  function fromNet(net, o) {
    o = o || {};
    var fixedBase = o.insuranceBase != null;
    var f = function (g) { return fromGross(g, Object.assign({}, o, { insuranceBase: fixedBase ? o.insuranceBase : g })); };
    var lo = net, hi = net * 2 + 1e8;
    for (var i = 0; i < 100 && hi - lo > 0.5; i++) { var mid = (lo + hi) / 2; if (f(mid).net < net) lo = mid; else hi = mid; }
    var g = Math.round(hi);
    while (g > 0 && f(g - 1).net >= net) g--;   // gross nhỏ nhất cho ra đủ net
    return f(g);
  }

  var API = { RULES: RULES, pit: pit, fromGross: fromGross, fromNet: fromNet };
  if (typeof module === "object" && module.exports) module.exports = API; else root.Luong = API;
})(this);
