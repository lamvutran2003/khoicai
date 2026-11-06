/* Tính ngày: khoảng cách giữa hai ngày, cộng trừ ngày, đếm ngày làm việc (trừ cuối tuần và ngày nghỉ lễ).
 * Ngày được biểu diễn bằng số ngày Julius (jd) để cộng trừ cho chính xác; cần am-lich.js cho Tết và Giỗ Tổ.
 *
 * Ngày nghỉ lễ theo Bộ luật Lao động (Điều 112) + Ngày Văn hóa Việt Nam 24/11 (từ 2026):
 *   1/1; Tết âm lịch 5 ngày (ngày cuối năm cũ + mùng 1–4); Giỗ Tổ 10/3 âm; 30/4; 1/5; Quốc khánh 2/9 + 1/9 (hoặc 3/9);
 *   ngày lễ trùng ngày nghỉ hằng tuần được nghỉ bù vào ngày làm việc kế tiếp.
 *   Lịch hoán đổi ngày làm việc do Chính phủ công bố từng năm không được tính.
 */
(function (root) {
  var A = (typeof module === "object" && module.exports) ? require("./am-lich.js") : root.AmLich;
  var jd = A.jdFromDate, toDate = A.jdToDate;
  var dow = function (j) { return (j + 1) % 7; };   // 0 = Chủ nhật … 6 = thứ Bảy

  function isWeekend(j, satWork) { var d = dow(j); return d === 0 || (d === 6 && !satWork); }

  function holidayList(year) {
    var out = [], add = function (j, name) { out.push({ jd: j, name: name }); };
    add(jd(1, 1, year), "Tết Dương lịch");
    var tet = A.toSolar(1, 1, year, false);
    add(tet.jd - 1, "Tết Nguyên đán (cuối năm)");
    for (var i = 0; i < 4; i++) add(tet.jd + i, "Tết Nguyên đán (mùng " + (i + 1) + ")");
    add(A.toSolar(10, 3, year, false).jd, "Giỗ Tổ Hùng Vương");
    add(jd(30, 4, year), "Ngày Giải phóng miền Nam");
    add(jd(1, 5, year), "Quốc tế Lao động");
    var qk = jd(2, 9, year), extra = dow(qk - 1) === 0 ? qk + 1 : qk - 1;   // ngày liền kề: 1/9, trừ khi 1/9 là Chủ nhật
    add(Math.min(qk, extra), "Quốc khánh"); add(Math.max(qk, extra), "Quốc khánh");
    if (year >= 2026) add(jd(24, 11, year), "Ngày Văn hóa Việt Nam");
    return out.sort(function (a, b) { return a.jd - b.jd; });
  }

  // Ngày nghỉ thực tế (jd -> tên), đã dời ngày lễ trùng cuối tuần sang ngày làm việc kế tiếp
  var cache = {};
  function daysOff(year, satWork) {
    var key = year + (satWork ? "s" : "");
    if (cache[key]) return cache[key];
    var off = {}, list = holidayList(year);
    list.forEach(function (h) { if (!isWeekend(h.jd, satWork)) off[h.jd] = h.name; });
    list.forEach(function (h) {
      if (!isWeekend(h.jd, satWork)) return;
      var j = h.jd + 1;
      while (isWeekend(j, satWork) || off[j]) j++;
      off[j] = h.name + " (nghỉ bù)";
    });
    return (cache[key] = off);
  }
  function offName(j, satWork) { return daysOff(toDate(j).year, satWork)[j] || null; }
  function isWorkday(j, o) { o = o || {}; return !isWeekend(j, o.satWork) && !(o.holidays !== false && offName(j, o.satWork)); }

  // Đếm ngày làm việc từ a đến b (tính cả hai đầu). -> { count, holidays: [{jd, name}] }
  function workdays(a, b, o) {
    if (b < a) { var t = a; a = b; b = t; }
    var n = 0, hol = [];
    for (var j = a; j <= b; j++) {
      if (isWeekend(j, o && o.satWork)) continue;
      var h = o && o.holidays === false ? null : offName(j, o && o.satWork);
      if (h) hol.push({ jd: j, name: h }); else n++;
    }
    return { count: n, holidays: hol };
  }

  // Cộng n ngày làm việc (n âm: lùi lại); ngày gốc không tính
  function addWorkdays(start, n, o) {
    var j = start, step = n < 0 ? -1 : 1, left = Math.abs(n);
    while (left > 0) { j += step; if (isWorkday(j, o)) left--; }
    return j;
  }

  // Cộng tháng/năm: giữ ngày, nếu tháng đích ngắn hơn thì lấy ngày cuối tháng (31/1 + 1 tháng = 28 hoặc 29/2)
  function addMonths(j, months) {
    var d = toDate(j), m0 = d.year * 12 + (d.month - 1) + months, y = Math.floor(m0 / 12), m = m0 - y * 12 + 1;
    var last = jd(1, m === 12 ? 1 : m + 1, m === 12 ? y + 1 : y) - 1;
    return Math.min(jd(1, m, y) + d.day - 1, last);
  }

  // Khoảng cách a -> b theo năm, tháng, ngày (a <= b)
  function ymd(a, b) {
    var sign = 1; if (b < a) { var t = a; a = b; b = t; sign = -1; }
    var months = 0, da = toDate(a), db = toDate(b);
    months = (db.year - da.year) * 12 + (db.month - da.month);
    if (addMonths(a, months) > b) months--;
    var rest = b - addMonths(a, months);
    return { years: Math.floor(months / 12) * sign, months: (months % 12) * sign, days: rest * sign, totalMonths: months * sign };
  }

  var API = { jd: jd, toDate: toDate, dow: dow, holidayList: holidayList, daysOff: daysOff, offName: offName, isWorkday: isWorkday,
              workdays: workdays, addWorkdays: addWorkdays, addMonths: addMonths, ymd: ymd };
  if (typeof module === "object" && module.exports) module.exports = API; else root.Ngay = API;
})(this);
