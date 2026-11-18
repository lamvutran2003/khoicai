const test = require("node:test");
const assert = require("node:assert");
const A = require("../site/static/js/dia-chi.js");

const D = A._data;
const names = r => r.results.map(x => x.unit.fullName).sort();
const one = (addr, unit, conf) => {
  const r = A.oldToNew(addr);
  assert.strictEqual(r.status, "found", addr + ": " + r.notes.join(" "));
  assert.deepStrictEqual(names(r), [unit], addr);
  if (conf) assert.strictEqual(r.confidence, conf, addr + ": " + r.notes.join(" "));
  return r;
};

test("normalise: abbreviations, spacing, street kept as typed", () => {
  const n = A.normalise("  12/3   Lê Lợi ,  P.05 , Q.Gò Vấp ,  TP.HCM ");
  assert.strictEqual(n.street, "12/3 Lê Lợi");
  assert.deepStrictEqual([n.commune.type, n.commune.name], ["phường", "5"]);
  assert.deepStrictEqual([n.district.type, n.district.name], ["quận", "Gò Vấp"]);
  assert.strictEqual(n.text, "12/3 Lê Lợi, Phường 5, Quận Gò Vấp, Thành phố Hồ Chí Minh");

  for (const s of ["P5, Q3, HCM", "p.5 q.3 tphcm", "Phường 5, Quận 3, TP Hồ Chí Minh", "phuong 05 quan 03 ho chi minh", "F5 Q3 TP.HCM"]) {
    const m = A.normalise(s);
    assert.deepStrictEqual([m.commune && m.commune.name, m.district && m.district.name], ["5", "3"], s);
  }
  const t = A.normalise("Xóm 2, X. Bát Tràng, H. Gia Lâm, TP. Hà Nội");
  assert.deepStrictEqual([t.street, t.commune.type, t.commune.name, t.district.type, t.district.name], ["Xóm 2", "xã", "Bát Tràng", "huyện", "Gia Lâm"]);
  assert.strictEqual(A.normalise("TT Đông Anh, Đông Anh, HN").commune.type, "thị trấn");
  assert.strictEqual(A.normalise("Phường Ngô Quyền, TX.Sơn Tây, Hà Nội").district.type, "thị xã");
  // "Bà Rịa - Vũng Tàu" không bị tách ở dấu gạch
  assert.strictEqual(A.normalise("Xã Long Sơn, TP Vũng Tàu, Bà Rịa - Vũng Tàu").province.name, "Bà Rịa Vũng Tàu");
  // số nhà, tên đường giữ nguyên chữ hoa/thường và dấu
  assert.strictEqual(A.oldToNew("Số 1 ngõ 2   phố Hàng Bạc,phường Hàng Bạc,  quận Hoàn Kiếm , hà nội").results[0].address,
    "Số 1 ngõ 2 phố Hàng Bạc, Phường Hoàn Kiếm, Thành phố Hà Nội");
});

test("old → new: typical addresses, with and without accents", () => {
  const r = one("Số 12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM", "Phường Sài Gòn", "high");
  assert.strictEqual(r.results[0].address, "Số 12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh");
  assert.strictEqual(r.old.code, "26740");
  one("12 nguyen hue p ben nghe q1 tphcm", "Phường Sài Gòn", "high");
  one("so 12 nguyen hue, phuong ben nghe, quan 1, thanh pho ho chi minh", "Phường Sài Gòn", "high");
  one("Ben Nghe, Quan 1, Ho Chi Minh", "Phường Sài Gòn", "high");
  one("P5 Q3 HCM", "Phường Bàn Cờ", "high");
  one("Thôn 3, Xã Xuân Quang 3, Huyện Đồng Xuân, Tỉnh Phú Yên", "Xã Xuân Phước", "high");
});

test("accents decide between names that differ only by accents", () => {
  one("Xã Trực Hưng, Huyện Trực Ninh, Tỉnh Nam Định", "Xã Trực Ninh", "high");
  const hung = A.oldToNew("Xã Trực Hùng, Huyện Trực Ninh, Tỉnh Nam Định");
  assert.strictEqual(hung.old.name, "Trực Hùng");
  const plain = A.oldToNew("xa truc hung, huyen truc ninh, nam dinh");
  if (plain.status === "ambiguous") {
    assert.strictEqual(plain.confidence, "low");
    assert.deepStrictEqual(plain.candidates.slice(0, 2).map(c => c.old.name).sort(), ["Trực Hùng", "Trực Hưng"]);
  } else {
    assert.notStrictEqual(plain.confidence, "high");   // cả hai về cùng một xã mới
  }
});

