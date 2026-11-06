/* Lịch âm Việt Nam (múi giờ UTC+7): đổi ngày dương ↔ âm, can chi.
 * Thuật toán thiên văn của Hồ Ngọc Đức (tính điểm sóc và trung khí theo Jean Meeus).
 *
 *   AmLich.toLunar(17, 2, 2026)          -> { day:1, month:1, year:2026, leap:false }
 *   AmLich.toSolar(1, 1, 2026, false)    -> { day:17, month:2, year:2026 }
 */
(function (root) {
  var TZ = 7, PI = Math.PI, INT = Math.floor;
  var CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
  var CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

  function jdFromDate(dd, mm, yy) {
    var a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    var jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function jdToDate(jd) {
    var a, b, c;
    if (jd > 2299160) { a = jd + 32044; b = INT((4 * a + 3) / 146097); c = a - INT((b * 146097) / 4); }
    else { b = 0; c = jd + 32082; }
    var d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
    return { day: e - INT((153 * m + 2) / 5) + 1, month: m + 3 - 12 * INT(m / 10), year: b * 100 + d - 4800 + INT(m / 10) };
  }
  // Ngày (JD, theo giờ địa phương) của điểm sóc thứ k tính từ 1/1/1900
  function newMoonDay(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    var deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
                         : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return INT(Jd1 + C1 - deltat + 0.5 + TZ / 24);
  }
  // Kinh độ mặt trời lúc 0h ngày jdn, chia thành 12 cung (0..11)
  function sunLongitude(jdn) {
    var T = (jdn - 2451545.5 - TZ / 24) / 36525, T2 = T * T, dr = PI / 180;
    var M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    var L = (L0 + DL) * dr;
    L = L - PI * 2 * INT(L / (PI * 2));
    return INT(L / PI * 6);
  }
  function lunarMonth11(yy) {
    var off = jdFromDate(31, 12, yy) - 2415021, k = INT(off / 29.530588853), nm = newMoonDay(k);
    if (sunLongitude(nm) >= 9) nm = newMoonDay(k - 1);
    return nm;
  }
  function leapMonthOffset(a11) {
    var k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5), last, i = 1, arc = sunLongitude(newMoonDay(k + i));
    do { last = arc; i++; arc = sunLongitude(newMoonDay(k + i)); } while (arc !== last && i < 14);
    return i - 1;
  }

  function toLunar(dd, mm, yy) {
    var dayNumber = jdFromDate(dd, mm, yy), k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = newMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = newMoonDay(k);
    var a11 = lunarMonth11(yy), b11 = a11, lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = lunarMonth11(yy - 1); }
    else { lunarYear = yy + 1; b11 = lunarMonth11(yy + 1); }
    var lunarDay = dayNumber - monthStart + 1, diff = INT((monthStart - a11) / 29), leap = false, lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      var leapDiff = leapMonthOffset(a11);
      if (diff >= leapDiff) { lunarMonth = diff + 10; if (diff === leapDiff) leap = true; }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: leap, jd: dayNumber };
  }

  // null nếu ngày âm không tồn tại (ví dụ tháng nhuận không có trong năm đó, hay ngày 30 của tháng thiếu)
  function toSolar(ld, lm, ly, leap) {
    var a11, b11;
    if (lm < 11) { a11 = lunarMonth11(ly - 1); b11 = lunarMonth11(ly); }
    else { a11 = lunarMonth11(ly); b11 = lunarMonth11(ly + 1); }
    var k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853), off = lm - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      var leapOff = leapMonthOffset(a11), leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;
      if (leap && lm !== leapMonth) return null;
      if (leap || off >= leapOff) off += 1;
    } else if (leap) return null;
    var start = newMoonDay(k + off), next = newMoonDay(k + off + 1);
    if (ld < 1 || ld > next - start) return null;
    var r = jdToDate(start + ld - 1);
    r.jd = start + ld - 1;
    return r;
  }

  // Số ngày của tháng âm (29 hoặc 30) và tháng nhuận của năm âm (0 nếu không có)
  function monthLength(lm, ly, leap) {
    var s = toSolar(1, lm, ly, leap); if (!s) return 0;
    for (var n = 30; n >= 29; n--) if (toSolar(n, lm, ly, leap)) return n;
    return 0;
  }
  function leapMonthOf(ly) {
    for (var m = 1; m <= 12; m++) if (toSolar(1, m, ly, true)) return m;
    return 0;
  }

  var canChiYear = function (y) { return CAN[(y + 6) % 10] + " " + CHI[(y + 8) % 12]; };
  var canChiMonth = function (m, y) { return CAN[(y * 12 + m + 3) % 10] + " " + CHI[(m + 1) % 12]; };
  var canChiDay = function (jd) { return CAN[(jd + 9) % 10] + " " + CHI[(jd + 1) % 12]; };
  var WEEKDAY = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  var weekday = function (jd) { return WEEKDAY[(jd + 1) % 7]; };

  var API = { toLunar: toLunar, toSolar: toSolar, jdFromDate: jdFromDate, jdToDate: jdToDate, monthLength: monthLength,
              leapMonthOf: leapMonthOf, canChiYear: canChiYear, canChiMonth: canChiMonth, canChiDay: canChiDay, weekday: weekday };
  if (typeof module === "object" && module.exports) module.exports = API; else root.AmLich = API;
})(this);
