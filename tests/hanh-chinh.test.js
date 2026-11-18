// Kiểm tra bộ dữ liệu data/hanh-chinh (đơn vị hành chính sau sắp xếp 2025 + vùng lương).
// Các số đối chiếu được đọc lại trực tiếp từ bản lưu văn bản gốc trong sources/, không lấy từ bước dựng dữ liệu.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "data", "hanh-chinh");
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const index = read("index.json");
const provs = index.provinces.map(p => read(p.file));
const allUnits = provs.flatMap(d => d.units.map(u => ({ prov: d, u })));
const years = Object.keys(index.wage);
const typeOn20250701 = u => (u.type_changes.length ? u.type_changes[0].from : u.type);

function unit(provId, name, type) {
  const d = provs.find(p => p.id === provId);
  const u = d.units.filter(x => x.name === name && (!type || x.type === type));
  assert.strictEqual(u.length, 1, `${name} (${provId}) found exactly once`);
  return u[0];
}
const oldUnit = (u, name) => {
  const o = u.old_units.filter(x => x.name === name);
  assert.strictEqual(o.length, 1, `old unit ${name} listed once in ${u.full_name}`);
  return o[0];
};

test("34 provinces, 3,321 units, national totals as announced", () => {
  assert.strictEqual(provs.length, 34);
  assert.strictEqual(allUnits.length, 3321);
  const c = {};
  for (const { u } of allUnits) c[typeOn20250701(u)] = (c[typeOn20250701(u)] || 0) + 1;
  assert.deepStrictEqual(c, { "xã": 2621, "phường": 687, "đặc khu": 13 });
  assert.strictEqual(index.totals.units, 3321);
  const ids = new Set(provs.map(p => p.id));
  assert.strictEqual(ids.size, 34);
});

