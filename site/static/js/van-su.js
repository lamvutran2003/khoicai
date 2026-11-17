/* Lịch vạn sự: ngày hoàng đạo / hắc đạo, giờ hoàng đạo, trực, tiết khí, tam nương, nguyệt kỵ, tuổi xung. Cần am-lich.js.
 * Theo cách tính phổ biến trong lịch vạn niên Việt Nam; chỉ mang tính tham khảo theo phong tục.
 *
 *   VanSu.day(17, 11, 2026)  -> { lunar, canChi, spirit, hoangDao, truc, tiet, hours, xung, tamNuong, nguyetKy, goodFor }
 *   VanSu.goodDays("cuoi-hoi", 12, 2026) -> các ngày dương trong tháng 12/2026 hợp việc cưới hỏi
 */
(function (root) {
  var A = (typeof module === "object" && module.exports) ? require("./am-lich.js") : root.AmLich;
  var TZ = 7, PI = Math.PI, INT = Math.floor;
  var CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  // 12 thần trực nhật; true = hoàng đạo
  var SPIRITS = [["Thanh Long", true], ["Minh Đường", true], ["Thiên Hình", false], ["Chu Tước", false], ["Kim Quỹ", true],
    ["Kim Đường", true], ["Bạch Hổ", false], ["Ngọc Đường", true], ["Thiên Lao", false], ["Huyền Vũ", false], ["Tư Mệnh", true], ["Câu Trần", false]];
  var TRUC = ["Kiến", "Trừ", "Mãn", "Bình", "Định", "Chấp", "Phá", "Nguy", "Thành", "Thu", "Khai", "Bế"];
  var TRUC_NOTE = ["Tốt cho xuất hành, nhậm chức; kỵ động thổ", "Tốt cho dọn dẹp, chữa bệnh; kỵ cưới hỏi, khai trương",
    "Tốt cho cầu tài, khai trương, cúng lễ", "Tốt cho việc thường ngày, sửa sang", "Tốt cho cưới hỏi, khai trương, giao dịch, nhập trạch",
    "Tốt cho xây dựng, tu sửa; kỵ xuất hành, khai trương", "Xấu cho hầu hết việc lớn, chỉ hợp phá dỡ",
    "Xấu cho hầu hết việc lớn", "Tốt cho mọi việc: cưới hỏi, khai trương, nhập trạch, động thổ",
    "Tốt cho thu tiền, nhập kho; kỵ khai trương, an táng", "Tốt cho khai trương, cưới hỏi, động thổ, xuất hành",
    "Xấu cho hầu hết việc lớn, chỉ hợp đắp đê, lấp hố"];
  // 24 tiết khí, mỗi tiết 15° kinh độ mặt trời, bắt đầu từ Xuân phân (0°)
  var TIET = ["Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng", "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu",
    "Xử thử", "Bạch lộ", "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết", "Đông chí", "Tiểu hàn",
    "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập"];
  // Việc → các trực hợp (ngày còn phải là hoàng đạo, không phạm tam nương, nguyệt kỵ)
  var ACTS = {
    "cuoi-hoi": { name: "Cưới hỏi", truc: ["Định", "Thành", "Khai"] },
    "dong-tho": { name: "Động thổ, làm nhà", truc: ["Định", "Chấp", "Thành", "Khai"] },
    "nhap-trach": { name: "Chuyển nhà, nhập trạch", truc: ["Mãn", "Định", "Thành", "Khai"] },
    "khai-truong": { name: "Khai trương", truc: ["Mãn", "Định", "Thành", "Khai"] },
    "mua-xe": { name: "Mua xe", truc: ["Mãn", "Định", "Thành", "Khai"] },
    "xuat-hanh": { name: "Xuất hành, đi xa", truc: ["Kiến", "Mãn", "Thành", "Khai"] }
  };
  var ACT_ORDER = ["cuoi-hoi", "dong-tho", "nhap-trach", "khai-truong", "mua-xe", "xuat-hanh"];

  // Kinh độ mặt trời (độ, 0..360) lúc 0h giờ Việt Nam của ngày jdn (cùng công thức với am-lich.js)
  function sunLongDeg(jdn) {
    var T = (jdn - 2451545.5 - TZ / 24) / 36525, T2 = T * T, dr = PI / 180;
    var M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    var L = (L0 + DL) % 360;
    return L < 0 ? L + 360 : L;
  }
  // Tiết khí của ngày (tính theo cuối ngày: ngày bắt đầu tiết thuộc về tiết mới)
  function tiet(jd) {
    var a = INT(sunLongDeg(jd) / 15), b = INT(sunLongDeg(jd + 1) / 15);
    return { index: b, name: TIET[b], starts: a !== b };
  }
  // Địa chi của tháng theo tiết (tháng Dần bắt đầu từ Lập xuân 315°), dùng để tính trực
  function tietMonthChi(jd) {
    var deg = sunLongDeg(jd + 1), k = INT(((deg - 315 + 360) % 360) / 30);
    return (2 + k) % 12;
  }
  var dayChi = function (jd) { return (jd + 1) % 12; };

  function hours(chiDay) {
    var start = (8 + 2 * (chiDay % 6)) % 12, out = [];
    for (var h = 0; h < 12; h++) {
      var s = SPIRITS[(h - start + 12) % 12];
      if (s[1]) {
        var from = (2 * h + 23) % 24, to = (2 * h + 1) % 24;
        out.push({ chi: CHI[h], from: from, to: to, label: CHI[h] + " (" + from + "h–" + to + "h)" });
      }
    }
    return out;
  }

  function day(dd, mm, yy) {
    var jd = A.jdFromDate(dd, mm, yy), l = A.toLunar(dd, mm, yy), c = dayChi(jd);
    var sp = SPIRITS[(c - 2 * ((l.month - 1) % 6) + 12) % 12];
    var truc = TRUC[(c - tietMonthChi(jd) + 12) % 12];
    var tamNuong = [3, 7, 13, 18, 22, 27].indexOf(l.day) >= 0, nguyetKy = [5, 14, 23].indexOf(l.day) >= 0;
    var info = {
      jd: jd, solar: { day: dd, month: mm, year: yy }, weekday: A.weekday(jd), lunar: l,
      canChi: { day: A.canChiDay(jd), month: A.canChiMonth(l.month, l.year), year: A.canChiYear(l.year) },
      chi: c, spirit: sp[0], hoangDao: sp[1], truc: truc, trucNote: TRUC_NOTE[TRUC.indexOf(truc)], tiet: tiet(jd),
      hours: hours(c), xung: CHI[(c + 6) % 12], xungChi: (c + 6) % 12, tamNuong: tamNuong, nguyetKy: nguyetKy, goodFor: []
    };
    if (sp[1] && !tamNuong && !nguyetKy)
      ACT_ORDER.forEach(function (k) { if (ACTS[k].truc.indexOf(truc) >= 0) info.goodFor.push(k); });
    return info;
  }

  function goodDays(act, mm, yy) {
    var out = [], n = A.jdFromDate(1, mm === 12 ? 1 : mm + 1, mm === 12 ? yy + 1 : yy) - A.jdFromDate(1, mm, yy);
    for (var d = 1; d <= n; d++) { var i = day(d, mm, yy); if (i.goodFor.indexOf(act) >= 0) out.push(i); }
    return out;
  }

  // Quan hệ hai địa chi: tam hợp, lục hợp, lục xung, lục hại (theo chỉ số 0..11, Tý = 0)
  function chiRelation(a, b) {
    if (a === b) return "trùng";
    if ((a - b + 12) % 4 === 0) return "tam hợp";
    if ((a + b) % 12 === 1) return "lục hợp";
    if ((a - b + 12) % 12 === 6) return "lục xung";
    if ((a + b) % 12 === 7) return "lục hại";
    return "";
  }

  var API = { day: day, goodDays: goodDays, hours: hours, tiet: tiet, sunLongDeg: sunLongDeg, chiRelation: chiRelation,
              ACTS: ACTS, ACT_ORDER: ACT_ORDER, CHI: CHI, TRUC: TRUC, SPIRITS: SPIRITS };
  if (typeof module === "object" && module.exports) module.exports = API; else root.VanSu = API;
})(this);
