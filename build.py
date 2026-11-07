"""Build the tool site into dist/.

site/tools/<slug>.html   one tool per file -> /<slug>/ ; front matter (top HTML comment, "key: value" lines):
                         title, h1, description, category, order, summary (thẻ trang chủ), intro (một dòng dưới tiêu đề)
site/pages/<slug>.html   plain pages (giới thiệu, chính sách) -> /<slug>/
site/partials/           style.css, header.html, footer.html (shared)
site/static/             copied to the site root (js/, icons)

    SITE_URL=https://tinhgium.vn python build.py
"""
from __future__ import annotations

import html
import json
import os
import shutil
from datetime import date
from pathlib import Path

import lunar_pages

ROOT = Path(__file__).resolve().parent
SITE, DIST = ROOT / "site", ROOT / "dist"
SITE_URL = (os.environ.get("SITE_URL") or "https://tinhgium.vn").rstrip("/")
SITE_NAME = os.environ.get("SITE_NAME") or "Tính Giùm"
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL") or "lienhe@tinhgium.vn"
# Thống kê lượt xem Cloudflare Web Analytics (không cookie). Mã lấy trong Cloudflare > Web Analytics; để trống thì không gắn.
CF_BEACON_TOKEN = (os.environ.get("CF_BEACON_TOKEN") or "").strip()
# Khi site nằm trong thư mục con (ví dụ GitHub Pages chưa có tên miền: /khoicai), mọi đường dẫn "/..." được thêm tiền tố
BASE = "/" + SITE_URL.split("://", 1)[-1].partition("/")[2].strip("/") if "/" in SITE_URL.split("://", 1)[-1] else ""
BASE = BASE.rstrip("/")
CATEGORIES = [   # (id, tên đầy đủ, tên ngắn trên thanh menu), theo thứ tự hiển thị
    ("tien-hoa-don", "Tiền, lương & hoá đơn", "Tiền & lương"),
    ("ngay-lich", "Ngày & lịch", "Ngày & lịch"),
    ("van-ban", "Văn bản", "Văn bản"),
    ("dat-dai", "Đo lường & tính toán", "Đo lường"),
    ("suc-khoe", "Sức khoẻ", "Sức khoẻ"),
]
E = html.escape


def front_matter(src: str) -> tuple[dict, str]:
    meta = {}
    if src.startswith("<!--"):
        end = src.index("-->")
        for line in src[4:end].strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
        src = src[end + 3:].lstrip("\n")
    return meta, src


def load(folder: str) -> list[dict]:
    out = []
    for p in sorted((SITE / folder).glob("*.html")):
        meta, body = front_matter(p.read_text(encoding="utf-8"))
        meta.update(slug=p.stem, body=body)
        out.append(meta)
    return out


def og_image(slug: str) -> str:
    """Ảnh xem trước khi chia sẻ link (tạo bằng tools/make_images.js); không có thì dùng ảnh chung."""
    name = slug if (SITE / "static/og" / f"{slug}.png").exists() else "default"
    return f"{SITE_URL}/og/{name}.png"


def head(title: str, desc: str, url: str, extra: str = "", image: str = "") -> str:
    image = image or og_image("default")
    return (f"<title>{E(title)}</title>\n<meta name=\"description\" content=\"{E(desc)}\">\n"
            f"<link rel=\"canonical\" href=\"{url}\">\n"
            "<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n"
            "<link rel=\"icon\" href=\"/favicon-48.png\" sizes=\"48x48\" type=\"image/png\">\n"
            "<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">\n"
            "<meta name=\"theme-color\" content=\"#0b3d6e\">\n"
            f"<meta property=\"og:title\" content=\"{E(title)}\">\n<meta property=\"og:description\" content=\"{E(desc)}\">\n"
            f"<meta property=\"og:url\" content=\"{url}\">\n<meta property=\"og:type\" content=\"website\">\n"
            f"<meta property=\"og:locale\" content=\"vi_VN\">\n<meta property=\"og:site_name\" content=\"{E(SITE_NAME)}\">\n"
            f"<meta property=\"og:image\" content=\"{image}\">\n<meta property=\"og:image:width\" content=\"1200\">\n"
            "<meta property=\"og:image:height\" content=\"630\">\n<meta name=\"twitter:card\" content=\"summary_large_image\">\n"
            + extra)


def bust(doc: str) -> str:
    """Thêm ?v=<mã băm nội dung> vào đường dẫn /js/*.js để trình duyệt không dùng bản cũ trong cache sau mỗi lần cập nhật."""
    import hashlib
    import re

    def ver(m):
        f = SITE / "static" / "js" / m.group(2)
        return m.group(0) if not f.exists() else f'{m.group(1)}{m.group(2)}?v={hashlib.sha1(f.read_bytes()).hexdigest()[:8]}"'
    return re.sub(r'("/js/)([\w.-]+\.js)"', ver, doc)


