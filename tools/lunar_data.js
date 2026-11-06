// Dữ liệu lịch âm cho các trang tĩnh "Lịch âm tháng M năm Y" (build.py gọi: node tools/lunar_data.js 2025 2028)
// In ra JSON: { years: {Y: {canChi, tet, leap}}, days: {"Y-M-D": [ngàyÂm, thángÂm, nămÂm, nhuận, canChiNgày, thứ, [[tên lễ, nghỉ]...]]} }
const A = require("../site/static/js/am-lich.js");
const [from, to] = process.argv.slice(2).map(Number);
const out = { years: {}, days: {} };
for (let y = from; y <= to; y++) {
  const tet = A.toSolar(1, 1, y, false);
  out.years[y] = { canChi: A.canChiYear(y), tet: [tet.day, tet.month, tet.year], leap: A.leapMonthOf(y) };
  for (let jd = A.jdFromDate(1, 1, y); jd < A.jdFromDate(1, 1, y + 1); jd++) {
    const d = A.jdToDate(jd), l = A.toLunar(d.day, d.month, d.year);
    out.days[`${d.year}-${d.month}-${d.day}`] = [l.day, l.month, l.year, l.leap, A.canChiDay(jd), A.weekday(jd),
      A.holidays(d.day, d.month, d.year).map(h => [h.name, h.off])];
  }
}
process.stdout.write(JSON.stringify(out));
