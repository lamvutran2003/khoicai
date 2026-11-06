/* Chuyển văn bản gõ bằng font cũ (TCVN3/ABC, VNI-Windows) sang Unicode. Chạy hoàn toàn trong trình duyệt.
 *
 * Văn bản gõ bằng font .VnTime (TCVN3) hay VNI-Times, khi dán sang chỗ khác, hiện thành các ký tự
 * Windows-1252 lạ (ví dụ "Hµ Néi" hay "Haø Noäi"). Bảng FONT_TABLES (font-tables.js) cho biết mỗi ký tự /
 * cặp ký tự đó là chữ tiếng Việt nào.
 *
 * API: convert(text, enc, {upper}) · detect(text) · convertDocxXml(xml, fontOf, opts) (dùng cho file Word)
 */
(function (root) {
  var T = (typeof module === "object" && module.exports) ? require("./font-tables.js") : root.FONT_TABLES;

  // Chữ có dấu tiếng Việt trong Unicode (dùng để chấm điểm khi đoán bảng mã)
  var VIET = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/g;
  // Chữ mang dấu thanh (sắc, huyền, hỏi, ngã, nặng). Một âm tiết tiếng Việt có nhiều nhất một dấu thanh.
  var TONED = /[àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/g;
  // Ký tự lạ thường gặp khi văn bản font cũ bị dán ra: chữ Latin-1 không phải chữ Việt, và vài ký tự cp1252.
  // (Không tính dấu gạch ngang, ngoặc kép cong, dấu chấm lửng: văn bản Unicode thường có.)
  var ODD = (function () {
    var cs = "";
    for (var c = 0xa1; c <= 0xff; c++) { var ch = String.fromCharCode(c); if (!ch.match(VIET) && c !== 0xd7 && c !== 0xf7) cs += ch; }
    cs += "\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2039\u203a";
    return new RegExp("[" + cs.replace(/[\]\\^-]/g, "\\$&") + "]", "g");
  })();

  function convertTCVN3(s) {
    var out = "", m = T.TCVN3;
    for (var i = 0; i < s.length; i++) { var c = s[i]; out += Object.prototype.hasOwnProperty.call(m, c) ? m[c] : c; }
    return out;
  }
  function convertVNI(s) {
    var out = "", m = T.VNI;
    for (var i = 0; i < s.length; i++) {
      var two = s.substr(i, 2);
      if (two.length === 2 && Object.prototype.hasOwnProperty.call(m, two)) { out += m[two]; i++; continue; }
      var c = s[i]; out += Object.prototype.hasOwnProperty.call(m, c) ? m[c] : c;
    }
    return out;
  }
  function convert(text, enc, opts) {
    opts = opts || {};
    var s = String(text);
    var r = enc === "TCVN3" ? convertTCVN3(s) : enc === "VNI" ? convertVNI(s) : s;
    if (enc === "NFC" || enc === "TCVN3" || enc === "VNI") r = r.normalize("NFC");
    if (opts.upper) r = r.toLocaleUpperCase("vi");   // font .VnTimeH/.VnArialH: chữ thường hiển thị thành chữ hoa
    return r;
  }

  function count(re, s) { var m = s.match(re); return m ? m.length : 0; }
  // Đoán bảng mã: chọn cách chuyển tạo ra nhiều chữ tiếng Việt nhất và còn ít ký tự lạ nhất.
  function detect(text) {
    var s = String(text);
    if (!s.trim()) return { enc: null, reason: "empty" };
    if (s !== s.normalize("NFC") && count(VIET, s.normalize("NFC")) > count(VIET, s)) return { enc: "NFC", reason: "combining" };
    var base = count(VIET, s), odd = count(ODD, s);
    if (base > 0 && odd === 0) return { enc: null, reason: "unicode" };
    var best = { enc: null, score: 0 };
    ["TCVN3", "VNI"].forEach(function (e) {
      var r = convert(s, e);
      var bad = (r.match(/[^\s.,;:!?()"'\-–—\/0-9]+/g) || []).filter(function (w) { return count(TONED, w) > 1; }).length;
      var score = count(VIET, r) - base - 2 * count(ODD, r) - 4 * bad;
      if (score > best.score) best = { enc: e, score: score };
    });
    return best.enc ? { enc: best.enc, reason: "detected" } : { enc: null, reason: odd ? "unknown" : "plain" };
  }

  // ---------------------------------------------------------------- Word (.docx)
  // Font cũ -> bảng mã. ".VnTime", ".VnArialH"… là TCVN3 (đuôi H = bộ chữ hoa); "VNI-Times"… là VNI.
  function encOfFont(name) {
    if (!name) return null;
    if (/^\.vn/i.test(name)) return { enc: "TCVN3", upper: /h$/i.test(name.replace(/\s+/g, "")) };
    if (/^vni[- ]/i.test(name)) return { enc: "VNI", upper: false };
    return null;
  }
  function newFontFor(name) { return /arial|helv|swiss|univers|sans/i.test(name) ? "Arial" : "Times New Roman"; }

  var unesc = function (s) { return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); };
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  function attr(tag, name) { var m = tag.match(new RegExp("\\b" + name + '="([^"]*)"')); return m ? unesc(m[1]) : null; }
  function rFontsName(xml) {
    var m = xml.match(/<w:rFonts\b[^>]*\/?>/);
    return m ? (attr(m[0], "w:ascii") || attr(m[0], "w:hAnsi") || attr(m[0], "w:cs")) : null;
  }
  function swapFonts(xml) {   // đổi mọi tên font cũ trong các thẻ rFonts sang font Unicode
    return xml.replace(/<w:rFonts\b[^>]*\/?>/g, function (tag) {
      return tag.replace(/(w:(?:ascii|hAnsi|cs|eastAsia)=")([^"]*)(")/g, function (all, a, name, b) {
        return encOfFont(unesc(name)) ? a + esc(newFontFor(name)) + b : all;
      });
    });
  }

  // styles.xml -> { default: font, styles: {styleId: font} } (theo chuỗi basedOn)
  function readStyles(stylesXml) {
    var out = { "default": null, styles: {} };
    if (!stylesXml) return out;
    var dd = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/);
    if (dd) out["default"] = rFontsName(dd[0]);
    var raw = {};
    (stylesXml.match(/<w:style\b[\s\S]*?<\/w:style>/g) || []).forEach(function (st) {
      var id = attr(st.match(/<w:style\b[^>]*>/)[0], "w:styleId");
      var based = st.match(/<w:basedOn\b[^>]*>/);
      raw[id] = { font: rFontsName(st), based: based ? attr(based[0], "w:val") : null };
    });
    Object.keys(raw).forEach(function (id) {
      var cur = id, guard = 0;
      while (cur && raw[cur] && !raw[cur].font && guard++ < 20) cur = raw[cur].based;
      out.styles[id] = cur && raw[cur] ? raw[cur].font : null;
    });
    return out;
  }

  // Chuyển một phần XML của Word (document.xml, header/footer…): chữ trong các đoạn dùng font cũ.
  function convertDocxXml(xml, styles, stats) {
    styles = styles || { "default": null, styles: {} };
    stats = stats || { runs: 0, chars: 0 };
    return swapFonts(xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, function (p) {
      var ps = p.match(/<w:pStyle\b[^>]*>/), pFont = ps ? styles.styles[attr(ps[0], "w:val")] : null;
      return p.replace(/<w:r\b(?:(?!<w:r\b)[\s\S])*?<\/w:r>/g, function (run) {
        var rp = run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/), direct = rp ? rFontsName(rp[0]) : null;
        var rs = rp && rp[0].match(/<w:rStyle\b[^>]*>/), rsFont = rs ? styles.styles[attr(rs[0], "w:val")] : null;
        var e = encOfFont(direct || rsFont || pFont || styles["default"]);
        if (!e) return run;
        stats.runs++;
        return run.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, function (all, a, text, b) {
          var t = unesc(text); stats.chars += t.length;
          return a + esc(convert(t, e.enc, { upper: e.upper })) + b;
        });
      });
    }));
  }

  var API = { convert: convert, detect: detect, encOfFont: encOfFont, readStyles: readStyles,
              convertDocxXml: convertDocxXml, swapFonts: swapFonts };
  if (typeof module === "object" && module.exports) module.exports = API; else root.FontViet = API;
})(this);
