"""Build the tool site into dist/.

site/tools/<slug>.html   one tool per file -> /<slug>/ ; front matter (top HTML comment, "key: value" lines):
                         title, h1, description, category, order, badge, summary
site/pages/<slug>.html   plain pages (giới thiệu, chính sách) -> /<slug>/
site/partials/           style.css, header.html, footer.html (shared)
site/static/             copied to the site root (js/, icons)

    SITE_URL=https://khoicai.vn python build.py
"""
from __future__ import annotations

import html
import json
import os
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE, DIST = ROOT / "site", ROOT / "dist"
SITE_URL = (os.environ.get("SITE_URL") or "https://khoicai.vn").rstrip("/")
SITE_NAME = os.environ.get("SITE_NAME") or "Khỏi Cài"
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL") or "lienhe@khoicai.vn"
# Khi site nằm trong thư mục con (ví dụ GitHub Pages chưa có tên miền: /khoicai), mọi đường dẫn "/..." được thêm tiền tố
BASE = "/" + SITE_URL.split("://", 1)[-1].partition("/")[2].strip("/") if "/" in SITE_URL.split("://", 1)[-1] else ""
BASE = BASE.rstrip("/")
CATEGORIES = [   # order on the homepage
    ("tien-hoa-don", "Tiền & hoá đơn"),
    ("van-ban", "Văn bản"),
    ("dat-dai", "Đất đai & đo lường"),
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


def head(title: str, desc: str, url: str, extra: str = "") -> str:
    return (f"<title>{E(title)}</title>\n<meta name=\"description\" content=\"{E(desc)}\">\n"
            f"<link rel=\"canonical\" href=\"{url}\">\n"
            "<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n"
            "<link rel=\"icon\" href=\"/favicon-48.png\" sizes=\"48x48\" type=\"image/png\">\n"
            "<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">\n"
            "<meta name=\"theme-color\" content=\"#0f766e\">\n"
            f"<meta property=\"og:title\" content=\"{E(title)}\">\n<meta property=\"og:description\" content=\"{E(desc)}\">\n"
            f"<meta property=\"og:url\" content=\"{url}\">\n<meta property=\"og:type\" content=\"website\">\n"
            f"<meta property=\"og:locale\" content=\"vi_VN\">\n<meta property=\"og:site_name\" content=\"{E(SITE_NAME)}\">\n"
            + extra)


def rebase(doc: str) -> str:
    if not BASE:
        return doc
    import re
    doc = re.sub(r'((?:href|src)=")/(?!/)', r"\1" + BASE + "/", doc)
    return doc.replace('"/js/', '"' + BASE + '/js/')


def page(title, desc, url, body, css, extra_head=""):
    return rebase("<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
            + head(title, desc, url, extra_head) + f"<style>\n{css}</style>\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")


def fill(src: str, values: dict) -> str:
    for k, v in values.items():
        src = src.replace(k, v)
    return src


def tool_card(t) -> str:
    return (f'<li class="tc" data-q="{E((t["h1"] + " " + t.get("summary", "") + " " + t.get("keywords", "")).lower())}">'
            f'<a href="/{t["slug"]}/"><span class="badge" aria-hidden="true">{E(t.get("badge", ""))}</span>'
            f'<span class="tt"><b>{E(t["h1"])}</b><span>{E(t.get("summary", ""))}</span></span></a></li>')


def build() -> None:
    tools = sorted(load("tools"), key=lambda t: (t.get("order", "99"), t["slug"]))
    pages = load("pages")
    css = (SITE / "partials/style.css").read_text(encoding="utf-8")
    header = (SITE / "partials/header.html").read_text(encoding="utf-8")
    footer = (SITE / "partials/footer.html").read_text(encoding="utf-8")
    common = {"__SITE_NAME__": E(SITE_NAME), "__CONTACT_EMAIL__": E(CONTACT_EMAIL), "__YEAR__": str(date.today().year),
              "__TOOL_COUNT__": str(len(tools))}
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copytree(SITE / "static", DIST, dirs_exist_ok=True)
    urls = []

    # Homepage: search + tools by category
    sections = []
    for cid, cname in CATEGORIES:
        items = [t for t in tools if t.get("category") == cid]
        if items:
            sections.append(f'<section class="cat" aria-labelledby="c-{cid}"><h2 id="c-{cid}">{E(cname)}</h2>'
                            f'<ul class="tools">{"".join(tool_card(t) for t in items)}</ul></section>')
    home = (SITE / "home.html").read_text(encoding="utf-8").replace("__SECTIONS__", "".join(sections))
    desc = (f"{len(tools)} công cụ online miễn phí bằng tiếng Việt: đọc số tiền thành chữ, chuyển font TCVN3/VNI sang Unicode, "
            "quy đổi sào, mẫu, công đất sang m². Khỏi cài đặt, khỏi đăng ký, dữ liệu không rời khỏi máy bạn.")
    body = fill(header + home + footer, {**common, "__PAGE_URL__": SITE_URL + "/"})
    (DIST / "index.html").write_text(page(f"{SITE_NAME}: công cụ online miễn phí, khỏi cài, khỏi đăng ký", desc,
                                          SITE_URL + "/", body, css), encoding="utf-8")
    urls.append("/")

    # Tool pages
    cat_name = dict(CATEGORIES)
    for t in tools:
        url = f"{SITE_URL}/{t['slug']}/"
        others = [o for o in tools if o["slug"] != t["slug"]]
        ld = json.dumps({"@context": "https://schema.org", "@type": "WebApplication", "name": t["h1"], "url": url,
                         "description": t["description"], "applicationCategory": "UtilitiesApplication",
                         "operatingSystem": "Mọi trình duyệt", "inLanguage": "vi",
                         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "VND"}},
                        ensure_ascii=False).replace("</", "<\\/")
        main = (f'<main class="gutter"><div class="wrap">'
                f'<nav class="crumbs" aria-label="Đường dẫn"><a href="/">Trang chủ</a> › <span>{E(cat_name.get(t.get("category"), ""))}</span></nav>'
                f'<h1>{E(t["h1"])}</h1>'
                f'{t["body"]}'
                f'<section class="more" aria-labelledby="more-h"><h2 id="more-h">Công cụ khác</h2>'
                f'<ul class="tools">{"".join(tool_card(o) for o in others)}</ul></section>'
                f'</div></main><script type="application/ld+json">{ld}</script>')
        out = DIST / t["slug"]
        out.mkdir()
        (out / "index.html").write_text(page(t["title"], t["description"], url,
                                             fill(header + main + footer, {**common, "__PAGE_URL__": url}), css), encoding="utf-8")
        urls.append(f"/{t['slug']}/")

    # Plain pages
    for pg in pages:
        url = f"{SITE_URL}/{pg['slug']}/"
        main = f'<main class="gutter"><div class="wrap article">{pg["body"]}</div></main>'
        out = DIST / pg["slug"]
        out.mkdir()
        (out / "index.html").write_text(page(pg["title"], pg.get("description", ""), url,
                                             fill(header + main + footer, {**common, "__PAGE_URL__": url}), css), encoding="utf-8")
        urls.append(f"/{pg['slug']}/")

    nf = '<main class="gutter"><div class="wrap article"><h1>Không tìm thấy trang</h1><p><a href="/">Về trang chủ</a> để xem các công cụ.</p></div></main>'
    (DIST / "404.html").write_text(page(f"Không tìm thấy trang | {SITE_NAME}", "", SITE_URL + "/404.html",
                                        fill(header + nf + footer, {**common, "__PAGE_URL__": SITE_URL + "/"}), css), encoding="utf-8")
    today = date.today().isoformat()
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                                      + "".join(f"<url><loc>{SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>" for u in urls)
                                      + "</urlset>\n", encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    print(f"built {len(urls)} pages ({len(tools)} tools) -> {DIST}")


if __name__ == "__main__":
    build()