test("same commune name in different provinces", () => {
  const all = A.oldToNew("Xã Tân Lập");
  assert.strictEqual(all.status, "ambiguous");
  assert.strictEqual(all.confidence, "low");
  assert.ok(all.candidates.length >= 10);
  assert.ok(new Set(all.candidates.map(c => c.old.provinceId)).size >= 8);
  assert.ok(all.candidates.every(c => c.results.length >= 1));
  const hn = A.oldToNew("Xã Tân Lập, Huyện Đan Phượng, Hà Nội"), ls = A.oldToNew("Xã Tân Lập, Huyện Bắc Sơn, Tỉnh Lạng Sơn");
  assert.strictEqual(hn.old.provinceId, "01");
  assert.strictEqual(ls.old.provinceId, "20");
  assert.notDeepStrictEqual(names(hn), names(ls));
  assert.ok(ls.results.every(x => x.unit.province.id === "20"));
  // tên tỉnh đủ để chọn khi trong tỉnh chỉ có một đơn vị tên đó
  one("Xã Tân Lập, Lạng Sơn", names(ls)[0], "high");
});

test("split old units return every new unit that took a part", () => {
  const r = A.oldToNew("Phường Đa Kao, Quận 1, Thành phố Hồ Chí Minh");
  assert.strictEqual(r.status, "found");
  assert.strictEqual(r.confidence, "medium");
  assert.deepStrictEqual(r.results.map(x => [x.unit.fullName, x.portion]).sort(), [["Phường Sài Gòn", "mot-phan"], ["Phường Tân Định", "phan-con-lai"]]);
  assert.ok(r.notes.some(n => /chia cho 2/.test(n)));
  // Hòa Thắng: nghị quyết chia cho Hồng Thái và Hòa Thắng (bảng chuyển đổi ghi nhập toàn bộ)
  const h = A.oldToNew("Xã Hòa Thắng, Huyện Bắc Bình, Tỉnh Bình Thuận");
  assert.deepStrictEqual(names(h), ["Xã Hòa Thắng", "Xã Hồng Thái"]);
  assert.ok(h.results.every(x => x.unit.province.fullName === "Tỉnh Lâm Đồng"));
  const hk = A.oldToNew("Phuong Hang Trong, Hoan Kiem, Ha Noi");
  assert.deepStrictEqual(names(hk), ["Phường Cửa Nam", "Phường Hoàn Kiếm"]);
});

test("typos are corrected inside the given district or province, with lower confidence", () => {
  const r = A.oldToNew("Phường Hàng Trốgn, Quận Hoàn Kiếm, Hà Nội");
  assert.strictEqual(r.old.name, "Hàng Trống");
  assert.strictEqual(r.confidence, "medium");
  assert.ok(r.notes.some(n => /gõ nhầm/.test(n)));
  const b = A.oldToNew("Phường Bến Nhge, Quận 1, TP.HCM");
  assert.strictEqual(b.old.name, "Bến Nghé");
  assert.strictEqual(b.confidence, "medium");
  const d = A.oldToNew("Phường Bến Nghé, Quận Một, TP.HCM");          // quận không nhận ra: bỏ qua, vẫn tìm được trong tỉnh
  assert.strictEqual(d.old && d.old.name, "Bến Nghé");
  const q = A.oldToNew("Xã Bát Tràng, Huyện Gia Lâmm, Hà Nội");
  assert.strictEqual(q.old.name, "Bát Tràng");
  // không đoán bừa: tên quá khác thì không tìm thấy
  assert.strictEqual(A.oldToNew("Phường Xyzabc, Quận 1, TP.HCM").status, "not-found");
});

