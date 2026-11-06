/* Xử lý chữ tiếng Việt: bỏ dấu, tạo đường dẫn/tên file, đổi chữ hoa/thường, đếm chữ. */
(function (root) {
  function unaccent(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFC");
  }
  // "Hà Nội – Thủ đô" -> "ha-noi-thu-do"
  function slug(s, sep) {
    sep = sep == null ? "-" : sep;
    return unaccent(s).toLowerCase().replace(/[^a-z0-9]+/g, sep).replace(new RegExp("^" + (sep ? "\\" + sep : "") + "+|" + (sep ? "\\" + sep : "") + "+$", "g"), "");
  }
  // Tên file: bỏ dấu, giữ hoa/thường, khoảng trắng -> "_", bỏ ký tự Windows không cho phép
  function fileName(s) {
    return String(s).split(/\r?\n/).map(function (line) {
      return unaccent(line).replace(/[\\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
    }).join("\n");
  }

  var up = function (s) { return s.toLocaleUpperCase("vi"); }, low = function (s) { return s.toLocaleLowerCase("vi"); };
  function toCase(s, mode) {
    s = String(s);
    if (mode === "upper") return up(s);
    if (mode === "lower") return low(s);
    if (mode === "title") return s.replace(/\p{L}+/gu, function (w) {
      // Từ viết tắt toàn chữ hoa không có nguyên âm (TNHH, MTV, DV, CP) giữ nguyên
      if (w === up(w) && w.length > 1 && !/[aeiouyàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(w)) return w;
      w = low(w); return up(w.charAt(0)) + w.slice(1);
    });
    if (mode === "sentence") return low(s).replace(/(^\s*|[.!?…]\s+|\n\s*)(\p{L})/gu, function (m, a, c) { return a + up(c); });
    if (mode === "swap") return s.replace(/\p{L}/gu, function (c) { return c === up(c) ? low(c) : up(c); });
    return s;
  }

  function stats(s) {
    s = String(s);
    var words = s.trim() ? s.trim().split(/\s+/).length : 0;
    return { chars: Array.from(s).length, noSpace: Array.from(s.replace(/\s/g, "")).length, words: words,
             lines: s ? s.split(/\r?\n/).length : 0 };
  }

  var API = { unaccent: unaccent, slug: slug, fileName: fileName, toCase: toCase, stats: stats };
  if (typeof module === "object" && module.exports) module.exports = API; else root.VanBan = API;
})(this);
