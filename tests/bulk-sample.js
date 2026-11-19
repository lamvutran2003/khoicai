// 1.000 địa chỉ cũ lẫn lộn để thử đổi hàng loạt, sinh từ bộ dữ liệu (cố định theo hạt giống), kèm đáp án đúng.
// Dùng trong tests/dia-chi-bang.test.js và khi đo thời gian trên trang (node tests/bulk-sample.js > mau.tsv).
const A = require("../site/static/js/dia-chi.js");
const D = A._data;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
const STREETS = ["Số 12 Nguyễn Huệ", "45/7 Lê Lợi", "Thôn 3", "Tổ 5", "Ấp Phú Hòa", "Số 8, ngõ 21 Trần Phú", "Xóm Đình", "Lô B2 KCN", "Khu phố 4", "128 Quang Trung"];
const ABBR_C = { "Phường": ["P.", "P", "p."], "Xã": ["X.", "xã", "X"], "Thị trấn": ["TT", "TT.", "thị trấn"] };
const ABBR_D = { "Quận": ["Q.", "Q", "quận"], "Huyện": ["H.", "huyện", "H"], "Thị xã": ["TX", "TX.", "thị xã"], "Thành phố": ["TP", "TP.", "Tp"] };
const ABBR_P = { "Thành phố Hồ Chí Minh": ["TP.HCM", "TPHCM", "Sài Gòn", "HCM"], "Thành phố Hà Nội": ["HN", "Hà Nội", "TP. Hà Nội"],
                 "Thành phố Đà Nẵng": ["Đà Nẵng", "TP Đà Nẵng"], "Thành phố Hải Phòng": ["HP", "Hải Phòng"] };

function make(seed = 20261119) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)];
  const olds = D.O.filter(o => o.code && o.d >= 0 && (o.type === "xã" || o.type === "phường" || o.type === "thị trấn"));
  const nameCount = {}; olds.forEach(o => { nameCount[o.f] = (nameCount[o.f] || 0) + 1; });
  const want = o => o.links.map(l => D.U[l.u].id).sort().join();
  const parts = o => {
    const d = D.D[o.d], q = D.Q[o.q];
    return { c: o.fullName, cType: o.fullName.slice(0, o.fullName.length - o.name.length - 1), cName: o.name, d: d.fullName, dType: d.type ? d.fullName.slice(0, d.fullName.length - d.name.length - 1) : "", dName: d.name, p: q.fullName };
  };
  const rows = [];
  const add = (address, kind, o, expect) => rows.push({ address, kind, code: o ? o.code : null, want: o ? want(o) : null, expect });
  const typo = s => {             // đổi chỗ hai chữ liền nhau, hoặc bỏ một chữ, trong tên dài
    const i = 1 + Math.floor(r() * (s.length - 3));
    return r() < 0.5 ? s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2) : s.slice(0, i) + s.slice(i + 1);
  };
  for (let i = 0; i < 250; i++) { const o = pick(olds), x = parts(o); add(`${pick(STREETS)}, ${x.c}, ${x.d}, ${x.p}`, "clean", o, "found"); }
  for (let i = 0; i < 150; i++) { const o = pick(olds), x = parts(o); add(plain(`${pick(STREETS)}, ${x.c}, ${x.d}, ${x.p}`).toLowerCase(), "no-accents", o, "found-or-ambiguous"); }
  for (let i = 0; i < 150; i++) {
    const o = pick(olds), x = parts(o);
    const c = `${pick(ABBR_C[x.cType] || [x.cType])}${r() < 0.5 ? "" : " "}${x.cName}`;
    const d = `${pick(ABBR_D[x.dType] || [x.dType])} ${x.dName}`;
    const p = pick(ABBR_P[x.p] || [x.p.replace(/^Tỉnh /, ""), x.p]);
    const sep = pick([", ", " , ", ",", "  ,  "]);
    add(`  ${pick(STREETS)}${sep}${c}${sep}${d}${sep}${p}  `, "abbreviated", o, "found");
  }
  const longs = olds.filter(o => o.name.length >= 7 && !/\d/.test(o.name));
  for (let i = 0; i < 100; i++) { const o = pick(longs), x = parts(o); add(`${x.cType} ${typo(x.cName)}, ${x.d}, ${x.p}`, "typo", o, "found"); }
  for (let i = 0; i < 100; i++) { const o = pick(olds), x = parts(o); add(`${pick(STREETS)}, ${x.c}, ${x.p}`, "no-district", o, "found-or-ambiguous"); }
  const common = olds.filter(o => nameCount[o.f] >= 4);
  for (let i = 0; i < 60; i++) { const o = pick(common); add(`${pick(STREETS)}, ${o.fullName}`, "same-name", o, "ambiguous"); }
  const splits = olds.filter(o => o.links.length > 1);
  for (let i = 0; i < 40; i++) { const o = pick(splits), x = parts(o); add(`${x.c}, ${x.d}, ${x.p}`, "split", o, "split"); }
  const oldNames = new Set(D.O.map(o => o.f));
  const fresh = D.U.filter(u => !oldNames.has(u.f));
  for (let i = 0; i < 50; i++) { const u = pick(fresh); rows.push({ address: `${pick(STREETS)}, ${u.fullName}, ${D.P[u.p].fullName}`, kind: "already-new", newId: u.id, expect: "already-new" }); }
  // xã, huyện cũ nhưng ghi tên tỉnh mới (đã nhập), như nhiều người đang ghi
  const moved = olds.filter(o => { const ps = new Set(o.links.map(l => D.U[l.u].p)); return ps.size === 1 && D.P[[...ps][0]].name !== D.Q[o.q].name; });
  for (let i = 0; i < 50; i++) { const o = pick(moved), x = parts(o), np = D.P[D.U[o.links[0].u].p]; add(`${pick(STREETS)}, ${x.c}, ${x.d}, ${np.fullName}`, "new-province", o, "found"); }
  const junk = ["không rõ", "Số 5 đường ABC", "xyz 123", "Phòng kế toán", "Chưa cập nhật", "0912345678", "N/A", "Khu công nghiệp", "Đường Láng", "Tầng 3, tòa nhà A"];
  for (let i = 0; i < 50; i++) rows.push({ address: junk[i % junk.length] + (i >= junk.length ? " " + i : ""), kind: "junk", expect: "not-found" });
  // trộn thứ tự
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
  return rows;
}

module.exports = { make };
if (require.main === module) {
  process.stdout.write("STT\tHọ tên\tĐịa chỉ thường trú\n" + make().map((x, i) => `${i + 1}\tNgười ${i + 1}\t${x.address}`).join("\n") + "\n");
}
