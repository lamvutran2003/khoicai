const test = require("node:test");
const assert = require("node:assert");
const T = require("../site/static/js/font-tables.js");
const F = require("../site/static/js/font-viet.js");

// Encode Unicode text back into an old font (inverse tables), so every letter is tested both ways.
const inverse = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
const TCVN = inverse(T.TCVN3), VNI = inverse(T.VNI);
const enc = (s, inv) => [...s].map(c => inv[c] ?? c).join("");
const SAMPLE = "Cộng hòa xã hội chủ nghĩa Việt Nam. Độc lập – Tự do – Hạnh phúc. Hà Nội, ngày 15 tháng 8 năm 2026: " +
  "đường ướt, quyển sách, thuở ấy, nghĩa vụ, kỹ thuật, người ở, Ứng dụng, Ơn nghĩa, Ưu tiên, Đăk Lăk.";

test("TCVN3 round trip for a full sentence", () => {
  const old = enc(SAMPLE.toLowerCase(), TCVN);     // TCVN3 has no accented capitals; those use the H fonts
  assert.notStrictEqual(old, SAMPLE.toLowerCase());
  assert.strictEqual(F.convert(old, "TCVN3"), SAMPLE.toLowerCase());
});

test("VNI round trip, including capitals", () => {
  const old = enc(SAMPLE, VNI);
  assert.ok(old.includes("Vieät Nam"), old);
  assert.strictEqual(F.convert(old, "VNI"), SAMPLE);
});

test("known samples", () => {
  assert.strictEqual(F.convert("Hµ Néi", "TCVN3"), "Hà Nội");
  assert.strictEqual(F.convert("Haø Noäi", "VNI"), "Hà Nội");
  assert.strictEqual(F.convert("céng hßa", "TCVN3", { upper: true }), "CỘNG HÒA");   // .VnTimeH
});

test("detects the encoding", () => {
  assert.strictEqual(F.detect(enc(SAMPLE.toLowerCase(), TCVN)).enc, "TCVN3");
  assert.strictEqual(F.detect(enc(SAMPLE, VNI)).enc, "VNI");
  assert.strictEqual(F.detect(SAMPLE).reason, "unicode");
  assert.strictEqual(F.detect(SAMPLE.normalize("NFD")).enc, "NFC");
  assert.strictEqual(F.detect("Hello world").reason, "plain");
});

test("Word XML: converts runs by font, follows styles, swaps font names", () => {
  const styles = F.readStyles('<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr></w:rPrDefault></w:docDefaults>' +
    '<w:style w:styleId="Old"><w:rPr><w:rFonts w:ascii=".VnTime" w:hAnsi=".VnTime"/></w:rPr></w:style>' +
    '<w:style w:styleId="OldChild"><w:basedOn w:val="Old"/></w:style></w:styles>');
  const xml = '<w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="VNI-Times" w:hAnsi="VNI-Times"/></w:rPr><w:t>Haø Noäi &amp; x</w:t></w:r>' +
    '<w:r><w:t>English</w:t></w:r></w:p>' +
    '<w:p><w:pPr><w:pStyle w:val="OldChild"/></w:pPr><w:r><w:t xml:space="preserve">Hµ Néi </w:t></w:r></w:p>' +
    '<w:p><w:r><w:rPr><w:rFonts w:ascii=".VnArialH"/></w:rPr><w:t>céng hßa</w:t></w:r></w:p></w:body>';
  const stats = { runs: 0, chars: 0 };
  const out = F.convertDocxXml(xml, styles, stats);
  assert.ok(out.includes("<w:t>Hà Nội &amp; x</w:t>"), out);
  assert.ok(out.includes("<w:t>English</w:t>"));
  assert.ok(out.includes('<w:t xml:space="preserve">Hà Nội </w:t>'));
  assert.ok(out.includes("<w:t>CỘNG HÒA</w:t>"));
  assert.ok(out.includes('w:ascii="Times New Roman"') && out.includes('w:ascii="Arial"') && !out.includes("VNI-Times"));
  assert.strictEqual(stats.runs, 3);
});

test("TCVN3 letters that share a code with their capital stay lowercase (ý, đồng ý)", () => {
  const F = require("../site/static/js/font-viet.js");
  const src = "C¨n cø ®Ò nghÞ cña phßng KÕ ho¹ch – Tµi chÝnh, ®ång ý thanh to¸n sè tiÒn nªu trªn.";
  assert.strictEqual(F.convert(src, "TCVN3"), "Căn cứ đề nghị của phòng Kế hoạch – Tài chính, đồng ý thanh toán số tiền nêu trên.");
  assert.strictEqual(F.detect(src).enc, "TCVN3");
});

test("user sample: '-' as ư, and words that are already Unicode stay untouched", () => {
  const F = require("../site/static/js/font-viet.js");
  const src = "§©y lµ ®o¹n v¨n mÉu ®-îc m· hãa b»ng ph«ng ch÷ .VnTime. Khi b¹n d¸n ®o¹n v¨n nµy vµo c¸c phÇn mÒm nh- Microsoft Word, c¸c ký tù sÏ hiÓn thÞ thµnh tiếng Việt hoàn chỉnh và chính xác.\nNÕu b¹n thÊy th× còng ®óng nh- mong ®îi, v× hÖ thèng cña b¹n ®ang sö dông b¶ng m· Unicode chuẩn.";
  const want = "Đây là đoạn văn mẫu được mã hóa bằng phông chữ .VnTime. Khi bạn dán đoạn văn này vào các phần mềm như Microsoft Word, các ký tự sẽ hiển thị thành tiếng Việt hoàn chỉnh và chính xác.\nNếu bạn thấy thì cũng đúng như mong đợi, vì hệ thống của bạn đang sử dụng bảng mã Unicode chuẩn.";
  assert.strictEqual(F.detect(src).enc, "TCVN3");
  assert.strictEqual(F.convert(src, "TCVN3"), want);
  // real hyphens are kept
  assert.strictEqual(F.convert("e-mail, COVID-19, Wi-Fi, Hµ Néi", "TCVN3"), "e-mail, COVID-19, Wi-Fi, Hà Nội");
  // the soft hyphen itself still works
  assert.strictEqual(F.convert("®­îc", "TCVN3"), "được");
});
