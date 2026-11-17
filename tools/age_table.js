// Bảng tra tuổi theo năm sinh cho trang /tinh-tuoi/, sinh lúc build từ chính bộ máy tuoi.js
// node tools/age_table.js <năm hiện tại> <năm sinh đầu> <năm sinh cuối>  -> các dòng <tr>…</tr>
const T = require("../site/static/js/tuoi.js");
const [now, from, to] = process.argv.slice(2).map(Number);
const rows = [];
for (let y = from; y <= to; y++) {
  const i = T.yearInfo(y);
  rows.push(`<tr><td>${y}</td><td class="n">${now - y}</td><td class="n">${now - y + 1}</td>` +
            `<td>${i.canChi} (${i.animal})</td><td>${i.element} <small>(${i.napAm})</small></td></tr>`);
}
process.stdout.write(rows.join("\n"));
