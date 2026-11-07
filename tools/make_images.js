// Tạo biểu tượng trang (favicon) và ảnh xem trước khi chia sẻ (Zalo, Facebook) cho từng công cụ.
// Chạy trên máy có Playwright mỗi khi thêm công cụ hoặc đổi tên/mô tả:  node tools/make_images.js
// Kết quả nằm trong site/static/ (favicon*, apple-touch-icon.png) và site/static/og/<slug>.png, được commit cùng mã.
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, ".."), STATIC = path.join(ROOT, "site/static"), OG = path.join(STATIC, "og");
const font = f => "data:font/woff2;base64," + fs.readFileSync(path.join(__dirname, "fonts", f)).toString("base64");
const FONTS = `@font-face{font-family:A;font-weight:400;src:url(${font("arimo-latin-400-normal.woff2")})}
@font-face{font-family:A;font-weight:700;src:url(${font("arimo-latin-700-normal.woff2")})}
@font-face{font-family:A;font-weight:400;src:url(${font("arimo-vietnamese-400-normal.woff2")});unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:A;font-weight:700;src:url(${font("arimo-vietnamese-700-normal.woff2")});unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}`;
const NAVY = "#0b3d6e", GREEN = "#8fd14f", GREEN_D = "#4c8d2b";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function frontMatter(file) {
  const src = fs.readFileSync(file, "utf8"), m = src.match(/^<!--([\s\S]*?)-->/), meta = {};
  if (m) m[1].trim().split(/\n/).forEach(l => { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  return meta;
}

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${NAVY}"/>
<text x="31" y="45" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="36" letter-spacing="-2"><tspan fill="#fff">T</tspan><tspan fill="${GREEN}">G</tspan></text></svg>`;

function ogHtml(title, sub, label) {
  return `<html><head><style>${FONTS}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;font-family:A,sans-serif;background:#fff;display:flex;flex-direction:column}
.top{background:${NAVY};height:120px;display:flex;align-items:center;justify-content:space-between;padding:0 64px}
.logo{color:#fff;font-weight:700;font-size:56px;letter-spacing:-1px}.logo span{color:${GREEN}}
.tag{color:#fff;font-size:26px;background:${GREEN_D};padding:10px 20px}
.main{flex:1;padding:56px 64px 0;display:flex;flex-direction:column;gap:24px}
h1{color:${NAVY};font-size:${title.length > 30 ? 66 : 76}px;line-height:1.12;font-weight:700;letter-spacing:-1px}
p{color:#333;font-size:34px;line-height:1.35;max-width:1040px}
.foot{height:86px;border-top:6px solid ${GREEN_D};display:flex;align-items:center;justify-content:space-between;padding:0 64px;color:#555;font-size:28px}
.foot b{color:${NAVY}}</style></head><body>
<div class="top"><div class="logo">Tính<span>Giùm</span></div>${label ? `<div class="tag">${esc(label)}</div>` : ""}</div>
<div class="main"><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
<div class="foot"><span><b>tinhgium.vn</b></span><span>Miễn phí · Không cần cài đặt · Không cần đăng ký</span></div></body></html>`;
}

(async () => {
  const CAT = { "tien-hoa-don": "Tiền & lương", "ngay-lich": "Ngày & lịch", "van-ban": "Văn bản", "dat-dai": "Đo lường", "suc-khoe": "Sức khoẻ", "khac": "Tiện ích khác" };
  const jobs = [{ slug: "default", title: "Công cụ tính toán online miễn phí", sub: "Tính lương, tiền điện, VAT, đổi ngày âm dương lịch, chuyển font, tính TDEE… ngay trên trình duyệt.", label: "" },
                { slug: "lich-am", title: "Lịch âm, lịch vạn niên", sub: "Ngày âm từng ngày, mùng một, ngày rằm, ngày lễ và Tết, theo lịch Việt Nam.", label: "Ngày & lịch" }];
  for (const f of fs.readdirSync(path.join(ROOT, "site/tools")).filter(f => f.endsWith(".html"))) {
    const m = frontMatter(path.join(ROOT, "site/tools", f));
    jobs.push({ slug: f.replace(/\.html$/, ""), title: m.h1, sub: m.summary || m.intro || "", label: CAT[m.category] || "" });
  }
  fs.mkdirSync(OG, { recursive: true });
  fs.writeFileSync(path.join(STATIC, "favicon.svg"), ICON_SVG + "\n");
  const b = await chromium.launch(), p = await b.newPage();
  for (const [name, size, square] of [["favicon-48.png", 48], ["favicon-192.png", 192], ["apple-touch-icon.png", 180, true]]) {
    await p.setViewportSize({ width: size, height: size });
    const svg = (square ? ICON_SVG.replace('rx="12"', 'rx="0"') : ICON_SVG).replace("<svg ", `<svg width="${size}" height="${size}" `).replace(/Arial,Helvetica,sans-serif/, "A");
    await p.setContent(`<html><head><style>${FONTS}body{margin:0}</style></head><body>${svg}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(STATIC, name), omitBackground: true });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  for (const j of jobs) {
    await p.setContent(ogHtml(j.title, j.sub, j.label));
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OG, j.slug + ".png"), type: "png" });
  }
  await b.close();
  console.log(`icons + ${jobs.length} share images -> site/static`);
})();