def rebase(doc: str) -> str:
    doc = bust(doc)
    if not BASE:
        return doc
    import re
    doc = re.sub(r'((?:href|src)=")/(?!/)', r"\1" + BASE + "/", doc)
    return doc.replace('"/js/', '"' + BASE + '/js/')


def page(title, desc, url, body, css, extra_head="", image=""):
    return rebase("<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
            + head(title, desc, url, extra_head, image) + f"<style>\n{css}</style>\n</head>\n<body>\n" + body + beacon() + "\n</body>\n</html>\n")


def beacon() -> str:
    if not CF_BEACON_TOKEN:
        return ""
    return ('\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" '
            f"data-cf-beacon='{json.dumps({'token': CF_BEACON_TOKEN})}'></script>")


def fill(src: str, values: dict) -> str:
    for k, v in values.items():
        src = src.replace(k, v)
    return src


def nav(active: str | None) -> str:
    return "".join(f'<a href="/#c-{cid}"{" class=\"on\" aria-current=\"true\"" if cid == active else ""}>{E(short)}</a>'
                   for cid, _, short in CATEGORIES)


def sidebar(tools, cat: str | None, current: str | None = None) -> str:
    """Cột phải: ô tìm kiếm, danh sách công cụ cùng nhóm, các nhóm khác."""
    out = ['<form class="side-search" action="/" method="get" role="search">'
           '<input name="q" type="search" aria-label="Tìm công cụ" placeholder="Tìm công cụ…"><button type="submit">Tìm</button></form>']
    for cid, name, _ in CATEGORIES:
        if cat and cid != cat:
            continue
        items = [t for t in tools if t.get("category") == cid]
        lis = "".join(f'<li><a href="/{t["slug"]}/"{" aria-current=\"page\"" if t["slug"] == current else ""}>{E(t["h1"])}</a></li>'
                      for t in items)
        out.append(f'<section class="box"><h2>{E(name)}</h2><ul>{lis}</ul></section>')
    if cat:
        others = "".join(f'<li><a href="/#c-{cid}">{E(name)}</a></li>' for cid, name, _ in CATEGORIES if cid != cat)
        out.append(f'<section class="box"><h2>Nhóm khác</h2><ul>{others}<li><a href="/">Tất cả công cụ »</a></li></ul></section>')
    return f'<aside class="side">{"".join(out)}</aside>'


