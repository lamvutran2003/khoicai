// Ví dụ số thuế cho các trang "Thuế hộ kinh doanh <ngành> 2026" (thue_hkd_pages.py gọi), tính bằng chính thue-hkd.js
// node tools/thue_hkd_data.js <năm>  ->  JSON { groups: [...], examples: { <nhóm>: [ {revenue, vat, pit, total} ] } }
const T = require("../site/static/js/thue-hkd.js");
const year = +process.argv[2] || 2026;
const REVS = [8e8, 1.2e9, 1.5e9, 2e9, 2.5e9, 3e9];
const examples = {};
for (const g of T.GROUPS) examples[g.id] = REVS.map(revenue => {
  const r = T.calc({ group: g.id, revenue, year });
  return { revenue, vat: r.vat, pitBefore: r.pitBeforeCut, pitCut: r.pitCut, pit: r.pit, total: r.total };
});
process.stdout.write(JSON.stringify({ groups: T.GROUPS, examples, year }));