test("per-province counts match the number written in each resolution", () => {
  const num = s => parseInt(s, 10);
  for (const d of provs) {
    const file = path.join(ROOT, "sources", "nghi-quyet", d.sources.commune_resolution.replace(/\//g, "-") + ".txt");
    const text = fs.readFileSync(file, "utf8").replace(/\s+/g, " ");
    const m = text.match(/có (\d+) đơn vị hành chính cấp xã,? gồm\s*([^;.]+)/);   // văn bản gốc có chỗ thiếu dấu phẩy, dính chữ
    assert.ok(m, `${d.name}: stated count found in ${d.sources.commune_resolution}`);
    assert.strictEqual(d.units.length, num(m[1]), `${d.name}: total`);
    const stated = { "xã": 0, "phường": 0, "đặc khu": 0 };
    for (const [, n, t] of m[2].matchAll(/(\d+)\s*(phường|xã|đặc khu)/g)) stated[t] += num(n);
    const built = { "xã": 0, "phường": 0, "đặc khu": 0 };
    for (const u of d.units) built[typeOn20250701(u)]++;
    assert.deepStrictEqual(built, stated, `${d.name}: by type on 01/07/2025`);
  }
});

test("no duplicate unit IDs; slugs unique within a province", () => {
  const ids = new Set();
  for (const { prov, u } of allUnits) {
    assert.match(u.id, /^\d{5}$/, `${u.full_name} id`);
    assert.ok(!ids.has(u.id), `duplicate id ${u.id}`);
    ids.add(u.id);
  }
  for (const d of provs) {
    const slugs = d.units.map(u => u.slug);
    assert.strictEqual(new Set(slugs).size, slugs.length, `${d.name} slugs`);
  }
});

test("every new unit has at least one old unit and a wage region for every year", () => {
  for (const { prov, u } of allUnits) {
    assert.ok(u.old_units.length >= 1, `${prov.name} / ${u.full_name} has old units`);
    for (const y of years) assert.ok(["I", "II", "III", "IV"].includes(u.region[y]), `${prov.name} / ${u.full_name} region ${y}`);
  }
});

test("split old units are recorded consistently", () => {
  const occ = new Map();
  for (const { u } of allUnits) for (const o of u.old_units) {
    if (!o.id) continue;
    if (!occ.has(o.id)) occ.set(o.id, []);
    occ.get(o.id).push({ newId: u.id, o });
  }
  assert.strictEqual(occ.size, 10035, "distinct old units with codes");
  let splits = 0;
  for (const [id, list] of occ) {
    if (list.length === 1) {
      assert.strictEqual(list[0].o.split, false, `${id} appears once but is marked split`);
      continue;
    }
    splits++;
    assert.ok(list.every(x => x.o.portion !== "toan-bo"), `${id} merged whole but also listed elsewhere`);
    for (const { newId, o } of list) {
      assert.strictEqual(o.split, true, `${id} in ${newId}: split flag`);
      const others = list.map(x => x.newId).filter(x => x !== newId).sort();
      assert.deepStrictEqual([...o.also_in].sort(), others, `${id} in ${newId}: also_in`);
    }
  }
  assert.ok(splits > 0);
});

test("every province cites its resolution with a link and a local copy", () => {
  for (const d of provs) {
    const c = d.sources.citations.find(x => x.document === d.sources.commune_resolution);
    assert.ok(c && /^https:\/\//.test(c.url), `${d.name} citation`);
    for (const x of d.sources.citations) assert.ok(fs.existsSync(path.join(ROOT, x.copy)), `${d.name}: ${x.copy}`);
  }
});

test("wage amounts match the decree texts", () => {
  const fmt = n => n.toLocaleString("de-DE");
  for (const [y, file] of [["2026", "nd-293-2025-nghi-dinh.txt"], ["2027", "nd-399-2026-nghi-dinh.txt"]]) {
    const text = fs.readFileSync(path.join(ROOT, "sources", file), "utf8");
    for (const r of ["I", "II", "III", "IV"]) {
      const re = new RegExp(`Vùng ${r}\\s+${fmt(index.wage[y].monthly[r]).replace(/\./g, "\\.")}\\s+${fmt(index.wage[y].hourly[r]).replace(/\./g, "\\.")}`);
      assert.match(text, re, `${y} vùng ${r}`);
    }
  }
  assert.strictEqual(index.wage["2026"].decree, "293/2025/NĐ-CP");
  assert.strictEqual(index.wage["2027"].decree, "399/2026/NĐ-CP");
  // không có vùng nào bị hạ bậc từ 2026 sang 2027
  const rank = { I: 1, II: 2, III: 3, IV: 4 };
  for (const { u } of allUnits) assert.ok(rank[u.region["2027"]] <= rank[u.region["2026"]], `${u.full_name} region went down`);
});

test("spot checks: Hà Nội, Cao Bằng, Côn Đảo", () => {
  const hk = unit("01", "Hoàn Kiếm", "phường");
  assert.strictEqual(oldUnit(hk, "Hàng Bạc").portion, "toan-bo");
  const cn = oldUnit(hk, "Cửa Nam");
  assert.strictEqual(cn.portion, "mot-phan");
  assert.ok(cn.split && cn.also_in.length >= 1);
  assert.strictEqual(hk.region["2026"], "I");
  assert.deepStrictEqual(hk.source, { resolution: "1656/NQ-UBTVQH15", clause: 1 });

  assert.strictEqual(unit("04", "Thục Phán", "phường").region["2026"], "III");

  const cd = unit("79", "Côn Đảo", "đặc khu");
  assert.strictEqual(cd.formation, "dac-khu-tu-huyen");
  assert.strictEqual(cd.old_units[0].type, "huyện");
  assert.strictEqual(cd.old_units[0].province, "Tỉnh Bà Rịa - Vũng Tàu");
});

test("Hòa Thắng (Lâm Đồng) is split as the resolution says, not whole as the NSO table says", () => {
  const ht = unit("68", "Hòa Thắng", "xã");
  const hongThai = unit("68", "Hồng Thái", "xã");
  const a = oldUnit(hongThai, "Hòa Thắng"), b = oldUnit(ht, "Hòa Thắng");
  assert.strictEqual(a.portion, "mot-phan");
  assert.strictEqual(b.portion, "phan-con-lai");
  assert.strictEqual(a.id, b.id);
  assert.deepStrictEqual(a.also_in, [ht.id]);
  assert.deepStrictEqual(b.also_in, [hongThai.id]);
});

test("2026 changes: Bố Hạ became a ward, Bắc Ninh a city", () => {
  const bh = unit("24", "Bố Hạ");
  assert.strictEqual(bh.type, "phường");
  assert.strictEqual(bh.name_2025, "Xã Bố Hạ");
  assert.deepStrictEqual(bh.type_changes, [{ from: "xã", to: "phường", resolution: "388/NQ-UBTVQH16", effective: "2026-09-20" }]);
  const bn = provs.find(p => p.id === "24");
  assert.strictEqual(bn.full_name, "Thành phố Bắc Ninh");
  assert.strictEqual(bn.sources.became_city.resolution, "39/2026/QH16");
  const changed = allUnits.filter(({ u }) => u.type_changes.length).length;
  assert.strictEqual(changed, 22, "10 Đồng Nai + 12 Bắc Ninh communes became wards");
});

test("source corrections stay applied", () => {
  // Cồn Cỏ: bảng chuyển đổi ghi tỉnh cũ mã 44 (mã mới); tỉnh Quảng Trị cũ là 45
  const cc = unit("44", "Cồn Cỏ", "đặc khu");
  assert.strictEqual(cc.old_units[0].province_id, "45");
  // Xuân Quang 3: bảng chuyển đổi thiếu chữ "Xã"; lấy theo nghị quyết
  const xp = unit("66", "Xuân Phước", "xã");
  assert.strictEqual(oldUnit(xp, "Xuân Quang 3").full_name, "Xã Xuân Quang 3");
  // ba mã đơn vị cũ sai trong bảng chuyển đổi đã được sửa
  const fixed = allUnits.flatMap(({ u }) => u.old_units.filter(o => o.code_check === "da-sua-ma").map(o => o.id)).sort();
  assert.deepStrictEqual(fixed, ["00556", "01651", "02482"]);
});
