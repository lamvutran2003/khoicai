const test = require("node:test");
const assert = require("node:assert");
const D = require("../site/static/js/tien-dien.js");
const N = require("../site/static/js/ngay.js");
const V = require("../site/static/js/van-ban.js");
const S = require("../site/static/js/suc-khoe.js");

test("electricity bill by tiers", () => {
  const b = D.bill(250, 1, 0.08);
  assert.deepStrictEqual(b.rows.map(r => r.kwh), [100, 100, 50]);
  assert.strictEqual(b.net, 100 * 1901 + 100 * 2289 + 50 * 2894);
  assert.strictEqual(b.tax, Math.round(b.net * 0.08));
  assert.strictEqual(b.total, b.net + b.tax);
  assert.strictEqual(D.bill(800, 1, 0).net, 100 * 1901 + 100 * 2289 + 200 * 2894 + 300 * 3456 + 100 * 3844);
  // two households sharing a meter: tier sizes double
  assert.deepStrictEqual(D.bill(250, 2, 0).rows.map(r => r.kwh), [200, 50]);
  assert.strictEqual(D.bill(0).total, 0);
  assert.strictEqual(D.vatRate(new Date(2026, 10, 6)), 0.08);
  assert.strictEqual(D.vatRate(new Date(2027, 0, 1)), 0.10);
});

test("2026 days off match the official schedule", () => {
  const off = N.daysOff(2026), dates = Object.keys(off).map(Number).sort((a, b) => a - b).map(j => { const d = N.toDate(j); return d.day + "/" + d.month; });
  assert.deepStrictEqual(dates, ["1/1", "16/2", "17/2", "18/2", "19/2", "20/2", "27/4", "30/4", "1/5", "1/9", "2/9", "24/11"]);
  assert.match(off[N.jd(27, 4, 2026)], /nghỉ bù/);
  assert.strictEqual(N.workdays(N.jd(1, 1, 2026), N.jd(31, 12, 2026)).count, 261 - 12);
  assert.strictEqual(N.workdays(N.jd(1, 1, 2026), N.jd(31, 12, 2026), { holidays: false }).count, 261);
});

test("add workdays, months, and y/m/d difference", () => {
  // Friday 13/2/2026 + 1 working day skips the weekend and Tết -> Monday 23/2
  const r = N.toDate(N.addWorkdays(N.jd(13, 2, 2026), 1));
  assert.deepStrictEqual([r.day, r.month], [23, 2]);
  const m = N.toDate(N.addMonths(N.jd(31, 1, 2026), 1));
  assert.deepStrictEqual([m.day, m.month], [28, 2]);
  assert.deepStrictEqual(N.ymd(N.jd(15, 3, 2020), N.jd(6, 11, 2026)), { years: 6, months: 7, days: 22, totalMonths: 79 });
  assert.deepStrictEqual(N.ymd(N.jd(31, 1, 2026), N.jd(28, 2, 2026)), { years: 0, months: 1, days: 0, totalMonths: 1 });
});

test("text: unaccent, slug, file name, cases, stats", () => {
  assert.strictEqual(V.unaccent("Đường Hồ Chí Minh, Quận 1"), "Duong Ho Chi Minh, Quan 1");
  assert.strictEqual(V.slug("Hà Nội – Thủ đô ngàn năm văn hiến!"), "ha-noi-thu-do-ngan-nam-van-hien");
  assert.strictEqual(V.fileName("Báo cáo tháng 11: doanh thu"), "Bao_cao_thang_11_doanh_thu");
  assert.strictEqual(V.toCase("đặng thị ánh", "upper"), "ĐẶNG THỊ ÁNH");
  assert.strictEqual(V.toCase("ĐẶNG THỊ ÁNH", "title"), "Đặng Thị Ánh");
  assert.strictEqual(V.toCase("XIN CHÀO. TÔI LÀ AN! bạn khỏe không?", "sentence"), "Xin chào. Tôi là an! Bạn khỏe không?");
  assert.strictEqual(V.toCase("Hà Nội", "swap"), "hÀ nỘI");
  assert.deepStrictEqual(V.stats("Xin chào\nViệt Nam"), { chars: 17, noSpace: 14, words: 4, lines: 2 });
});

test("health: BMI, BMR, TDEE, goals", () => {
  assert.strictEqual(Math.round(S.bmi(65, 170) * 10) / 10, 22.5);
  assert.strictEqual(S.bmiClass(22.5), "Bình thường");
  assert.strictEqual(S.bmiClass(23.5), "Thừa cân");
  assert.strictEqual(S.bmr("male", 30, 170, 65), 10 * 65 + 6.25 * 170 - 150 + 5);
  assert.strictEqual(S.bmr("female", 30, 160, 55), 550 + 1000 - 150 - 161);
  assert.strictEqual(Math.round(S.tdee("male", 30, 170, 65, "mod")), Math.round(1567.5 * 1.55));
  const g = S.goal("female", 30, 160, 55, "sed", -0.5);
  assert.strictEqual(Math.round(g.target), Math.round(1239 * 1.2 - 550));
  assert.strictEqual(g.belowFloor, true);
});

test("title case keeps vowel-less acronyms", () => {
  assert.strictEqual(V.toCase("CÔNG TY TNHH MTV THƯƠNG MẠI AN PHÁT", "title"), "Công Ty TNHH MTV Thương Mại An Phát");
  assert.strictEqual(V.toCase("nguyễn văn an", "title"), "Nguyễn Văn An");
});

test("health: Harris–Benedict, Katch–McArdle, U.S. Navy body fat", () => {
  assert.strictEqual(Math.round(S.bmrHarris("male", 25, 180, 70)), Math.round(13.397 * 70 + 4.799 * 180 - 5.677 * 25 + 88.362));
  assert.strictEqual(S.bmrKatch(70, 20), 370 + 21.6 * 56);
  assert.strictEqual(S.bmr("male", 25, 180, 70, 20), S.bmrKatch(70, 20));       // body fat given -> Katch
  assert.strictEqual(S.bmr("male", 25, 180, 70), S.bmrMifflin("male", 25, 180, 70));
  // U.S. Navy, worked by hand: man 178/85/38 -> 495/1.06123-450 = 16.4%; woman 165/75/33/95 -> 495/1.03791-450 = 26.9%
  assert.strictEqual(Math.round(S.fatNavy("male", 178, 85, 38) * 10) / 10, 16.4);
  assert.strictEqual(Math.round(S.fatNavy("female", 165, 75, 33, 95) * 10) / 10, 26.9);
  assert.strictEqual(S.fatNavy("male", 178, 30, 38), null);
  assert.strictEqual(S.fatClass("male", 16.4), "Cân đối");
  assert.strictEqual(S.fatClass("female", 26.9), "Trung bình");
  assert.strictEqual(S.ACTIVITY.map(a => a.f).join(), "1.2,1.375,1.465,1.55,1.725,1.9");
});
