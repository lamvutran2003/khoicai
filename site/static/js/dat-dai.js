/* Quy đổi đơn vị đo diện tích đất truyền thống (sào, mẫu, thước, công) sang m² và ngược lại.
 *
 * Giá trị theo cách dùng phổ biến từng vùng:
 *   Bắc Bộ:   1 thước = 24 m², 1 sào = 15 thước = 360 m², 1 mẫu = 10 sào = 3.600 m²
 *   Trung Bộ: 1 sào = 497 m² (nhiều nơi làm tròn 500), 1 thước = 1/15 sào, 1 mẫu = 10 sào
 *   Nam Bộ:   1 công = 1.000 m² (công tầm nhỏ) hoặc 1.296 m² (công tầm lớn, tầm 3,6 m: 12 × 12 tầm)
 *
 *   DatDai.toM2(2, "sao", "bac")            -> 720
 *   DatDai.mixed(5000, "bac")               -> [{unit:"mau",n:1},{unit:"sao",n:3},{unit:"thuoc",n:13},{unit:"m2",n:8}]
 */
(function (root) {
  function regions(o) {
    o = o || {};
    var sTrung = o.trungSao === 500 ? 500 : 497, cong = o.namCong === 1296 ? 1296 : 1000;
    return {
      bac: { name: "Bắc Bộ", units: [
        { id: "mau", name: "mẫu", m2: 3600 }, { id: "sao", name: "sào", m2: 360 }, { id: "thuoc", name: "thước", m2: 24 }] },
      trung: { name: "Trung Bộ", units: [
        { id: "mau", name: "mẫu", m2: sTrung * 10 }, { id: "sao", name: "sào", m2: sTrung }, { id: "thuoc", name: "thước", m2: sTrung / 15 }] },
      nam: { name: "Nam Bộ", units: [
        { id: "cong", name: "công", m2: cong }] }
    };
  }
  var COMMON = [{ id: "m2", name: "m²", m2: 1 }, { id: "ha", name: "ha (héc-ta)", m2: 10000 }, { id: "km2", name: "km²", m2: 1e6 }];

  function unitsOf(region, o) { return regions(o)[region].units.concat(COMMON); }
  function unit(id, region, o) {
    var u = unitsOf(region, o).filter(function (x) { return x.id === id; })[0];
    if (!u) throw new Error("unknown unit " + id + " for " + region);
    return u;
  }
  function toM2(value, unitId, region, o) { return value * unit(unitId, region, o).m2; }
  function fromM2(m2, unitId, region, o) { return m2 / unit(unitId, region, o).m2; }

  // Tách diện tích thành mẫu – sào – thước – m² lẻ (Bắc, Trung) hoặc công – m² lẻ (Nam), như cách nói ở quê.
  function mixed(m2, region, o) {
    var left = Math.round(m2 * 100) / 100, out = [];
    regions(o)[region].units.forEach(function (u) {
      var n = Math.floor((left + 1e-9) / u.m2);
      if (n > 0) { out.push({ unit: u.id, name: u.name, n: n }); left = Math.round((left - n * u.m2) * 100) / 100; }
    });
    if (left > 0.004 || !out.length) out.push({ unit: "m2", name: "m²", n: left });
    return out;
  }

  // Số kiểu Việt Nam lẫn kiểu Anh: "1,5" "1.5" "3.600" "3 600" "1.234,5" -> số; null nếu không đọc được
  function num(str) {
    var s = String(str == null ? "" : str).trim().replace(/[\s ]/g, "");
    if (!s || !/^\d[\d.,]*$/.test(s) && !/^[.,]\d+$/.test(s)) return null;
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length, dec = null;
    if (dots && commas) dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    else if (commas === 1) dec = ",";
    else if (dots === 1) dec = /\.\d{3}$/.test(s) && s.indexOf(".") > 0 ? null : ".";   // 3.600 = ba nghìn sáu trăm
    else if (commas > 1 || dots > 1) {
      var sep = dots ? "." : ",";
      if (!s.split(sep).slice(1).every(function (x) { return x.length === 3; })) return null;
    }
    var i = dec ? s.lastIndexOf(dec) : -1;
    var a = (i >= 0 ? s.slice(0, i) : s).replace(/[.,]/g, ""), b = i >= 0 ? s.slice(i + 1) : "";
    if (/[.,]/.test(b)) return null;
    var v = parseFloat((a || "0") + "." + (b || "0"));
    return isFinite(v) ? v : null;
  }

  function fmt(v, maxFrac) {
    if (v == null || !isFinite(v)) return "";
    var d = maxFrac == null ? (Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 3 : 4) : maxFrac;
    return v.toLocaleString("vi-VN", { maximumFractionDigits: d });
  }

  var API = { regions: regions, COMMON: COMMON, unitsOf: unitsOf, toM2: toM2, fromM2: fromM2, mixed: mixed, num: num, fmt: fmt };
  if (typeof module === "object" && module.exports) module.exports = API; else root.DatDai = API;
})(this);
