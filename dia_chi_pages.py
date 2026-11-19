"""Trang tĩnh đơn vị hành chính sau sắp xếp 2025 (dữ liệu: data/hanh-chinh/, xem README ở đó):

  /dia-chi-moi/                       34 tỉnh, thành phố
  /dia-chi-moi/<tỉnh>/                các xã, phường, đặc khu của tỉnh: vùng lương, đơn vị cũ hợp thành
  /dia-chi-moi/<tỉnh>/<xã>/           một xã, phường: đơn vị cũ hợp thành (huyện, tỉnh cũ), vùng lương và mức lương tối thiểu,
                                      xã phường cùng huyện cũ, nghị quyết căn cứ

Mọi câu chữ trên trang dựng từ dữ liệu của chính đơn vị đó; không có đoạn văn dùng chung.
"""
from __future__ import annotations

import html
import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

E = html.escape
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data/hanh-chinh"
HUB = "dia-chi-moi"
PORTION = {"toan-bo": "toàn bộ", "mot-phan": "một phần", "phan-con-lai": "phần còn lại"}
REGIONS = ["I", "II", "III", "IV"]
REG_NUM = {"I": 1, "II": 2, "III": 3, "IV": 4}


def money(v: int) -> str:
    return f"{v:,}".replace(",", ".")


def vdate(iso: str) -> str:
    y, m, d = iso.split("-")
    return f"{d}/{m}/{y}"


def sort_key(s: str):
    """Thứ tự chữ cái tiếng Việt gần đúng: bỏ dấu trước, số theo giá trị, rồi mới xét dấu."""
    f = unicodedata.normalize("NFD", s.replace("Đ", "D~").replace("đ", "d~"))
    f = "".join(ch for ch in f if unicodedata.category(ch) != "Mn").lower()
    parts = [(0, int(t), "") if t.isdigit() else (1, 0, t) for t in f.split()]
    return parts, s


def cap(s: str) -> str:
    return s[:1].upper() + s[1:]


class Ctx:
    def __init__(self):
        self.index = json.load(open(DATA / "index.json", encoding="utf-8"))
        self.provs = [json.load(open(DATA / p["file"], encoding="utf-8")) for p in self.index["provinces"]]
        self.wage = self.index["wage"]
        self.by_id = {}                          # mã đơn vị mới -> (tỉnh, đơn vị)
        for p in self.provs:
            for u in p["units"]:
                self.by_id[u["id"]] = (p, u)
        self.as_of = self.index["as_of"]

    def url(self, p, u=None) -> str:
        return f"/{HUB}/{p['slug']}/" + (f"{u['slug']}/" if u else "")

    def cite(self, p, doc):
        return next((c for c in p["sources"]["citations"] if c["document"] == doc), None)


def crumbs(*items) -> str:
    """items: (nhãn, đường dẫn hoặc None)"""
    out = ['<a href="/">trang chủ</a>']
    for label, href in items:
        out.append(f'<a href="{href}">{E(label.lower())}</a>' if href else f"<span>{E(label.lower())}</span>")
    return '<nav class="crumbs" aria-label="Đường dẫn">' + " / ".join(out) + "</nav>"


def breadcrumb_ld(site: str, items) -> str:
    els = [{"@type": "ListItem", "position": i + 1, "name": n, **({"item": site + h} if h else {})} for i, (n, h) in enumerate(items)]
    return ('<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": els},
            ensure_ascii=False).replace("</", "<\\/") + "</script>\n")


def old_where(o) -> str:
    """Quận/huyện và tỉnh cũ của một đơn vị cũ (đặc khu lập từ cả huyện: chỉ tỉnh)."""
    return ", ".join(x for x in ([o["district"]] if o["district"] and o["type"] != "huyện" else []) + [o["province"]] if x)


def old_summary(u, limit=3) -> str:
    """'phường Bến Nghé, một phần phường Đa Kao và 1 đơn vị khác' — dùng trong mô tả trang."""
    names = [("một phần " if o["portion"] != "toan-bo" else "") + (o["full_name"][0].lower() + o["full_name"][1:] if o["type"] != "khu vực" else o["full_name"])
             for o in u["old_units"]]
    if len(names) <= limit:
        return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " và " + names[-1]
    return ", ".join(names[:limit]) + f" và {len(names) - limit} đơn vị khác"


