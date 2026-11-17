// Dữ liệu lịch vạn sự cho các trang tĩnh (van_su_pages.py gọi): node tools/van_su_data.js <năm> <tháng> <năm cuối> <tháng cuối> <năm Tết>
// In ra JSON: { days: [ {...từng ngày...} ], xongDat: {...} }, tính bằng chính van-su.js / xong-dat.js mà trình duyệt dùng.
const A = require("../site/static/js/am-lich.js");
const V = require("../site/static/js/van-su.js");
const X = require("../site/static/js/xong-dat.js");
const [y1, m1, y2, m2, tet] = process.argv.slice(2).map(Number);
const days = [];
for (let jd = A.jdFromDate(1, m1, y1), end = A.jdFromDate(1, m2 === 12 ? 1 : m2 + 1, m2 === 12 ? y2 + 1 : y2); jd < end; jd++) {
  const d = A.jdToDate(jd), i = V.day(d.day, d.month, d.year);
  days.push({
    d: d.day, m: d.month, y: d.year, wd: i.weekday, ld: i.lunar.day, lm: i.lunar.month, ly: i.lunar.year, leap: i.lunar.leap,
    ccDay: i.canChi.day, ccMonth: i.canChi.month, ccYear: i.canChi.year, spirit: i.spirit, hd: i.hoangDao, truc: i.truc,
    trucNote: i.trucNote, tiet: i.tiet.name, tietStarts: i.tiet.starts, hours: i.hours.map(h => h.label), xung: i.xung,
    xungChi: i.xungChi, tamNuong: i.tamNuong, nguyetKy: i.nguyetKy, goodFor: i.goodFor,
    hols: A.holidays(d.day, d.month, d.year).map(h => [h.name, h.off])
  });
}
const owners = {};
for (let y = 1960; y <= 2005; y++) owners[y] = X.forOwner(y, tet);
process.stdout.write(JSON.stringify({ days, acts: V.ACTS, actOrder: V.ACT_ORDER, xongDat: { year: X.yearInfo(tet), owners } }));
