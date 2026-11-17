/* Bảng lương nhiều nhân viên + xuất file Excel (.xlsx) có sẵn công thức.
 * Dựa trên Luong.RULES (giảm trừ gia cảnh, biểu thuế 5 bậc, tỷ lệ và mức trần đóng bảo hiểm).
 * Tăng ca theo Điều 98 BLLĐ 2019: ngày thường 150%, ngày nghỉ hằng tuần 200%, lễ tết 300%;
 * phần trả cao hơn giờ làm việc bình thường được miễn thuế TNCN.
 * Kinh phí công đoàn 2% quỹ lương đóng BHXH do doanh nghiệp đóng (Luật Công đoàn 2024).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./luong.js"));
  else root.BangLuong = factory(root.Luong);
})(typeof self !== "undefined" ? self : this, function (Luong) {
  "use strict";
  var R = Luong.RULES, round = Math.round;
  // Các cột nhập, theo đúng thứ tự cột khi dán từ Excel
  var INPUTS = [
    ["name", "Họ tên"], ["base", "Lương hợp đồng"], ["insBase", "Lương đóng BH"], ["days", "Ngày công"],
    ["allowTax", "Phụ cấp chịu thuế"], ["allowFree", "Phụ cấp không chịu thuế"],
    ["otDay", "Giờ tăng ca ngày thường"], ["otRest", "Giờ tăng ca ngày nghỉ"], ["otHol", "Giờ tăng ca lễ tết"],
    ["bonus", "Thưởng"], ["deps", "Người phụ thuộc"], ["deduct", "Khấu trừ khác"]
  ];

  // e: một nhân viên; o: { stdDays, region, union }
  function row(e, o) {
    var std = o.stdDays || 26, num = function (v) { return +v || 0; };
    var base = num(e.base), ins = e.insBase === "" || e.insBase == null ? base : num(e.insBase);
    var days = e.days === "" || e.days == null ? std : num(e.days);
    var worked = round(base * days / std), hourly = base / std / 8;
    var ot = round(hourly * (1.5 * num(e.otDay) + 2 * num(e.otRest) + 3 * num(e.otHol)));
    var otFree = round(hourly * (0.5 * num(e.otDay) + 1 * num(e.otRest) + 2 * num(e.otHol)));
    var gross = worked + num(e.allowTax) + num(e.allowFree) + ot + num(e.bonus);
    var capS = 20 * R.baseSalary, capU = 20 * R.regionMin[o.region || 1];
    var bS = Math.min(ins, capS), bU = Math.min(ins, capU);
    var bhxh = round(bS * R.employee.bhxh), bhyt = round(bS * R.employee.bhyt), bhtn = round(bU * R.employee.bhtn);
    var insTotal = bhxh + bhyt + bhtn;
    var taxable = Math.max(0, gross - num(e.allowFree) - otFree - insTotal - R.selfDeduction - num(e.deps) * R.dependentDeduction);
    var tax = round(Luong.pit(taxable));
    var net = gross - insTotal - tax - num(e.deduct);
    var company = round(bS * R.employer.bhxh) + round(bS * R.employer.bhyt) + round(bU * R.employer.bhtn);
    var union = o.union === false ? 0 : round(ins * 0.02);
    return { name: e.name || "", base: base, insBase: ins, days: days, allowTax: num(e.allowTax), allowFree: num(e.allowFree),
             otDay: num(e.otDay), otRest: num(e.otRest), otHol: num(e.otHol), bonus: num(e.bonus), deps: num(e.deps), deduct: num(e.deduct),
             worked: worked, ot: ot, otFree: otFree, gross: gross, bhxh: bhxh, bhyt: bhyt, bhtn: bhtn, insTotal: insTotal,
             taxable: taxable, tax: tax, net: net, company: company, union: union, cost: gross + company + union,
             belowMin: ins > 0 && ins < R.regionMin[o.region || 1] };
  }

  function sheet(list, o) {
    var rows = list.map(function (e) { return row(e, o); });
    var sum = {};
    ["base", "worked", "ot", "gross", "insTotal", "tax", "net", "company", "union", "cost", "bonus", "allowTax", "allowFree", "deduct", "bhxh", "bhyt", "bhtn", "taxable"]
      .forEach(function (k) { sum[k] = rows.reduce(function (s, r) { return s + r[k]; }, 0); });
    return { rows: rows, sum: sum };
  }

  // Tách dữ liệu dán từ Excel/Google Sheets (cột cách nhau bằng tab). Số kiểu Việt Nam: 12.000.000 hoặc 1,5
  function parsePaste(text) {
    return String(text).replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); }).map(function (l) {
      var c = l.split("\t"), e = {};
      INPUTS.forEach(function (f, i) {
        var v = (c[i] || "").trim();
        if (f[0] === "name") { e.name = v; return; }
        if (v === "") { e[f[0]] = ""; return; }
        var s = v.replace(/\s|đ/gi, "");
        if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
        else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
        else s = s.replace(",", ".");
        e[f[0]] = isFinite(+s) ? +s : "";
      });
      return e;
    }).filter(function (e) {   // bỏ dòng tiêu đề
      return e.name || e.base;
    }).filter(function (e) { return !(e.base === "" && /họ|tên|name/i.test(e.name)); });
  }

  // ---------- Xuất .xlsx ----------
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function col(n) { var s = ""; n++; while (n) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  function cellStr(ref, v, s) { return '<c r="' + ref + '" t="inlineStr"' + (s ? ' s="' + s + '"' : "") + "><is><t>" + esc(v) + "</t></is></c>"; }
  function cellNum(ref, v, s) { return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : "") + "><v>" + v + "</v></c>"; }
  function cellF(ref, f, v, s) { return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : "") + "><f>" + esc(f) + "</f><v>" + v + "</v></c>"; }

  // Cột của bảng tính: [tiêu đề, khoá, công thức(r) hoặc null nếu là ô nhập]
  var C = {}; "STT name base insBase days allowTax allowFree otDay otRest otHol bonus deps deduct worked ot gross bhxh bhyt bhtn taxable tax net company union cost"
    .split(" ").forEach(function (k, i) { C[k] = col(i); });
  var HEAD = ["STT", "Họ tên", "Lương hợp đồng", "Lương đóng BH", "Ngày công", "Phụ cấp chịu thuế", "Phụ cấp không chịu thuế",
    "Giờ TC ngày thường (150%)", "Giờ TC ngày nghỉ (200%)", "Giờ TC lễ tết (300%)", "Thưởng", "Người phụ thuộc", "Khấu trừ khác",
    "Lương theo ngày công", "Tiền tăng ca", "Tổng thu nhập", "BHXH 8%", "BHYT 1,5%", "BHTN 1%", "Thu nhập tính thuế", "Thuế TNCN",
    "Thực lĩnh", "BH công ty đóng 21,5%", "Kinh phí công đoàn 2%", "Tổng chi phí công ty"];

  function formulas(r, o) {
    var x = function (k) { return C[k] + r; }, std = "$C$3", hr = "(" + x("base") + "/" + std + "/8)";
    var capS = "20*$F$3", capU = "20*$I$3";
    var pit = "SUMPRODUCT((" + x("taxable") + ">{0,10,30,60,100}*1000000)*(" + x("taxable") + "-{0,10,30,60,100}*1000000)*{0.05,0.05,0.1,0.1,0.05})";
    return {
      worked: "ROUND(" + x("base") + "*" + x("days") + "/" + std + ",0)",
      ot: "ROUND(" + hr + "*(1.5*" + x("otDay") + "+2*" + x("otRest") + "+3*" + x("otHol") + "),0)",
      gross: x("worked") + "+" + x("allowTax") + "+" + x("allowFree") + "+" + x("ot") + "+" + x("bonus"),
      bhxh: "ROUND(MIN(" + x("insBase") + "," + capS + ")*8%,0)",
      bhyt: "ROUND(MIN(" + x("insBase") + "," + capS + ")*1.5%,0)",
      bhtn: "ROUND(MIN(" + x("insBase") + "," + capU + ")*1%,0)",
      taxable: "MAX(0," + x("gross") + "-" + x("allowFree") + "-ROUND(" + hr + "*(0.5*" + x("otDay") + "+" + x("otRest") + "+2*" + x("otHol") + "),0)-" +
               x("bhxh") + "-" + x("bhyt") + "-" + x("bhtn") + "-$L$3-" + x("deps") + "*$O$3)",
      tax: "ROUND(" + pit + ",0)",
      net: x("gross") + "-" + x("bhxh") + "-" + x("bhyt") + "-" + x("bhtn") + "-" + x("tax") + "-" + x("deduct"),
      company: "ROUND(MIN(" + x("insBase") + "," + capS + ")*17.5%,0)+ROUND(MIN(" + x("insBase") + "," + capS + ")*3%,0)+ROUND(MIN(" + x("insBase") + "," + capU + ")*1%,0)",
      union: o.union === false ? "0" : "ROUND(" + x("insBase") + "*2%,0)",
      cost: x("gross") + "+" + x("company") + "+" + x("union")
    };
  }

  // Trả về { "đường dẫn trong zip": "nội dung XML" }
  function xlsx(list, o) {
    var t = sheet(list, o), first = 6, last = first + t.rows.length - 1, total = last + 1, out = [];
    var rowXml = function (n, cells, ht) { return '<row r="' + n + '"' + (ht ? ' ht="' + ht + '" customHeight="1"' : "") + ">" + cells.join("") + "</row>"; };
    out.push(rowXml(1, [cellStr("A1", "BẢNG LƯƠNG" + (o.title ? " " + o.title : ""), 4)], 24));
    out.push(rowXml(3, [cellStr("A3", "Ngày công chuẩn", 2), cellNum("C3", o.stdDays || 26, 5),
      cellStr("D3", "Mức tham chiếu", 2), cellNum("F3", R.baseSalary, 1),
      cellStr("G3", "Lương tối thiểu vùng " + (o.region || 1), 2), cellNum("I3", R.regionMin[o.region || 1], 1),
      cellStr("J3", "Giảm trừ bản thân", 2), cellNum("L3", R.selfDeduction, 1),
      cellStr("M3", "Giảm trừ người phụ thuộc", 2), cellNum("O3", R.dependentDeduction, 1)]));
    out.push(rowXml(5, HEAD.map(function (h, i) { return cellStr(col(i) + "5", h, 3); }), 45));
    t.rows.forEach(function (r, i) {
      var n = first + i, f = formulas(n, o), cells = [cellNum("A" + n, i + 1, 5), cellStr("B" + n, r.name, 5)];
      ["base", "insBase", "days", "allowTax", "allowFree", "otDay", "otRest", "otHol", "bonus", "deps", "deduct"].forEach(function (k) {
        cells.push(cellNum(C[k] + n, r[k], k === "days" || k === "deps" || /^ot/.test(k) ? 5 : 1));
      });
      ["worked", "ot", "gross", "bhxh", "bhyt", "bhtn", "taxable", "tax", "net", "company", "union", "cost"].forEach(function (k) {
        cells.push(cellF(C[k] + n, f[k], r[k], k === "net" ? 6 : 1));
      });
      out.push(rowXml(n, cells));
    });
    var tc = [cellStr("B" + total, "Tổng cộng", 3)];
    ["base", "allowTax", "allowFree", "bonus", "deduct", "worked", "ot", "gross", "bhxh", "bhyt", "bhtn", "taxable", "tax", "net", "company", "union", "cost"]
      .sort(function (a, b) { return C[a].length - C[b].length || (C[a] < C[b] ? -1 : 1); })
      .forEach(function (k) { tc.push(cellF(C[k] + total, "SUM(" + C[k] + first + ":" + C[k] + last + ")", t.sum[k], 6)); });
    out.push(rowXml(total, tc));
    out.push(rowXml(total + 2, [cellStr("A" + (total + 2), "Lập bằng tinhgium.vn/bang-luong/ theo quy định năm 2026. Các cột từ \"Lương theo ngày công\" là công thức; sửa ô nhập hoặc tham số ở dòng 3 thì Excel tự tính lại.")]));
    var widths = [5, 22].concat(HEAD.slice(2).map(function () { return 14; }));
    var cols = "<cols>" + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols>";
    var ws = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="5" topLeftCell="C6" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>' +
      cols + "<sheetData>" + out.join("") + "</sheetData></worksheet>";
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F3EA"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                                                         // 0 thường
      '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +                         // 1 số #,##0
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                                                // 2 nhãn đậm
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center" horizontal="center"/></xf>' + // 3 tiêu đề
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                                                // 4 tiêu đề lớn
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>' +                                               // 5 số thường
      '<xf numFmtId="3" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' + // 6 số đậm
      "</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";
    return {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Bảng lương" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>',
      "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      "xl/worksheets/sheet1.xml": ws,
      "xl/styles.xml": styles
    };
  }

  return { INPUTS: INPUTS, row: row, sheet: sheet, parsePaste: parsePaste, xlsx: xlsx };
});