def region_rows(c: Ctx, u) -> str:
    rows = []
    years = sorted(c.wage)
    for i, y in enumerate(years):
        g, w = u["region"][y], c.wage[y]
        up = f" (lên từ vùng {u['region'][years[i - 1]]})" if i and u["region"][years[i - 1]] != g else ""
        label = "Năm 2026" if y == "2026" else f"Từ {vdate(w['effective'])}"
        rows.append(f'<tr><td>{label}</td><td style="white-space:nowrap">Vùng {g}{E(up)}</td><td class="n">{money(w["monthly"][g])}</td>'
                    f'<td class="n">{money(w["hourly"][g])}</td></tr>')
    return ('<div class="scroll"><table class="t"><thead><tr><th>Áp dụng</th><th>Vùng</th><th class="n">Đ/tháng</th><th class="n">Đ/giờ</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


def commune_page(c: Ctx, p, u, near: dict, site: str):
    w26 = c.wage["2026"]
    g = u["region"]["2026"]
    res = u["source"].get("resolution") or p["sources"]["commune_resolution"]
    rc = c.cite(p, p["sources"]["commune_resolution"])
    full = f"{u['full_name']}, {p['full_name']}"
    n_old = len(u["old_units"])
    tc = u["type_changes"][0] if u["type_changes"] else None

    # --- dòng thông tin
    if u["formation"] == "giu-nguyen":
        basis = f'<a href="{E(rc["url"])}" rel="noopener">Nghị quyết {E(res)}</a>: không sắp xếp với đơn vị khác, giữ nguyên'
    else:
        basis = f'<a href="{E(rc["url"])}" rel="noopener">Nghị quyết {E(res)}</a>, khoản {u["source"]["clause"]} Điều 1'
    facts = [("Tên đầy đủ", E(full)), ("Mã đơn vị", f'{E(u["id"])} <span class="hint">(mã của Cục Thống kê)</span>'),
             ("Thành lập", f"từ {vdate(p['sources']['effective'])}, {basis}")]
    if tc:
        facts.append(("Đổi loại", f"{E(cap(tc['from']))} {E(u['name'])} thành {E(tc['to'])} từ {vdate(tc['effective'])} (Nghị quyết {E(tc['resolution'])})"))
    facts.append(("Vùng lương 2026", f"<b>Vùng {g}</b>: {money(w26['monthly'][g])} đồng/tháng, {money(w26['hourly'][g])} đồng/giờ"))
    kv = "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in facts)

    # --- đơn vị cũ
    rows = []
    # đặc khu lập từ cả huyện: dòng huyện trước, các xã của huyện (bảng chuyển đổi ghi riêng) ghi là thuộc huyện đó
    huyen = {o["full_name"] for o in u["old_units"] if o["type"] == "huyện"}
    for o in sorted(u["old_units"], key=lambda o: o["type"] != "huyện"):
        others = []
        for oid in o.get("also_in") or []:
            if oid in c.by_id:
                pp, uu = c.by_id[oid]
                others.append(f'<a href="{c.url(pp, uu)}">{E(uu["full_name"])}</a>')
        extra = f'<br><span class="hint">phần khác thuộc {", ".join(others)}</span>' if others else ""
        code = f'<br><span class="hint">mã {E(o["id"])}</span>' if o["id"] else ""
        inside = f'<br><span class="hint">trong {E(o["district"])}</span>' if o["district"] in huyen and o["type"] != "huyện" else ""
        rows.append(f'<tr><td>{E(o["full_name"])}{code}</td><td>{E(old_where(o))}</td><td>{PORTION[o["portion"]]}{inside}{extra}</td></tr>')
    whole = [o for o in u["old_units"] if o["portion"] == "toan-bo" and o["type"] not in ("huyện", "khu vực")]
    example = ""
    if whole:
        o = whole[0]
        example = (f'<p>Ví dụ: địa chỉ cũ ghi <i>{E(o["full_name"])}, {E(old_where(o))}</i> nay ghi <b>{E(full)}</b>.</p>')
    old_districts = sorted({o["district"] for o in u["old_units"] if o["district"] and o["type"] != "huyện"}, key=sort_key)
    old_provs = sorted({o["province"] for o in u["old_units"]}, key=sort_key)
    if u["formation"] == "giu-nguyen":
        made = f"<p>{E(u['full_name'])} không sắp xếp với đơn vị nào khác; trước 01/07/2025 thuộc {E(old_where(u['old_units'][0]))}.</p>"
    elif u["formation"] == "dac-khu-tu-huyen":
        subs = [o["full_name"] for o in u["old_units"] if o["district"] in huyen and o["type"] != "huyện"]
        made = (f"<p>{E(u['full_name'])} được lập từ toàn bộ {E(', '.join(sorted(huyen)))} cũ ({E(', '.join(old_provs))})"
                + (f", gồm {len(subs)} đơn vị cấp xã: {E(', '.join(subs))}" if subs else ", huyện không có đơn vị cấp xã") + ".</p>")
    else:
        made = (f"<p>{E(u['full_name'])} được lập từ <b>{n_old}</b> đơn vị cũ"
                + (f" thuộc {E(', '.join(old_districts))}" if old_districts else "") + f" ({E(', '.join(old_provs))}).</p>")
    old_tbl = ('<div class="scroll"><table class="t"><thead><tr><th>Đơn vị cũ</th><th>Thuộc (trước 01/07/2025)</th><th>Phạm vi nhập</th></tr></thead>'
               f'<tbody>{"".join(rows)}</tbody></table></div>')

    # --- xã, phường gần (cùng nhận phần đơn vị cũ bị chia; cùng huyện cũ)
    near_html = ""
    split_ids, dist_ids = near["split"], near["district"]
    def links(ids, limit=None):
        items = [c.by_id[i] for i in ids]
        items.sort(key=lambda x: sort_key(x[1]["full_name"]))
        shown = items[:limit] if limit else items
        out = ", ".join(f'<a href="{c.url(pp, uu)}">{E(uu["full_name"])}</a> <span class="hint">(vùng {uu["region"]["2026"]})</span>' for pp, uu in shown)
        return out + (f' và <a href="{c.url(p)}">{len(items) - len(shown)} đơn vị khác</a>' if len(items) > len(shown) else "")
    if split_ids:
        near_html += f"<p><b>Cùng nhận phần của xã, phường cũ bị chia:</b> {links(split_ids)}.</p>"
    if dist_ids:
        near_html += f"<p><b>Cũng lập từ {E(', '.join(near['district_names']))} cũ:</b> {links(dist_ids, 15)}.</p>"
    near_html += f'<p><a href="{c.url(p)}">Tất cả {len(p["units"])} xã, phường, đặc khu của {E(p["full_name"])}</a></p>'

    from urllib.parse import quote
    qq = quote(f"{u['full_name']}, {p['full_name']}")
    tools = (f'<div class="actions"><a class="btn" href="/tinh-luong-gross-net/?vung={REG_NUM[g]}">Tính lương Gross ↔ Net, vùng {g}</a>'
             f'<a class="btn" href="/bang-luong/?vung={REG_NUM[g]}">Lập bảng lương, vùng {g}</a></div>'
             f'<ul><li><a href="/tra-cuu-dia-chi-moi/">Đổi địa chỉ cũ sang địa chỉ mới</a> (gõ cả số nhà, đường)</li>'
             f'<li><a href="/tra-cuu-dia-chi-moi/?moi={qq}&amp;tinh={p["id"]}">Xem {E(u["full_name"])} trong công cụ tra cứu địa chỉ</a></li>'
             f'<li><a href="/xa-phuong-thuoc-vung-may/">Tra vùng lương của xã, phường khác</a></li></ul>')

    d293, d399 = c.cite(p, c.wage["2026"]["decree"]), c.cite(p, c.wage["2027"]["decree"])
    sources = (f'<p class="note">Nguồn: <a href="{E(rc["url"])}" rel="noopener">Nghị quyết {E(res)}</a> của Ủy ban Thường vụ Quốc hội'
               + (f", Nghị quyết {E(tc['resolution'])}" if tc else "")
               + "; bảng chuyển đổi đơn vị hành chính mới - cũ của Cục Thống kê; vùng lương theo Phụ lục "
               + f'<a href="{E(d293["url"])}" rel="noopener">Nghị định {E(d293["document"])}</a> và '
               + f'<a href="{E(d399["url"])}" rel="noopener">Nghị định {E(d399["document"])}</a>. Dữ liệu đến {vdate(c.as_of)}.</p>')

    body = (f'<table class="t kv"><tbody>{kv}</tbody></table>'
            f'<h2>Được lập từ những đơn vị cũ nào</h2>{made}{old_tbl}{example}'
            f'<h2>Vùng lương tối thiểu</h2><p>{E(u["full_name"])} thuộc <b>vùng {g}</b> trong Phụ lục Nghị định {E(w26["decree"])}.</p>{region_rows(c, u)}{tools}'
            f'<h2>Xã, phường liên quan ở {E(p["full_name"])}</h2>{near_html}{sources}')

    title = f"{u['full_name']} ({p['name']}) thuộc vùng mấy? Địa chỉ mới sau sáp nhập | Tính Giùm"
    desc = (f"{u['full_name']}, {p['full_name']}: "
            + ("không sắp xếp, giữ nguyên" if u["formation"] == "giu-nguyen" else f"lập từ {old_summary(u)}")
            + f" ({res}). Vùng lương tối thiểu {g}: {money(w26['monthly'][g])} đồng/tháng năm 2026.")
    slug = f"{HUB}/{p['slug']}/{u['slug']}"
    trail = [("Trang chủ", "/"), ("Địa chỉ mới", f"/{HUB}/"), (p["full_name"], c.url(p)), (u["full_name"], None)]
    meta = {"slug": slug, "h1": full, "title": title, "description": desc, "category": "khac", "cls": "article",
            "crumbs": crumbs(("địa chỉ mới", f"/{HUB}/"), (p["full_name"], c.url(p)), (u["full_name"], None)),
            "image": "tra-cuu-dia-chi-moi", "ld": breadcrumb_ld(site, trail), "sitemap": "dia-chi"}
    return meta, body


def province_page(c: Ctx, p, site: str):
    units = sorted(p["units"], key=lambda u: sort_key(u["full_name"]))
    by_t = Counter((u["type_changes"][0]["from"] if u["type_changes"] else u["type"]) for u in p["units"])
    now_t = Counter(u["type"] for u in p["units"])
    st = p["sources"]["stated_count"]
    rc = c.cite(p, p["sources"]["commune_resolution"])
    n_old = len({o["id"] or o["full_name"] for u in p["units"] for o in u["old_units"]})
    formed = ", ".join(f["name"] for f in p["formed_from"])
    tstr = lambda cnt: ", ".join(f"{cnt[t]} {t}" for t in ("phường", "xã", "đặc khu") if cnt.get(t))
    intro = (f"<p>{E(p['full_name'])} (mã {E(p['id'])}) được lập từ {E(formed)} theo Nghị quyết {E(p['sources']['province_resolution'])}, "
             f"từ {vdate(p['sources']['effective'])}. Có <b>{len(p['units'])}</b> đơn vị hành chính cấp xã: {tstr(by_t)} "
             f'(<a href="{E(rc["url"])}" rel="noopener">Nghị quyết {E(p["sources"]["commune_resolution"])}</a>), '
             f"lập từ {n_old} xã, phường, thị trấn cũ.</p>")
    bc = p["sources"].get("became_city")
    changed = [u for u in p["units"] if u["type_changes"]]
    if bc:
        intro += f"<p>Thành phố trực thuộc trung ương từ {vdate(bc['effective'])} (Nghị quyết {E(bc['resolution'])}).</p>"
    if changed:
        tc = changed[0]["type_changes"][0]
        intro += (f"<p>Từ {vdate(tc['effective'])}, {len(changed)} xã thành phường (Nghị quyết {E(tc['resolution'])}): "
                  + ", ".join(f'<a href="{c.url(p, u)}">{E(u["name"])}</a>' for u in sorted(changed, key=lambda u: sort_key(u["name"]))) + f". Hiện có {tstr(now_t)}.</p>")
    years = sorted(c.wage)
    reg = {y: Counter(u["region"][y] for u in p["units"]) for y in years}
    reg_rows = "".join(f'<tr><td>Vùng {g}</td>' + "".join(f'<td class="n">{reg[y].get(g, 0)}</td>' for y in years) + f'<td class="n">{money(c.wage["2026"]["monthly"][g])}</td></tr>'
                       for g in REGIONS if any(reg[y].get(g) for y in years))
    reg_tbl = ('<div class="scroll"><table class="t"><thead><tr><th>Vùng</th>' + "".join(f'<th class="n">Số đơn vị {"2026" if y == "2026" else "từ " + vdate(c.wage[y]["effective"])}</th>' for y in years)
               + f'<th class="n">Lương tối thiểu 2026</th></tr></thead><tbody>{reg_rows}</tbody></table></div>')

    def made(u):
        if u["formation"] == "giu-nguyen":
            return "giữ nguyên"
        return ", ".join(E(o["name"] if o["type"] not in ("huyện",) else o["full_name"]) + (" <span class=\"hint\">(một phần)</span>" if o["portion"] != "toan-bo" else "")
                         for o in u["old_units"])
    rows = "".join(f'<tr><td><a href="{c.url(p, u)}">{E(u["full_name"])}</a></td><td style="white-space:nowrap">{u["region"]["2026"]}</td><td>{made(u)}</td></tr>' for u in units)
    tbl = ('<div class="scroll"><table class="t"><thead><tr><th>Xã, phường, đặc khu</th><th>Vùng 2026</th><th>Lập từ (tên cũ)</th></tr></thead>'
           f'<tbody>{rows}</tbody></table></div>')
    others = ", ".join(f'<a href="{c.url(q)}">{E(q["name"])}</a>' for q in sorted(c.provs, key=lambda q: sort_key(q["name"])) if q is not p)
    body = (intro + f"<h2>Vùng lương tối thiểu</h2>{reg_tbl}"
            + f"<h2>Danh sách {len(p['units'])} xã, phường, đặc khu</h2>{tbl}"
            + '<p><a href="/tra-cuu-dia-chi-moi/">Đổi địa chỉ cũ sang mới</a> · <a href="/xa-phuong-thuoc-vung-may/">Tra vùng lương theo xã, phường</a></p>'
            + f"<h2>Tỉnh, thành phố khác</h2><p>{others}.</p>"
            + f'<p class="note">Nguồn: Nghị quyết {E(p["sources"]["province_resolution"])}, Nghị quyết {E(p["sources"]["commune_resolution"])}; '
              f"vùng lương theo Nghị định {E(c.wage['2026']['decree'])} và {E(c.wage['2027']['decree'])}. Dữ liệu đến {vdate(c.as_of)}.</p>")
    title = f"{p['full_name']} có bao nhiêu xã, phường? Danh sách {len(p['units'])} đơn vị sau sáp nhập | Tính Giùm"
    desc = (f"{p['full_name']} sau sắp xếp có {len(p['units'])} đơn vị hành chính cấp xã ({tstr(now_t)}), lập từ {formed}. "
            f"Danh sách kèm xã, phường cũ hợp thành và vùng lương tối thiểu 2026.")
    trail = [("Trang chủ", "/"), ("Địa chỉ mới", f"/{HUB}/"), (p["full_name"], None)]
    meta = {"slug": f"{HUB}/{p['slug']}", "h1": f"Xã, phường của {p['full_name']} sau sáp nhập", "title": title, "description": desc,
            "category": "khac", "cls": "article", "crumbs": crumbs(("địa chỉ mới", f"/{HUB}/"), (p["full_name"], None)),
            "image": "tra-cuu-dia-chi-moi", "ld": breadcrumb_ld(site, trail), "sitemap": "dia-chi"}
    return meta, body


def hub_page(c: Ctx, site: str):
    t = c.index["totals"]
    provs = sorted(c.provs, key=lambda q: sort_key(q["name"]))
    rows = "".join(f'<tr><td><a href="{c.url(p)}">{E(p["full_name"])}</a></td><td class="n">{len(p["units"])}</td>'
                   f'<td>{E(", ".join(f["name"].replace("Tỉnh ", "").replace("Thành phố ", "") for f in p["formed_from"]))}</td></tr>' for p in provs)
    n_old = len({o["id"] for p in c.provs for u in p["units"] for o in u["old_units"] if o["id"]})
    b25, now = t["by_type_2025_07_01"], t["by_type_now"]
    body = (f"<p>Từ 01/07/2025 cả nước có <b>34</b> tỉnh, thành phố (Nghị quyết 202/2025/QH15) và <b>{t['units']:,}</b> đơn vị hành chính cấp xã "
            f"({b25['xã']:,} xã, {b25['phường']} phường, {b25['đặc khu']} đặc khu), lập từ {n_old:,} xã, phường, thị trấn cũ theo 34 nghị quyết của "
            f"Ủy ban Thường vụ Quốc hội. Sau các thay đổi năm 2026: {now['xã']:,} xã, {now['phường']} phường, {now['đặc khu']} đặc khu.</p>").replace(",", ".")
    body += ('<div class="scroll"><table class="t"><thead><tr><th>Tỉnh, thành phố</th><th class="n">Xã, phường</th><th>Lập từ</th></tr></thead>'
             f"<tbody>{rows}</tbody></table></div>"
             '<p><a href="/tra-cuu-dia-chi-moi/">Đổi địa chỉ cũ sang mới</a> · <a href="/xa-phuong-thuoc-vung-may/">Tra vùng lương theo xã, phường</a></p>'
             f'<p class="note">Dữ liệu từ toàn văn các nghị quyết, đối chiếu với bảng chuyển đổi của Cục Thống kê; đến {vdate(c.as_of)}.</p>')
    title = f"Danh sách 34 tỉnh, thành phố và {t['units']:,} xã, phường sau sáp nhập".replace(",", ".") + " | Tính Giùm"
    desc = (f"34 tỉnh, thành phố và {t['units']:,} xã, phường, đặc khu sau sắp xếp từ 01/07/2025: mỗi tỉnh có bao nhiêu xã, phường, "
            "lập từ tỉnh nào, xã phường mới gồm những xã phường cũ nào, thuộc vùng lương nào.").replace(",", ".")
    meta = {"slug": HUB, "h1": "Xã, phường mới của 34 tỉnh, thành phố", "title": title, "description": desc, "category": "khac", "cls": "article",
            "image": "tra-cuu-dia-chi-moi", "ld": breadcrumb_ld(site, [("Trang chủ", "/"), ("Địa chỉ mới", None)]), "sitemap": "dia-chi"}
    return meta, body


def neighbours(p) -> dict:
    """Mỗi đơn vị: đơn vị cùng nhận phần của một đơn vị cũ bị chia; đơn vị lập từ cùng quận/huyện cũ (cùng tỉnh)."""
    ids = {u["id"] for u in p["units"]}
    by_dist = defaultdict(set)
    for u in p["units"]:
        for o in u["old_units"]:
            if o["district_id"] and o["type"] != "huyện":
                by_dist[(o["province_id"], o["district_id"])].add(u["id"])
    out = {}
    for u in p["units"]:
        split = {i for o in u["old_units"] for i in (o.get("also_in") or []) if i in ids and i != u["id"]}
        dkeys = {(o["province_id"], o["district_id"]) for o in u["old_units"] if o["district_id"] and o["type"] != "huyện"}
        dist = set().union(*(by_dist[k] for k in dkeys)) - split - {u["id"]} if dkeys else set()
        names = sorted({o["district"] for o in u["old_units"] if o["district_id"] and o["type"] != "huyện"}, key=sort_key)
        out[u["id"]] = {"split": sorted(split), "district": sorted(dist), "district_names": names}
    return out


def build_all(site: str):
    """-> (các trang (meta, body), mục cho danh sách công cụ)"""
    c = Ctx()
    pages = [hub_page(c, site)]
    for p in c.provs:
        pages.append(province_page(c, p, site))
        near = neighbours(p)
        pages += [commune_page(c, p, u, near[u["id"]], site) for u in p["units"]]
    listing = [{"slug": HUB, "h1": "Xã, phường mới theo tỉnh", "category": "khac", "order": "3",
                "summary": "34 tỉnh và 3.321 xã, phường sau sáp nhập, vùng lương.",
                "keywords": "danh sách xã phường mới, 34 tỉnh thành, xã phường sau sáp nhập, phường mới, xã mới, đơn vị hành chính mới"}]
    return pages, listing
