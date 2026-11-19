const test = require("node:test");
const assert = require("node:assert");
const B = require("../site/static/js/dia-chi-bang.js");
const A = require("../site/static/js/dia-chi.js");
const JSZip = require("../site/static/js/jszip.min.js");
const S = require("./bulk-sample.js");

test("paste from Excel / Google Sheets", () => {
  // một cột: dấu phẩy trong địa chỉ không tách cột; dòng trống bị bỏ
  assert.deepStrictEqual(B.parsePaste("Phường Bến Nghé, Quận 1, TP.HCM\r\n\r\nXã Tân Lập, Đan Phượng, Hà Nội\r\n"),
    [["Phường Bến Nghé, Quận 1, TP.HCM"], ["Xã Tân Lập, Đan Phượng, Hà Nội"]]);
  // nhiều cột cách tab; ô có xuống dòng hoặc ngoặc kép được Excel bọc trong ngoặc kép
  assert.deepStrictEqual(B.parsePaste('STT\tĐịa chỉ\n1\t"Số 5 ""A"", P. Bến Nghé\nQ.1"\n2\t'),
    [["STT", "Địa chỉ"], ["1", 'Số 5 "A", P. Bến Nghé\nQ.1'], ["2", ""]]);
});

test("CSV: comma, semicolon, quoted cells, single unquoted column", () => {
  assert.deepStrictEqual(B.parseCsv('﻿stt,dia_chi\n1,"Phường Bến Nghé, Quận 1, TP.HCM"\n2,"Xã Tân Lập, Hà Nội"\n'),
    [["stt", "dia_chi"], ["1", "Phường Bến Nghé, Quận 1, TP.HCM"], ["2", "Xã Tân Lập, Hà Nội"]]);
  assert.deepStrictEqual(B.parseCsv("stt;dia_chi\n1;Phường Bến Nghé, Quận 1\n2;Xã Tân Lập, Hà Nội"),
    [["stt", "dia_chi"], ["1", "Phường Bến Nghé, Quận 1"], ["2", "Xã Tân Lập, Hà Nội"]]);
  // một cột địa chỉ không ngoặc kép: số dấu phẩy mỗi dòng khác nhau -> giữ nguyên dòng
  assert.deepStrictEqual(B.parseCsv("Phường Bến Nghé, Quận 1, TP.HCM\nXã Tân Lập, Hà Nội"), [["Phường Bến Nghé, Quận 1, TP.HCM"], ["Xã Tân Lập, Hà Nội"]]);
});

test("guess the address column and the header row", () => {
  const rows = [["STT", "Họ tên", "Địa chỉ thường trú", "SĐT"], ["1", "An", "Phường Bến Nghé, Quận 1, TP.HCM", "0901"], ["2", "Bình", "Xã Tân Lập, Đan Phượng, Hà Nội", "0902"]];
  assert.deepStrictEqual(B.guessColumn(rows), { col: 2, header: true });
  assert.deepStrictEqual(B.guessColumn(rows.slice(1).map(r => [r[2]])), { col: 0, header: false });
  // một cột không tiêu đề, dòng đầu là địa chỉ hỏng: không coi là tiêu đề
  assert.deepStrictEqual(B.guessColumn([["không rõ 20"], ["Phường Bến Nghé, Quận 1"], ["Xã Tân Lập, Hà Nội"]]), { col: 0, header: false });
  assert.deepStrictEqual(B.guessColumn([["STT", "Tên", "Nơi ở"], ["1", "An", "Phường Bến Nghé, Quận 1"]]).header, true);
});

test("one row: statuses, new address, candidates in the note", () => {
  const ok = B.convertOne("  Số 12 Nguyễn Huệ,  P. Bến Nghé, Q.1 , TP.HCM ");
  assert.deepStrictEqual([ok.status, ok.newAddress], ["ok", "Số 12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh"]);
  const split = B.convertOne("Phường Đa Kao, Quận 1, TP.HCM");
  assert.strictEqual(split.status, "split");
  assert.strictEqual(split.newAddress, "");
  assert.strictEqual(split.candidates.length, 2);
  assert.ok(/Phường Sài Gòn/.test(split.note) && /Phường Tân Định/.test(split.note));
  const amb = B.convertOne("Xã Tân Lập");
  assert.strictEqual(amb.status, "ambiguous");
  assert.ok(amb.candidates.length >= 10 && /và \d+ nơi khác/.test(amb.note));
  assert.strictEqual(B.convertOne("Chưa cập nhật").status, "not-found");
  assert.strictEqual(B.convertOne("Phường Sài Gòn, TP.HCM").status, "already-new");
  assert.strictEqual(B.convertOne("   ").status, "empty");
  assert.strictEqual(B.convertOne("Phường Hàng Trốgn, Hoàn Kiếm, Hà Nội").status, "split");
  assert.strictEqual(B.convertOne("Xã Bát Tràngg, Huyện Gia Lâm, Hà Nội").status, "split");
  const typo = B.convertOne("Phường Bến Nhge, Quận 1, TP.HCM");
  assert.deepStrictEqual([typo.status, typo.newAddress], ["check", "Phường Sài Gòn, Thành phố Hồ Chí Minh"]);
  // dính chữ: "xãMỹ Bình", "TTTân Lạc"
  assert.strictEqual(B.convertOne("xãMỹ Bình, H. Đức Huệ, Long An").status, "ok");
  assert.strictEqual(B.convertOne("TTTân Lạc, H Quỳ Châu, Nghệ An").status, "ok");
  // tên mới trùng tên cũ khi coi là gõ nhầm: là địa chỉ mới
  assert.strictEqual(B.convertOne("Xã Thanh Oai, Thành phố Hà Nội").status, "already-new");
});

