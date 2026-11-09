const test = require("node:test");
const assert = require("node:assert");
const A = require("../site/static/js/am-lich.js");
const N = require("../site/static/js/nghi-tet.js");

const tet = A.toSolar(1, 1, 2027, 0).jd;
const d = j => { const x = A.jdToDate(j); return `${x.day}/${x.month}`; };
const summary = p => `${d(p.start)}-${d(p.end)} ${p.total} back ${d(p.back)} bu ${p.days.filter(x => x.kind === "bu").map(x => d(x.jd)).join(",")}`;

test("Tết 2027 is Saturday 6/2", () => {
  assert.strictEqual(d(tet), "6/2");
  assert.strictEqual(N.dow(tet), 6);
});

test("civil-servant schedule = option 2 with Sat+Sun off: 4/2–10/2, 7 days (Thông báo 11483/TB-BNV)", () => {
  assert.strictEqual(summary(N.plan(tet, 2)), "4/2-10/2 7 back 11/2 bu 9/2,10/2");
});

test("company options with Sat+Sun off", () => {
  assert.strictEqual(summary(N.plan(tet, 1)), "5/2-11/2 7 back 12/2 bu 10/2,11/2");
  assert.strictEqual(summary(N.plan(tet, 3)), "3/2-9/2 7 back 10/2 bu 8/2,9/2");
});

test("Sunday-only rest day: one make-up day", () => {
  assert.strictEqual(summary(N.plan(tet, 2, [0])), "4/2-9/2 6 back 10/2 bu 9/2");
  assert.strictEqual(summary(N.plan(tet, 3, [0])), "3/2-8/2 6 back 9/2 bu 8/2");
});

test("adjacent weekend is joined to the break", () => {
  // Tết 2026 (17/2, thứ Ba), phương án 1 ngày trước: 16/2–20/2, nối thứ Bảy 14 và Chủ nhật 15 phía trước, 21–22 phía sau
  const t26 = A.toSolar(1, 1, 2026, 0).jd;
  assert.strictEqual(summary(N.plan(t26, 1)), "14/2-22/2 9 back 23/2 bu ");
});

test("todayJd uses Vietnam time", () => {
  assert.strictEqual(N.todayJd(new Date("2027-02-05T17:30:00Z")), tet);   // 00:30 ngày 6/2 giờ VN
  assert.strictEqual(N.todayJd(new Date("2027-02-05T16:30:00Z")), tet - 1);
});