def build() -> None:
    tools = sorted(load("tools"), key=lambda t: (t.get("order", "99"), t["slug"]))
    pages = load("pages")
    this_year = date.today().year
    years = list(range(this_year - 1, this_year + 3))
    # Trang lịch âm năm hiện tại xuất hiện như một công cụ trong danh sách (trang chủ, cột phải)
    listing = sorted(tools + [{"slug": lunar_pages.year_slug(this_year), "h1": f"Lịch âm năm {this_year}", "category": "ngay-lich",
                               "order": "4", "summary": "Lịch vạn niên cả năm: ngày rằm, mùng một, ngày lễ, Tết.",
                               "keywords": "lịch âm, lịch vạn niên, lịch âm năm, ngày rằm, mùng một, lịch tết"}],
                     key=lambda t: (t.get("order", "99"), t["slug"]))
    css = (SITE / "partials/style.css").read_text(encoding="utf-8")
    header = (SITE / "partials/header.html").read_text(encoding="utf-8")
    footer = (SITE / "partials/footer.html").read_text(encoding="utf-8")
    common = {"__SITE_NAME__": E(SITE_NAME), "__CONTACT_EMAIL__": E(CONTACT_EMAIL), "__YEAR__": str(date.today().year),
              "__TOOL_COUNT__": str(len(tools)),
              "__PLAY__": '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fff"/>'
                          '<path d="M10 7.3l6.2 4.7-6.2 4.7z" fill="#4c8d2b"/></svg>'}
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copytree(SITE / "static", DIST, dirs_exist_ok=True)
    urls = []
    cat_name = {cid: name for cid, name, _ in CATEGORIES}

    def render(main_html, active=None, url=SITE_URL + "/"):
        return fill(header.replace("__NAV__", nav(active)) + main_html + footer, {**common, "__PAGE_URL__": url})

    # Homepage: one box of links per category
    boxes = []
    for cid, name, _ in CATEGORIES:
        items = [t for t in listing if t.get("category") == cid]
        if items:
            lis = "".join(f'<li class="tc" data-q="{E((t["h1"] + " " + t.get("summary", "") + " " + t.get("keywords", "")).lower())}">'
                          f'<a href="/{t["slug"]}/">{E(t["h1"])}</a><span>{E(t.get("summary", ""))}</span></li>' for t in items)
            boxes.append(f'<section class="box cat" id="c-{cid}" aria-labelledby="h-{cid}"><h2 id="h-{cid}">{E(name)}</h2><ul>{lis}</ul></section>')
    home = (SITE / "home.html").read_text(encoding="utf-8").replace("__SECTIONS__", "".join(boxes))
    desc = (f"{len(tools)} công cụ online miễn phí bằng tiếng Việt: " + ", ".join(t["h1"].lower() for t in tools[:4])
            + "… Không cần cài đặt, không cần đăng ký, dữ liệu không rời khỏi máy bạn.")
    (DIST / "index.html").write_text(page(f"{SITE_NAME}: công cụ online miễn phí, khỏi cài, khỏi đăng ký", desc,
                                          SITE_URL + "/", render(home), css), encoding="utf-8")
    urls.append("/")

    # Tool pages
    for t in tools:
        url = f"{SITE_URL}/{t['slug']}/"
        cat = t.get("category")
        ld = json.dumps({"@context": "https://schema.org", "@type": "WebApplication", "name": t["h1"], "url": url,
                         "description": t["description"], "applicationCategory": "UtilitiesApplication",
                         "operatingSystem": "Mọi trình duyệt", "inLanguage": "vi",
                         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "VND"}},
                        ensure_ascii=False).replace("</", "<\\/")
        main = (f'<div class="wrap layout"><main class="content">'
                f'<nav class="crumbs" aria-label="Đường dẫn"><a href="/">trang chủ</a> / <a href="/#c-{cat}">{E(cat_name.get(cat, "").lower())}</a> / <span>{E(t["h1"].lower())}</span></nav>'
                f'<h1>{E(t["h1"])}</h1>'
                + (f'<p class="lede">{E(t["intro"])}</p>' if t.get("intro") else "")
                + (f'<p class="stamp">Áp dụng: {E(t["rules"])} · Cập nhật {E(t.get("updated", ""))}</p>' if t.get("rules") else "")
                + f'{t["body"]}</main>{sidebar(listing, cat, t["slug"])}</div>'
                f'<script type="application/ld+json">{ld}</script>')
        out = DIST / t["slug"]
        out.mkdir()
        (out / "index.html").write_text(page(t["title"], t["description"], url, render(main, cat, url), css, image=og_image(t["slug"])), encoding="utf-8")
        urls.append(f"/{t['slug']}/")

    # Lịch âm: trang từng năm, từng tháng
    data = lunar_pages.load(years[0], years[-1])
    gen = [lunar_pages.year_page(data, y, years) for y in years]
    gen += [lunar_pages.month_page(data, y, m, years) for y in years for m in range(1, 13)]
    for meta, body in gen:
        url = f"{SITE_URL}/{meta['slug']}/"
        main = (f'<div class="wrap layout"><main class="content lunar">'
                f'<nav class="crumbs" aria-label="Đường dẫn"><a href="/">trang chủ</a> / <a href="/#c-ngay-lich">ngày &amp; lịch</a> / <span>{E(meta["h1"].lower())}</span></nav>'
                f'<h1>{E(meta["h1"])}</h1>{body}</main>{sidebar(listing, "ngay-lich", meta["slug"])}</div>')
        out = DIST / meta["slug"]
        out.mkdir()
        (out / "index.html").write_text(page(meta["title"], meta["description"], url, render(main, "ngay-lich", url), css, image=og_image("lich-am")), encoding="utf-8")
        urls.append(f"/{meta['slug']}/")

    # Plain pages
    for pg in pages:
        url = f"{SITE_URL}/{pg['slug']}/"
        main = f'<div class="wrap layout"><main class="content article">{pg["body"]}</main>{sidebar(listing, None)}</div>'
        out = DIST / pg["slug"]
        out.mkdir()
        (out / "index.html").write_text(page(pg["title"], pg.get("description", ""), url, render(main, None, url), css), encoding="utf-8")
        urls.append(f"/{pg['slug']}/")

    nf = '<div class="wrap layout"><main class="content article"><h1>Không tìm thấy trang</h1><p><a href="/">Về trang chủ</a> để xem các công cụ.</p></main></div>'
    (DIST / "404.html").write_text(page(f"Không tìm thấy trang | {SITE_NAME}", "", SITE_URL + "/404.html", render(nf), css), encoding="utf-8")
    today = date.today().isoformat()
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                                      + "".join(f"<url><loc>{SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>" for u in urls)
                                      + "</urlset>\n", encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    print(f"built {len(urls)} pages ({len(tools)} tools) -> {DIST}")


if __name__ == "__main__":
    build()
