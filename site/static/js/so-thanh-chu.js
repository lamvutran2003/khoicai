/* Đọc số / số tiền thành chữ tiếng Việt. Chạy trong trình duyệt và Node (để kiểm thử).
 *
 *   SoThanhChu.parse("1.250.000,5")            -> { neg:false, int:"1250000", frac:"5" }
 *   SoThanhChu.read("1250000", { unit:"dong" }) -> "Một triệu hai trăm năm mươi nghìn đồng"
 *
 * Tuỳ chọn: linh ("linh" | "lẻ"), nghin ("nghìn" | "ngàn"), tu (true: "hai mươi tư"; false: "hai mươi bốn"),
 *           unit ("dong" | "usd" | "eur" | "none"), chan (thêm "chẵn" khi không có phần lẻ), caps ("sentence" | "lower" | "title" | "upper").
 */
(function (root) {
  var DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  // Đọc nhóm 3 chữ số. full = đọc cả "không trăm" (khi không phải nhóm đứng đầu).
  function group(n, full, o) {
    var h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10, w = [];
    if (h > 0 || full) w.push(DIGITS[h], "trăm");
    if (t === 0) {
      if (u > 0) { if (h > 0 || full) w.push(o.linh); w.push(DIGITS[u]); }
    } else if (t === 1) {
      w.push("mười");
      if (u === 5) w.push("lăm"); else if (u > 0) w.push(DIGITS[u]);
    } else {
      w.push(DIGITS[t], "mươi");
      if (u === 1) w.push("mốt");
      else if (u === 4) w.push(o.tu ? "tư" : "bốn");
      else if (u === 5) w.push("lăm");
      else if (u > 0) w.push(DIGITS[u]);
    }
    return w;
  }

  // Tên hàng cho nhóm thứ g (0 = đơn vị): "", nghìn, triệu, tỷ, nghìn tỷ, triệu tỷ, tỷ tỷ…
  function scale(g, o) {
    var w = [];
    if (g % 3 === 1) w.push(o.nghin); else if (g % 3 === 2) w.push("triệu");
    for (var i = 0; i < Math.floor(g / 3); i++) w.push("tỷ");
    return w;
  }

  function readInt(digits, o) {
    digits = String(digits).replace(/^0+(?=\d)/, "");
    if (/^0*$/.test(digits)) return ["không"];
    var groups = [];
    for (var i = digits.length; i > 0; i -= 3) groups.unshift(+digits.slice(Math.max(0, i - 3), i));
    var w = [], first = true;
    for (var k = 0; k < groups.length; k++) {
      var g = groups.length - 1 - k, n = groups[k];
      if (n === 0) {
        // Giữ chữ "tỷ" khi cả nhóm hàng tỷ bằng 0 nhưng còn các nhóm cao hơn: 1.000.000.000.000.000 = "một triệu tỷ" (đã có trong scale)
        continue;
      }
      w = w.concat(group(n, !first, o), scale(g, o));
      first = false;
    }
    return w;
  }

  // Phần thập phân: các số 0 ở đầu đọc "không", phần còn lại đọc như số. 2,05 -> "hai phẩy không năm"
  function readFrac(frac, o) {
    var w = [], m = frac.match(/^(0*)(\d*)$/);
    for (var i = 0; i < m[1].length; i++) w.push("không");
    if (m[2]) w = w.concat(readInt(m[2], o));
    return w;
  }

  var UNITS = {
    dong: { main: "đồng" },
    usd: { main: "đô la Mỹ", sub: "xu", subDigits: 2 },
    eur: { main: "euro", sub: "cent", subDigits: 2 },
    none: { main: "" }
  };

  function caps(s, mode) {
    if (mode === "upper") return s.toLocaleUpperCase("vi");
    if (mode === "lower") return s;
    if (mode === "title") return s.replace(/(^|\s)(\S)/g, function (a, sp, c) { return sp + c.toLocaleUpperCase("vi"); });
    return s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);
  }

  function read(input, opts) {
    var o = { linh: "linh", nghin: "nghìn", tu: true, unit: "dong", chan: false, caps: "sentence" };
    for (var k in (opts || {})) o[k] = opts[k];
    var p = typeof input === "object" ? input : parse(input);
    if (!p) return "";
    var u = UNITS[o.unit] || UNITS.dong, w = [];
    if (p.neg) w.push("âm");
    w = w.concat(readInt(p["int"], o));
    var frac = (p.frac || "").replace(/0+$/, "");
    if (u.sub && frac) {                                   // USD/EUR: phần lẻ là xu/cent
      var cents = (frac + "00").slice(0, u.subDigits);
      if (u.main) w.push(u.main);
      if (+cents) w = w.concat(["và"], readInt(cents, o), [u.sub]);
    } else {
      if (frac) w = w.concat(["phẩy"], readFrac(frac, o));
      if (u.main) w.push(u.main);
    }
    if (o.chan && !frac && u.main) w.push("chẵn");
    return caps(w.join(" "), o.caps);
  }

  // "1.250.000" "1,250,000" "1 250 000" "1250000,5" "1.250.000,50" "-12.5" -> {neg, int, frac}; null nếu không hợp lệ
  function parse(str) {
    var s = String(str || "").trim().replace(/[\s ₫đĐ]|vnd|VND|usd|USD|\$|€/g, "");
    if (!s) return null;
    var neg = false;
    if (/^[-−]/.test(s)) { neg = true; s = s.slice(1); }
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length, dec = null;
    if (dots && commas) dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    else if (dots || commas) {
      var sep = dots ? "." : ",", parts = s.split(sep), n = dots || commas;
      // Một dấu, phía sau không đúng 3 chữ số -> dấu thập phân (12,5 / 1.25); còn lại là dấu phân cách hàng nghìn
      if (n === 1 && parts[1].length !== 3) dec = sep;
      else if (n > 1 && !parts.slice(1).every(function (x) { return x.length === 3; })) return null;
    }
    var intPart = s, frac = "";
    if (dec) { var i = s.lastIndexOf(dec); intPart = s.slice(0, i); frac = s.slice(i + 1); }
    intPart = intPart.replace(/[.,]/g, "");
    if (!/^\d*$/.test(intPart) || !/^\d*$/.test(frac) || (!intPart && !frac)) return null;
    if (intPart.length > 27) return null;                    // đến hàng tỷ tỷ tỷ là đủ
    return { neg: neg && /[1-9]/.test(intPart + frac), "int": intPart || "0", frac: frac };
  }

  // Định dạng số kiểu Việt Nam: 1250000.5 -> "1.250.000,5"
  function format(p) {
    if (!p) return "";
    var i = p["int"].replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (p.neg ? "-" : "") + i + (p.frac ? "," + p.frac : "");
  }

  var API = { read: read, parse: parse, format: format, readInt: readInt };
  if (typeof module === "object" && module.exports) module.exports = API; else root.SoThanhChu = API;
})(this);
