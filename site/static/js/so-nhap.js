/* Ô nhập số tự thêm dấu chấm phân cách hàng nghìn khi gõ, kiểu Việt Nam: 1250000 -> 1.250.000; dấu phẩy là phần thập phân.
 * Gõ dấu chấm cũng được hiểu là dấu thập phân (đổi thành dấu phẩy). Dán "1,250,000.50" hay "1.250.000" đều đọc đúng.
 *
 *   KCNum.attach(inputEl, { decimals: 2 })   // decimals: số chữ số lẻ tối đa (0 = chỉ số nguyên)
 *   KCNum.format("1250000,5") -> "1.250.000,5"
 */
(function (root) {
  var group = function (d) { return d.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."); };

  // Đọc chuỗi dán vào (có thể kiểu Anh hoặc Việt) -> {neg, int, frac, comma}
  function parsePasted(s) {
    s = String(s).replace(/[^\d.,\-−]/g, "");
    var neg = /^[-−]/.test(s); s = s.replace(/[-−]/g, "");
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length, dec = null;
    if (dots && commas) dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    else if (commas === 1 && !/,\d{3}$/.test(s)) dec = ",";
    else if (dots === 1 && !/\.\d{3}$/.test(s)) dec = ".";
    var i = dec ? s.lastIndexOf(dec) : -1;
    return { neg: neg, "int": (i >= 0 ? s.slice(0, i) : s).replace(/\D/g, ""), frac: i >= 0 ? s.slice(i + 1).replace(/\D/g, "") : "", comma: i >= 0 };
  }

  // Định dạng chuỗi đang gõ. Ở chế độ gõ, dấu chấm là của ta (phân cách nghìn), dấu phẩy là thập phân.
  // typedDot: người dùng vừa gõ dấu "." ở vị trí caret-1 -> hiểu là dấu thập phân.
  function formatTyped(raw, caret, o) {
    o = o || {};
    var maxDec = o.decimals == null ? 2 : o.decimals, s = String(raw);
    if (o.typedDot && caret > 0 && s.charAt(caret - 1) === ".") s = s.slice(0, caret - 1) + "," + s.slice(caret);
    var p;
    if (o.paste) p = parsePasted(s);
    else {
      var neg = /^\s*[-−]/.test(s), c = s.indexOf(",");
      p = { neg: neg, "int": (c >= 0 ? s.slice(0, c) : s).replace(/\D/g, ""), frac: c >= 0 ? s.slice(c + 1).replace(/\D/g, "") : "", comma: c >= 0 };
    }
    if (!o.allowNeg) p.neg = false;
    if (maxDec === 0) { p.comma = false; p.frac = ""; }
    p.frac = p.frac.slice(0, maxDec);
    var intOut = p["int"] ? group(p["int"]) : (p.comma ? "0" : "");
    var value = (p.neg ? "-" : "") + intOut + (p.comma ? "," + p.frac : "");
    // Caret: giữ sau đúng số "ký tự có nghĩa" (chữ số, dấu phẩy, dấu trừ) đứng trước nó
    var before = s.slice(0, caret).replace(/[^\d,\-−]/g, "").length, pos = 0, seen = 0;
    if (!p["int"] && p.comma && before > 0) before++;      // đã chèn "0" trước dấu phẩy
    while (pos < value.length && seen < before) { if (/[\d,\-]/.test(value.charAt(pos))) seen++; pos++; }
    return { value: value, caret: o.paste ? value.length : pos };
  }

  function format(s, o) { return formatTyped(s, 0, Object.assign({ paste: true }, o || {})).value; }

  function attach(el, o) {
    o = o || {};
    var typedDot = false, paste = false;
    el.addEventListener("beforeinput", function (e) { typedDot = e.inputType === "insertText" && e.data === "."; paste = e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop"; });
    el.addEventListener("input", function () {
      var r = formatTyped(el.value, el.selectionStart == null ? el.value.length : el.selectionStart,
        { decimals: o.decimals, allowNeg: o.allowNeg, typedDot: typedDot, paste: paste });
      typedDot = paste = false;
      if (r.value !== el.value) { el.value = r.value; try { el.setSelectionRange(r.caret, r.caret); } catch (e) {} }
    }, true);   // chạy trước các bộ xử lý "input" khác để chúng thấy số đã định dạng
    if (el.value) el.value = format(el.value, o);
  }

  var API = { attach: attach, format: format, formatTyped: formatTyped };
  if (typeof module === "object" && module.exports) module.exports = API; else root.KCNum = API;
})(this);
