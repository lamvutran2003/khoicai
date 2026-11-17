/* Chọn tuổi xông đất (xông nhà) đầu năm theo quan niệm dân gian. Cần am-lich.js, tuoi.js, van-su.js.
 * Chấm điểm từng năm sinh của người xông đất theo: địa chi so với tuổi gia chủ (tam hợp, lục hợp / xung, hại),
 * địa chi so với năm mới, ngũ hành nạp âm so với mệnh gia chủ và mệnh năm. Chỉ mang tính tham khảo.
 *
 *   XongDat.forOwner(1985, 2027) -> { owner, year, best: [...], avoid: [...], ownerXungYear }
 */
(function (root) {
  var node = typeof module === "object" && module.exports;
  var T = node ? require("./tuoi.js") : root.Tuoi, V = node ? require("./van-su.js") : root.VanSu;
  var SINH = { Kim: "Thủy", "Thủy": "Mộc", "Mộc": "Hỏa", "Hỏa": "Thổ", "Thổ": "Kim" };
  var KHAC = { Kim: "Mộc", "Mộc": "Thổ", "Thổ": "Thủy", "Thủy": "Hỏa", "Hỏa": "Kim" };

  function yearInfo(y) { var i = T.yearInfo(y); i.chiIndex = (y + 8) % 12; return i; }

  function score(vy, O, Y) {
    var v = yearInfo(vy), s = 0, why = [], bad = [];
    var ro = V.chiRelation(v.chiIndex, O.chiIndex), ry = V.chiRelation(v.chiIndex, Y.chiIndex);
    if (ro === "tam hợp" || ro === "lục hợp") { s += 2; why.push(ro.charAt(0).toUpperCase() + ro.slice(1) + " với tuổi " + O.chi + " của gia chủ"); }
    if (ro === "lục xung") { s -= 3; bad.push("Xung với tuổi " + O.chi + " của gia chủ"); }
    if (ro === "lục hại") { s -= 2; bad.push("Lục hại với tuổi " + O.chi + " của gia chủ"); }
    if (ry === "tam hợp" || ry === "lục hợp") { s += 1; why.push("Hợp với năm " + Y.chi); }
    if (ry === "lục xung") { s -= 2; bad.push("Xung với năm " + Y.chi); }
    if (ry === "lục hại") { s -= 1; bad.push("Hại với năm " + Y.chi); }
    if (SINH[v.element] === O.element) { s += 2; why.push("Mệnh " + v.element + " sinh mệnh " + O.element + " của gia chủ"); }
    else if (v.element === O.element) { s += 1; why.push("Cùng mệnh " + v.element + " với gia chủ"); }
    else if (KHAC[v.element] === O.element) { s -= 2; bad.push("Mệnh " + v.element + " khắc mệnh " + O.element + " của gia chủ"); }
    else if (KHAC[O.element] === v.element) { s -= 1; bad.push("Mệnh gia chủ (" + O.element + ") khắc mệnh " + v.element); }
    if (SINH[v.element] === Y.element || v.element === Y.element) { s += 1; why.push("Mệnh " + v.element + " hợp mệnh năm (" + Y.element + ")"); }
    else if (KHAC[v.element] === Y.element || KHAC[Y.element] === v.element) { s -= 1; bad.push("Mệnh " + v.element + " khắc với mệnh năm (" + Y.element + ")"); }
    return { year: vy, canChi: v.canChi, chi: v.chi, napAm: v.napAm, element: v.element, score: s, why: why, bad: bad };
  }

  // Người xông đất thường là người trưởng thành: xét năm sinh từ 61 đến 21 tuổi mụ ở năm mới
  function forOwner(ownerYear, tetYear) {
    var O = yearInfo(ownerYear), Y = yearInfo(tetYear), all = [];
    for (var vy = tetYear - 60; vy <= tetYear - 20; vy++) all.push(score(vy, O, Y));
    var age = function (r) { return tetYear - r.year + 1; };
    var best = all.filter(function (r) { return r.score >= 2; })
      .sort(function (a, b) { return b.score - a.score || Math.abs(age(a) - 40) - Math.abs(age(b) - 40); }).slice(0, 8);
    var avoid = all.filter(function (r) { return r.score <= -3; }).sort(function (a, b) { return a.score - b.score || a.year - b.year; });
    return { owner: O, year: Y, best: best, avoid: avoid, ownerXungYear: V.chiRelation(O.chiIndex, Y.chiIndex) === "lục xung" };
  }

  var API = { forOwner: forOwner, score: score, yearInfo: yearInfo };
  if (node) module.exports = API; else root.XongDat = API;
})(this);
