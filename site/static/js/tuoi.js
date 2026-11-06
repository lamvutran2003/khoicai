/* Tuổi: tuổi chính xác, tuổi mụ, năm âm lịch, can chi, con giáp, mệnh (ngũ hành nạp âm). Cần am-lich.js.
 * Người sinh trước Tết thuộc năm âm lịch trước: sinh 20/1/1998 là năm Đinh Sửu (1997), không phải Mậu Dần.
 */
(function (root) {
  var A = (typeof module === "object" && module.exports) ? require("./am-lich.js") : root.AmLich;
  var CHI_ANIMAL = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"];
  var CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  // 30 nạp âm, mỗi nạp âm cho 2 năm liền nhau, bắt đầu từ Giáp Tý
  var NAP_AM = ["Hải Trung Kim", "Lư Trung Hỏa", "Đại Lâm Mộc", "Lộ Bàng Thổ", "Kiếm Phong Kim", "Sơn Đầu Hỏa",
    "Giản Hạ Thủy", "Thành Đầu Thổ", "Bạch Lạp Kim", "Dương Liễu Mộc", "Tuyền Trung Thủy", "Ốc Thượng Thổ",
    "Tích Lịch Hỏa", "Tùng Bách Mộc", "Trường Lưu Thủy", "Sa Trung Kim", "Sơn Hạ Hỏa", "Bình Địa Mộc",
    "Bích Thượng Thổ", "Kim Bạch Kim", "Phú Đăng Hỏa", "Thiên Hà Thủy", "Đại Trạch Thổ", "Thoa Xuyến Kim",
    "Tang Đố Mộc", "Đại Khê Thủy", "Sa Trung Thổ", "Thiên Thượng Hỏa", "Thạch Lựu Mộc", "Đại Hải Thủy"];

  function yearInfo(lunarYear) {
    var i = ((lunarYear - 4) % 60 + 60) % 60, nap = NAP_AM[Math.floor(i / 2)];
    return { year: lunarYear, canChi: A.canChiYear(lunarYear), animal: CHI_ANIMAL[(lunarYear + 8) % 12], chi: CHI[(lunarYear + 8) % 12],
             napAm: nap, element: nap.split(" ").pop() };
  }

  // birth, at: {day, month, year} dương lịch
  function age(birth, at) {
    var y = at.year - birth.year, m = at.month - birth.month, d = at.day - birth.day;
    if (d < 0) { m--; var prevLast = A.jdFromDate(1, at.month, at.year) - 1; d += A.jdToDate(prevLast).day; }
    if (m < 0) { y--; m += 12; }
    var jb = A.jdFromDate(birth.day, birth.month, birth.year), ja = A.jdFromDate(at.day, at.month, at.year);
    var lb = A.toLunar(birth.day, birth.month, birth.year), la = A.toLunar(at.day, at.month, at.year);
    // sinh nhật dương lịch kế tiếp
    var ny = at.year, next;
    for (;;) {
      var dd = birth.day, mm = birth.month;
      if (mm === 2 && dd === 29 && !((ny % 4 === 0 && ny % 100 !== 0) || ny % 400 === 0)) dd = 28;
      next = A.jdFromDate(dd, mm, ny);
      if (next >= ja) break;
      ny++;
    }
    return { years: y, months: m, days: d, totalDays: ja - jb, weeks: Math.floor((ja - jb) / 7), nominal: la.year - lb.year + 1,
             lunarBirth: lb, info: yearInfo(lb.year), nextBirthdayIn: next - ja };
  }

  var API = { age: age, yearInfo: yearInfo };
  if (typeof module === "object" && module.exports) module.exports = API; else root.Tuoi = API;
})(this);