test("missing old district", () => {
  const r = one("Phường Bến Nghé, TP.HCM", "Phường Sài Gòn", "high");
  assert.ok(r.notes.some(n => /Không ghi quận/.test(n)));
  const amb = A.oldToNew("Phường 5, TP.HCM");
  assert.strictEqual(amb.status, "ambiguous");
  assert.ok(amb.candidates.length >= 5);
  // TP.HCM mới gồm cả Bình Dương, Bà Rịa - Vũng Tàu cũ: mọi ứng viên đều là Phường 5 thuộc TP.HCM mới
  assert.ok(amb.candidates.every(c => c.old.name === "5" && c.results.every(x => x.unit.province.id === "79")));
  assert.ok(amb.candidates.filter(c => c.old.provinceId === "79").length >= 5);
  // không ghi tỉnh nhưng quận đủ để xác định
  one("Phường Bến Nghé, Quận 1", "Phường Sài Gòn", "high");
  const dp = A.oldToNew("Xã Tân Lập, Huyện Đan Phượng");
  assert.strictEqual(dp.old.provinceId, "01");
  assert.deepStrictEqual(names(dp), names(A.oldToNew("Xã Tân Lập, Huyện Đan Phượng, Hà Nội")));
  // không ghi gì ngoài tên: tên duy nhất cả nước thì tìm được nhưng không chắc chắn hoàn toàn
  const solo = A.oldToNew("Phường Bến Nghé");
  assert.strictEqual(solo.status, "found");
  assert.strictEqual(solo.confidence, "medium");
});

test("district that does not match the commune lowers confidence", () => {
  const r = A.oldToNew("Phường Bến Nghé, Quận 3, TP.HCM");
  assert.strictEqual(r.old.name, "Bến Nghé");
  assert.strictEqual(r.confidence, "low");
});

test("special cases: 2026 wards, special zones, new province names, Thủ Đức, already-new addresses", () => {
  const b = one("Thị trấn Bố Hạ, Huyện Yên Thế, Tỉnh Bắc Giang", "Phường Bố Hạ", "high");
  assert.strictEqual(b.results[0].address, "Phường Bố Hạ, Thành phố Bắc Ninh");
  one("Xã Đông Sơn, Yên Thế, Bắc Ninh", "Phường Bố Hạ", "high");               // tên tỉnh mới, huyện cũ
  one("Huyện Côn Đảo, Bà Rịa - Vũng Tàu", "Đặc khu Côn Đảo", "high");
  one("Phường Linh Trung, Quận Thủ Đức, TP.HCM", "Phường Linh Xuân", "high");
  one("Phường Linh Trung, TP Thủ Đức", "Phường Linh Xuân", "high");
  one("Phường IV, Thành phố Tây Ninh, Tây Ninh", "Phường Tân Ninh", "high");
  one("Phường 4, Thành phố Tây Ninh, Tây Ninh", "Phường Tân Ninh");
  const n = A.oldToNew("Phường Sài Gòn, TP.HCM");
  assert.strictEqual(n.status, "already-new");
  assert.strictEqual(n.results[0].unit.id, "26740");
});

test("every old unit in the dataset converts back to its own new units", () => {
  let bad = [], checked = 0;
  for (const o of D.O) {
    if (!o.code || o.type === "huyện" || o.type === "khu vực") continue;
    const addr = [o.fullName, o.d >= 0 ? D.D[o.d].fullName : "", D.Q[o.q].fullName].filter(Boolean).join(", ");
    const r = A.oldToNew(addr);
    const want = o.links.map(l => D.U[l.u].id).sort().join(), got = r.results.map(x => x.unit.id).sort().join();
    checked++;
    if (r.status !== "found" || got !== want || r.confidence === "low") bad.push(addr + " → " + r.status + " " + r.confidence + " " + got);
  }
  assert.ok(checked > 10000);
  assert.deepStrictEqual(bad.slice(0, 10), []);
});

test("every old unit also converts when typed without accents (sample)", () => {
  const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  let bad = [];
  D.O.forEach((o, i) => {
    if (i % 7 || !o.code || o.d < 0) return;
    const r = A.oldToNew(plain([o.fullName, D.D[o.d].fullName, D.Q[o.q].fullName].join(", ")));
    const want = o.links.map(l => D.U[l.u].id).sort().join();
    const ok = (r.status === "found" && r.results.map(x => x.unit.id).sort().join() === want)
      || (r.status === "ambiguous" && r.candidates.some(c => c.old.code === o.code));   // tên chỉ khác dấu trong cùng huyện
    if (!ok) bad.push(o.fullName + " " + r.status);
  });
  assert.deepStrictEqual(bad.slice(0, 10), []);
});

