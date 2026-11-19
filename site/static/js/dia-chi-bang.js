/* Đổi hàng loạt địa chỉ cũ sang mới, chạy hoàn toàn trong trình duyệt (dùng DiaChi.oldToNew của dia-chi.js).
 *
 * DiaChiBang.parsePaste(text)          ô dán từ Excel / Google Sheets (cột cách nhau bằng tab) -> mảng dòng
 * DiaChiBang.parseCsv(text)            tệp .csv (dấu phẩy, chấm phẩy hoặc tab; có ngoặc kép) -> mảng dòng
 * DiaChiBang.readXlsx(JSZip, data)     tệp .xlsx (trang tính đầu tiên) -> Promise<mảng dòng>
 * DiaChiBang.guessColumn(rows)         {col, header}: cột nào giống địa chỉ nhất, dòng đầu có phải tiêu đề không
 * DiaChiBang.convertRows(values, opt)  -> Promise<{results, counts, ms}>; opt.onProgress(done, total), chạy từng đợt để trang không treo
 * DiaChiBang.toXlsx(results)           -> {tên tệp trong gói: nội dung} để nén bằng JSZip: cột Địa chỉ cũ, Địa chỉ mới, Trạng thái, Ghi chú
 */
(function (root, f) {
  if (typeof module === "object" && module.exports) module.exports = f(require("./dia-chi.js"));
  else root.DiaChiBang = f(root.DiaChi);
})(typeof self !== "undefined" ? self : this, function (DiaChi) {
  "use strict";
  var STATUS = {
    ok: "Đã đổi",
    check: "Đã đổi, nên kiểm tra",
    split: "Bị chia, cần chọn",
    ambiguous: "Trùng tên, chưa rõ",
    "already-new": "Đã là địa chỉ mới",
    "not-found": "Không tìm thấy",
    empty: "Ô trống"
  };
  var PORTION = { "toan-bo": "toàn bộ", "mot-phan": "một phần", "phan-con-lai": "phần còn lại" };

  // ---------- đọc dữ liệu ----------
  function parseDelimited(text, d) {
    var rows = [], row = [], cell = "", q = false, s = String(text == null ? "" : text).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (q) {
        if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === "") q = true;
      else if (ch === d) { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  }
  // Dán từ bảng tính: cột cách nhau bằng tab; một cột thì mỗi dòng là một ô (dấu phẩy trong địa chỉ không tách cột)
  function parsePaste(text) { return parseDelimited(text, "\t"); }
  function parseCsv(text) {
    var s = String(text == null ? "" : text).replace(/^﻿/, ""), best = null;
    [",", ";", "\t"].forEach(function (d) {
      var rows = parseDelimited(s, d).slice(0, 30), n = rows.length && rows[0].length;
      if (n > 1 && rows.every(function (r) { return r.length === n; }) && (!best || n > best.n)) best = { d: d, n: n };
    });
    return parseDelimited(s, best ? best.d : "\u0000");   // cột không đều: coi cả dòng là một ô (địa chỉ có dấu phẩy, không ngoặc kép)
  }

  var unxml = function (s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCodePoint(+n); }).replace(/&amp;/g, "&");
  };
  var texts = function (xml) { var out = "", m, re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; while ((m = re.exec(xml))) out += unxml(m[1]); return out; };
  var colIndex = function (ref) { var n = 0, m = ref.match(/^[A-Z]+/); for (var i = 0; m && i < m[0].length; i++) n = n * 26 + m[0].charCodeAt(i) - 64; return n - 1; };
  function readXlsx(JSZip, data) {
    return JSZip.loadAsync(data).then(function (zip) {
      var file = function (p) { var f = zip.file(p); return f ? f.async("string") : Promise.resolve(null); };
      return Promise.all([file("xl/workbook.xml"), file("xl/_rels/workbook.xml.rels"), file("xl/sharedStrings.xml")]).then(function (a) {
        if (!a[0]) throw new Error("Không phải tệp .xlsx");
        var sheet = (a[0].match(/<sheet\b[^>]*>/) || [""])[0], rid = (sheet.match(/r:id="([^"]+)"/) || [])[1];
        var target = "worksheets/sheet1.xml";
        if (rid && a[1]) { var rel = new RegExp('<Relationship\\b[^>]*Id="' + rid + '"[^>]*>').exec(a[1]); if (rel) target = (rel[0].match(/Target="([^"]+)"/) || [])[1] || target; }
        var path = target.charAt(0) === "/" ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
        var shared = []; if (a[2]) { var m, re = /<si>([\s\S]*?)<\/si>/g; while ((m = re.exec(a[2]))) shared.push(texts(m[1])); }
        return file(path).then(function (xml) {
          if (!xml) throw new Error("Không đọc được trang tính");
          var rows = [], rm, rre = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
          while ((rm = rre.exec(xml))) {
            var r = [], cm, cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, k = 0;
            while ((cm = cre.exec(rm[2]))) {
              var at = cm[1], body = cm[2] || "", ref = (at.match(/\br="([A-Z]+)\d+"/) || [])[1], t = (at.match(/\bt="([^"]+)"/) || [])[1];
              var i = ref ? colIndex(ref) : k, v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
              var val = t === "s" ? shared[+v] || "" : t === "inlineStr" ? texts(body) : v != null ? unxml(v) : "";
              while (r.length < i) r.push("");
              r[i] = val; k = i + 1;
            }
            var num = +((rm[1].match(/\br="(\d+)"/) || [])[1] || rows.length + 1);
            while (rows.length < num - 1) rows.push([]);
            rows.push(r);
          }
          return rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
        });
      });
    });
  }

  // cột giống địa chỉ nhất: nhiều ô nhận ra được xã/phường, quận/huyện hoặc tỉnh
  function guessColumn(rows) {
    var n = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0), best = { col: 0, score: -1 };
    var sample = rows.slice(0, 200);
    for (var c = 0; c < n; c++) {
      var s = 0;
      sample.forEach(function (r, i) {
        var v = String(r[c] || "").trim(); if (!v || i === 0) return;
        var p = DiaChi.normalise(v);
        s += (p.commune ? 2 : 0) + (p.district ? 1 : 0) + (p.province ? 1 : 0) + (/,/.test(v) ? 0.5 : 0);
      });
      if (s > best.score) best = { col: c, score: s };
    }
    var first = String((rows[0] || [])[best.col] || "").trim(), p0 = DiaChi.normalise(first);
    // tiêu đề: có chữ kiểu "địa chỉ"; hoặc bảng nhiều cột mà dòng đầu toàn chữ ngắn, còn dòng sau có số (STT, điện thoại…)
    var r0 = rows[0] || [], r1 = rows[1] || [], isNum = function (v) { return /^\s*[\d.,]+\s*$/.test(String(v || "")); };
    var header = rows.length > 1 && (/(địa chỉ|dia chi|address|đ\/c|diachi|nơi ở|noi o|thường trú|thuong tru|hộ khẩu|ho khau|quê quán|que quan|tạm trú|tam tru)/i.test(first)
      || (n > 1 && !p0.commune && !p0.district && !r0.some(isNum) && r1.some(isNum)));
    return { col: best.col, header: !!header };
  }

  // ---------- đổi ----------
  function convertOne(text) {
    var old = String(text == null ? "" : text).replace(/[\s ]+/g, " ").trim();
    if (!old) return { old: "", newAddress: "", status: "empty", note: "", candidates: [] };
    var r = DiaChi.oldToNew(old), out = { old: old, newAddress: "", status: "not-found", note: "", candidates: [], confidence: r.confidence };
    var notes = r.notes.slice();
    if (r.status === "found" && r.results.length === 1) {
      out.newAddress = r.results[0].address;
      out.status = r.confidence === "high" ? "ok" : "check";
      out.unitUrl = r.results[0].unit.url;
      if (r.confidence !== "high") notes.unshift("Độ tin cậy " + (r.confidence === "medium" ? "trung bình" : "thấp") + ".");
      notes.push("Đơn vị cũ: " + r.old.label + ".");
    } else if (r.status === "found") {
      out.status = "split";
      out.candidates = r.results.map(function (x) { return x.address + " (" + PORTION[x.portion] + ")"; });
      out.options = r.results.map(function (x) { return x.unit.fullName + " (" + PORTION[x.portion] + ")"; });   // gọn, để hiện trên trang
      notes = [r.old.fullName + " cũ được chia cho " + r.results.length + " đơn vị mới; chọn theo vị trí thực tế. Có thể là: " + out.candidates.join(" | ")];
    } else if (r.status === "ambiguous") {
      out.status = "ambiguous";
      out.candidates = r.candidates.map(function (c) { return c.old.label + " → " + c.results.map(function (x) { return x.unit.fullName + ", " + x.unit.province.fullName; }).join(" hoặc "); });
      var shown = out.candidates.slice(0, 6);
      notes = ["Có " + r.candidates.length + " đơn vị cũ cùng tên; ghi thêm quận/huyện, tỉnh cũ. Có thể là: " + shown.join(" | ") + (out.candidates.length > shown.length ? " | và " + (out.candidates.length - shown.length) + " nơi khác" : "")];
    } else if (r.status === "already-new") {
      out.status = "already-new";
      out.newAddress = r.results.length === 1 ? r.results[0].address : "";
      out.candidates = r.results.map(function (x) { return x.address; });
      if (r.results.length > 1) notes.push("Có thể là: " + out.candidates.join(" | "));
    } else {
      notes.push("Không nhận ra xã, phường cũ. Kiểm tra chính tả, ghi đủ xã/phường, quận/huyện, tỉnh cách nhau bằng dấu phẩy.");
    }
    out.note = notes.join(" ");
    return out;
  }

  function convertRows(values, opt) {
    opt = opt || {};
    var t0 = Date.now(), results = new Array(values.length), memo = {}, i = 0, chunk = opt.chunk || 50;
    var counts = { ok: 0, check: 0, split: 0, ambiguous: 0, "already-new": 0, "not-found": 0, empty: 0 };
    return new Promise(function (done) {
      (function step() {
        var end = Math.min(values.length, i + chunk);
        for (; i < end; i++) {
          var key = String(values[i] == null ? "" : values[i]).replace(/[\s ]+/g, " ").trim();
          var r = memo.hasOwnProperty(key) ? memo[key] : (memo[key] = convertOne(key));
          results[i] = r; counts[r.status]++;
        }
        if (opt.onProgress) opt.onProgress(i, values.length);
        if (i < values.length) setTimeout(step, 0);
        else done({ results: results, counts: counts, ms: Date.now() - t0 });
      })();
    });
  }

  // ---------- xuất .xlsx ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var STYLE = { ok: 3, check: 4, split: 4, ambiguous: 4, "already-new": 4, "not-found": 5, empty: 2 };
  function toXlsx(results) {
    var cell = function (ref, v, s) { return '<c r="' + ref + '" t="inlineStr" s="' + s + '"><is><t xml:space="preserve">' + esc(v) + "</t></is></c>"; };
    var rows = ['<row r="1">' + ["Địa chỉ cũ", "Địa chỉ mới", "Trạng thái", "Ghi chú"].map(function (h, i) { return cell("ABCD"[i] + "1", h, 1); }).join("") + "</row>"];
    results.forEach(function (r, i) {
      var n = i + 2;
      rows.push('<row r="' + n + '">' + cell("A" + n, r.old, 2) + cell("B" + n, r.newAddress, 2) + cell("C" + n, STATUS[r.status], STYLE[r.status]) + cell("D" + n, r.note, 2) + "</row>");
    });
    var last = results.length + 1;
    var ws = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + '<cols><col min="1" max="1" width="50" customWidth="1"/><col min="2" max="2" width="50" customWidth="1"/><col min="3" max="3" width="22" customWidth="1"/><col min="4" max="4" width="80" customWidth="1"/></cols>'
      + "<sheetData>" + rows.join("") + "</sheetData>" + '<autoFilter ref="A1:D' + last + '"/></worksheet>';
    var fill = function (rgb) { return '<fill><patternFill patternType="solid"><fgColor rgb="' + rgb + '"/></patternFill></fill>'; };
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + fill("FFE8F3EA") + fill("FFDFF0D8") + fill("FFFFF3CD") + fill("FFF8D7DA") + "</fills>"
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">'
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'                                                                          // 0
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'                                             // 1 tiêu đề
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'           // 2 chữ, xuống dòng
      + '<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment vertical="top"/></xf>'          // 3 xanh: đã đổi
      + '<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' // 4 vàng: cần xem
      + '<xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment vertical="top"/></xf>'          // 5 đỏ: không tìm thấy
      + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    return {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheets><sheet name="Địa chỉ mới" sheetId="1" r:id="rId1"/></sheets>'
        + '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'Địa chỉ mới\'!$A$1:$D$' + last + "</definedName></definedNames></workbook>",
      "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      "xl/worksheets/sheet1.xml": ws,
      "xl/styles.xml": styles
    };
  }

  return { STATUS: STATUS, parsePaste: parsePaste, parseCsv: parseCsv, readXlsx: readXlsx, guessColumn: guessColumn,
           convertOne: convertOne, convertRows: convertRows, toXlsx: toXlsx };
});
