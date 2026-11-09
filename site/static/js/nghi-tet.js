/* Lịch nghỉ Tết Âm lịch theo Bộ luật Lao động 2019:
 *  - Điều 112: Tết Âm lịch nghỉ 5 ngày; người sử dụng lao động chọn số ngày trước / sau mùng 1.
 *  - Điều 111 khoản 3: ngày nghỉ hằng tuần trùng ngày Tết thì nghỉ bù vào ngày làm việc kế tiếp.
 * NghiTet.plan(tetJd, before, rest) -> { days: [{jd, kind}], start, end, back, total }
 *   tetJd: số ngày Julius của mùng 1 Tết; before: số ngày nghỉ trước mùng 1 (1–3, còn lại sau Tết);
 *   rest: các thứ nghỉ hằng tuần, 0 = Chủ nhật … 6 = thứ Bảy (mặc định [6, 0]).
 *   kind: "tet" (ngày Tết), "bu" (nghỉ bù), "rest" (nghỉ hằng tuần liền kề).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NghiTet = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var dow = function (jd) { return (jd + 1) % 7; };   // 0 = Chủ nhật

  function plan(tetJd, before, rest) {
    rest = rest || [6, 0];
    var isRest = function (j) { return rest.indexOf(dow(j)) >= 0; };
    var kind = {}, first = tetJd - before, last = first + 4, owed = 0, j;
    for (j = first; j <= last; j++) { kind[j] = "tet"; if (isRest(j)) owed++; }
    for (j = last + 1; owed > 0; j++) {            // nghỉ bù vào ngày làm việc kế tiếp
      if (isRest(j)) kind[j] = "rest"; else { kind[j] = "bu"; owed--; }
    }
    var start = first, end = j - 1;
    while (isRest(start - 1)) kind[--start] = "rest";  // nối ngày nghỉ hằng tuần liền trước, liền sau
    while (isRest(end + 1)) kind[++end] = "rest";
    var days = [];
    for (j = start; j <= end; j++) days.push({ jd: j, kind: kind[j] });
    return { days: days, start: start, end: end, back: end + 1, total: end - start + 1 };
  }

  // Số ngày từ hôm nay (giờ Việt Nam, UTC+7) đến một ngày Julius
  function todayJd(now) {
    var t = (now || new Date()).getTime() + 7 * 3600 * 1000;
    return Math.floor(t / 86400000) + 2440588;
  }

  return { plan: plan, todayJd: todayJd, dow: dow };
});