test("1,000 mixed rows: every row matched, flagged or rejected correctly", async () => {
  const rows = S.make();
  assert.strictEqual(rows.length, 1000);
  const out = await B.convertRows(rows.map(r => r.address));
  const wrong = [];
  rows.forEach((x, i) => {
    const r = out.results[i], res = A.oldToNew(r.old), ids = res.results.map(y => y.unit.id).sort().join();
    let ok;
    if (x.kind === "junk") ok = r.status === "not-found";
    else if (x.kind === "already-new") ok = res.results.length === 1 && res.results[0].unit.id === x.newId;
    else if (r.status === "ambiguous") ok = res.candidates.some(c => c.old.code === x.code);
    else ok = ["ok", "check", "split"].includes(r.status) && ids === x.want;
    if (!ok) wrong.push(`${x.kind}: ${x.address} → ${r.status}`);
  });
  assert.deepStrictEqual(wrong, []);
  const c = out.counts;
  assert.strictEqual(c.ok + c.check + c.split + c.ambiguous + c["already-new"] + c["not-found"] + c.empty, 1000);
  assert.ok(c["not-found"] === 50 && c.split >= 40 && c.ambiguous >= 50);
});

test(".xlsx export opens and reads back; .xlsx import reads shared strings, inline strings and gaps", async () => {
  const res = (await B.convertRows(["Phường Bến Nghé, Quận 1, TP.HCM", "Xã Tân Lập", "x < y & \u0001 z", "Phường Đa Kao, Quận 1, TP.HCM"])).results;
  const parts = B.toXlsx(res), z = new JSZip();
  for (const k in parts) z.file(k, parts[k]);
  const buf = await z.generateAsync({ type: "nodebuffer" });
  const back = await B.readXlsx(JSZip, buf);
  assert.deepStrictEqual(back[0], ["Địa chỉ cũ", "Địa chỉ mới", "Trạng thái", "Ghi chú"]);
  assert.strictEqual(back.length, 5);
  assert.deepStrictEqual(back[1].slice(0, 3), ["Phường Bến Nghé, Quận 1, TP.HCM", "Phường Sài Gòn, Thành phố Hồ Chí Minh", "Đã đổi"]);
  assert.strictEqual(back[2][2], "Trùng tên, chưa rõ");
  assert.strictEqual(back[3][0], "x < y &  z");                 // ký tự điều khiển bị bỏ để tệp hợp lệ
  assert.strictEqual(back[4][2], "Bị chia, cần chọn");
  assert.match(parts["xl/worksheets/sheet1.xml"], /<autoFilter ref="A1:D5"\/>/);

  // tệp kiểu Excel: chuỗi dùng chung (có định dạng nhiều đoạn), ô trống ở giữa, dòng bỏ trống
  const x = new JSZip();
  x.file("xl/workbook.xml", '<workbook xmlns:r="r"><sheets><sheet name="DS" sheetId="1" r:id="rId7"/></sheets></workbook>');
  x.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId7" Type="t" Target="worksheets/data.xml"/></Relationships>');
  x.file("xl/sharedStrings.xml", '<sst><si><t>Địa chỉ</t></si><si><r><t>Phường Bến Nghé, </t></r><r><rPr><b/></rPr><t xml:space="preserve">Quận 1 &amp; HCM</t></r></si></sst>');
  x.file("xl/worksheets/data.xml", '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c><c r="C1" t="s"><v>0</v></c></row>'
    + '<row r="3"><c r="C3" t="s"><v>1</v></c><c r="D3" t="inlineStr"><is><t>ghi chú</t></is></c></row></sheetData></worksheet>');
  const rows = await B.readXlsx(JSZip, await x.generateAsync({ type: "nodebuffer" }));
  assert.deepStrictEqual(rows, [["1", "", "Địa chỉ"], ["", "", "Phường Bến Nghé, Quận 1 & HCM", "ghi chú"]]);
});