test("new → old", () => {
  const r = A.newToOld("Phường Sài Gòn, TP.HCM");
  assert.strictEqual(r.unit.id, "26740");
  assert.strictEqual(r.unit.resolution, "1685/NQ-UBTVQH15");
  const byName = Object.fromEntries(r.old.map(o => [o.name, o]));
  assert.deepStrictEqual(Object.keys(byName).sort(), ["Bến Nghé", "Nguyễn Thái Bình", "Đa Kao"]);
  assert.strictEqual(byName["Bến Nghé"].portion, "toan-bo");
  assert.strictEqual(byName["Đa Kao"].split, true);
  assert.deepStrictEqual(byName["Đa Kao"].alsoIn.map(x => x.fullName), ["Phường Tân Định"]);
  assert.strictEqual(A.newToOld("26740").unit.fullName, "Phường Sài Gòn");
  const bh = A.newToOld("phuong bo ha, bac ninh");
  assert.deepStrictEqual([bh.unit.typeBefore, bh.unit.typeChange], ["xã", "388/NQ-UBTVQH16"]);
  assert.strictEqual(A.newToOld("Xã Bố Hạ, Bắc Ninh").unit.fullName, "Phường Bố Hạ");    // tên trước khi thành phường
  assert.strictEqual(A.newToOld("Xã Tân Thành").status, "ambiguous");
  assert.strictEqual(A.newToOld("Không có xã này"), null);
});

test("region and minimum wage", () => {
  const r = A.region("Phường Hoàn Kiếm, Hà Nội");
  assert.deepStrictEqual([r.years[2026].region, r.years[2026].monthly, r.years[2026].hourly, r.years[2026].decree], ["I", 5310000, 25500, "293/2025/NĐ-CP"]);
  assert.strictEqual(r.years[2027].monthly, 5700000);
  assert.strictEqual(A.region("thuc phan cao bang").years[2026].region, "III");
  assert.strictEqual(A.region("phuong my tho, dong thap").unit.fullName, "Phường Mỹ Tho");
  assert.strictEqual(A.region("Xã Mỹ Thọ, Đồng Tháp").unit.fullName, "Xã Mỹ Thọ");
  // đơn vị lên vùng năm 2027
  const up = D.U.find(u => u.r[2026] !== u.r[2027]);
  const ru = A.region(up.id);
  assert.notStrictEqual(ru.years[2026].region, ru.years[2027].region);
  // mọi đơn vị mới đều có vùng và tìm lại được theo tên + tỉnh
  for (const u of D.U) {
    const x = A.region(u.fullName + ", " + D.P[u.p].fullName);
    assert.ok(x && x.status === "found" && x.unit.id === u.id, u.fullName + ", " + D.P[u.p].fullName);
  }
});

test("search suggests new and old units", () => {
  const s = A.search("ben ng");
  assert.ok(s.some(x => x.kind === "old" && x.old.name === "Bến Nghé" && x.units[0].fullName === "Phường Sài Gòn"));
  const h = A.search("hoan kiem");
  assert.strictEqual(h[0].kind, "new");
  assert.strictEqual(h[0].unit.fullName, "Phường Hoàn Kiếm");
  assert.ok(A.search("tan lap", { province: "01" }).every(x => x.kind === "new" ? x.unit.province.id === "01" : x.units.some(u => u.province.id === "01")));
  assert.deepStrictEqual(A.search(""), []);
});

test("browser data matches data/hanh-chinh (rerun tools/hanh_chinh/export_web.py after rebuilding the dataset)", () => {
  const fs = require("node:fs"), path = require("node:path");
  const root = path.join(__dirname, "..", "data", "hanh-chinh"), index = JSON.parse(fs.readFileSync(path.join(root, "index.json"), "utf8"));
  assert.strictEqual(A.asOf, index.as_of);
  const units = index.provinces.flatMap(p => JSON.parse(fs.readFileSync(path.join(root, p.file), "utf8")).units);
  assert.strictEqual(D.U.length, units.length);
  units.forEach((u, i) => {
    const x = D.U[i];
    assert.deepStrictEqual([x.id, x.fullName, x.r[2026], x.r[2027], x.links.length], [u.id, u.full_name, u.region["2026"], u.region["2027"], u.old_units.length]);
  });
  for (const y of Object.keys(index.wage)) assert.deepStrictEqual(A.wage[y].monthly, index.wage[y].monthly);
});
