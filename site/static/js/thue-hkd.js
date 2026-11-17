/* Thuế hộ kinh doanh, cá nhân kinh doanh từ năm 2026 (bỏ thuế khoán, tự kê khai).
 * Căn cứ: Luật Thuế TNCN 2025 (109/2025/QH15); Nghị định 68/2026/NĐ-CP sửa đổi bởi Nghị định 141/2026/NĐ-CP
 * (ngưỡng 1 tỷ đồng/năm); Nghị định 398/2026/NĐ-CP (giảm 30% thuế TNCN năm 2026, 2027 khi doanh thu không quá 10 tỷ);
 * Nghị định 174/2025/NĐ-CP (giảm 20% tỷ lệ % tính thuế GTGT cho hàng hoá, dịch vụ được giảm, đến 31/12/2026).
 *
 *   ThueHKD.calc({ group: "hang-hoa", revenue: 2e9 })  ->  { vat, pit, total, methods, ... }
 */
(function (root) {
  var THRESHOLD = 1e9, SMALL = 3e9, MID = 50e9, CUT_LIMIT = 10e9;
  var GROUPS = [
    { id: "hang-hoa", name: "Phân phối, cung cấp hàng hoá", short: "Bán hàng hoá", vat: 0.01, pit: 0.005 },
    { id: "dich-vu", name: "Dịch vụ, xây dựng không bao thầu nguyên vật liệu", short: "Dịch vụ", vat: 0.05, pit: 0.02 },
    { id: "san-xuat", name: "Sản xuất, vận tải, dịch vụ có gắn với hàng hoá (ăn uống…), xây dựng có bao thầu nguyên vật liệu",
      short: "Sản xuất, vận tải, ăn uống", vat: 0.03, pit: 0.015 },
    { id: "khac", name: "Hoạt động kinh doanh khác", short: "Kinh doanh khác", vat: 0.02, pit: 0.01 }
  ];
  var byId = {}; GROUPS.forEach(function (g) { byId[g.id] = g; });

  // Thuế suất TNCN khi tính trên thu nhập (doanh thu − chi phí hợp lý)
  function incomeRate(revenue) { return revenue <= SMALL ? 0.15 : revenue <= MID ? 0.17 : 0.20; }

  /* o: { group, revenue, cost (chi phí hợp lý, có thể bỏ trống), year (2026 mặc định), vatCut (hàng hoá/dịch vụ được giảm GTGT) } */
  function calc(o) {
    var g = byId[o.group] || GROUPS[0], R = Math.max(0, Math.round(o.revenue || 0)), year = o.year || 2026;
    var hasCost = o.cost !== undefined && o.cost !== null && o.cost !== "";
    var cost = hasCost ? Math.max(0, Math.round(o.cost)) : null;
    var out = { group: g, revenue: R, year: year, exempt: R <= THRESHOLD, vat: 0, vatRate: 0, pit: 0, pitBeforeCut: 0, pitCut: 0,
                methods: [], chosen: null, needCost: false, cutApplies: false, vatCutApplies: false };
    out.band = R <= THRESHOLD ? 1 : R <= SMALL ? 2 : R <= MID ? 3 : 4;
    out.einvoice = R > THRESHOLD;
    out.filing = R > THRESHOLD ? "quarter" : "notice";
    if (out.exempt) { out.total = 0; return out; }

    out.vatCutApplies = !!o.vatCut && year === 2026;
    out.vatRate = g.vat * (out.vatCutApplies ? 0.8 : 1);
    out.vat = Math.round(R * out.vatRate);

    if (R <= SMALL) out.methods.push({ id: "revenue", name: "Tỷ lệ trên doanh thu", base: R - THRESHOLD, rate: g.pit, tax: Math.round((R - THRESHOLD) * g.pit) });
    if (hasCost) { var inc = Math.max(0, R - cost); out.methods.push({ id: "income", name: "Trên thu nhập (doanh thu − chi phí)", base: inc, rate: incomeRate(R), tax: Math.round(inc * incomeRate(R)) }); }
    else if (R > SMALL) out.needCost = true;

    if (out.methods.length) {
      out.chosen = out.methods.reduce(function (a, b) { return b.tax < a.tax ? b : a; });
      out.pitBeforeCut = out.chosen.tax;
      out.cutApplies = (year === 2026 || year === 2027) && R <= CUT_LIMIT;
      out.pitCut = out.cutApplies ? Math.round(out.pitBeforeCut * 0.3) : 0;
      out.pit = out.pitBeforeCut - out.pitCut;
    }
    out.total = out.vat + out.pit;
    return out;
  }

  var API = { calc: calc, GROUPS: GROUPS, byId: byId, incomeRate: incomeRate, THRESHOLD: THRESHOLD };
  if (typeof module === "object" && module.exports) module.exports = API; else root.ThueHKD = API;
})(this);
