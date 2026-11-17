"""Trang tĩnh lịch vạn sự:

  /lich-am-ngay-<ngày>-<tháng>-<năm>/              từng ngày: ngày âm, can chi, hoàng đạo, trực, giờ tốt, tuổi xung
  /xem-ngay-tot/                                    trang tổng hợp ngày tốt theo việc và tháng
  /xem-ngay-tot-<việc>-thang-<tháng>-<năm>/         ngày tốt cưới hỏi, động thổ, nhập trạch, khai trương, mua xe, xuất hành
  /tuoi-xong-dat-<năm>/ và /tuoi-xong-dat-<năm>-sinh-nam-<năm sinh>/   tuổi xông đất Tết
  /ong-cong-ong-tao-<năm>/, /via-than-tai-<năm>/, /ram-thang-gieng-<năm>/  ngày lễ quanh Tết

Mọi số liệu lấy từ site/static/js/van-su.js và xong-dat.js qua tools/van_su_data.js, nên trang tĩnh và
công cụ trên trình duyệt luôn cho cùng một kết quả. Thông tin tốt xấu chỉ mang tính tham khảo theo phong tục.
"""
from __future__ import annotations

import html
import json
import subprocess
from datetime import date
from pathlib import Path

from lunar_pages import lunar_month_name, month_slug

E = html.escape
ROOT = Path(__file__).resolve().parent
REF = "Thông tin tốt xấu theo cách tính phổ biến của lịch vạn niên Việt Nam (giờ Hà Nội), chỉ mang tính tham khảo theo phong tục."
ACT_NOTE = {
    "cuoi-hoi": "Dùng cho cả ngày ăn hỏi và ngày cưới. Nên tránh thêm ngày xung tuổi cô dâu, chú rể: nhập năm sinh hai người ở dưới để lọc.",
    "dong-tho": "Ngày động thổ, khởi công làm nhà thường chọn theo tuổi gia chủ: nhập năm sinh gia chủ để bỏ những ngày xung tuổi.",
    "nhap-trach": "Dùng cho ngày chuyển vào nhà mới (nhập trạch). Nên mang đồ vào nhà trong giờ hoàng đạo của ngày đã chọn.",
    "khai-truong": "Dùng cho khai trương cửa hàng, công ty, mở bán. Nên mở cửa đón khách đầu tiên trong giờ hoàng đạo.",
    "mua-xe": "Dùng cho ngày nhận xe, đăng ký xe mới. Nên lấy xe trong giờ hoàng đạo của ngày đã chọn.",
    "xuat-hanh": "Dùng cho ngày đi xa, công tác, du lịch hoặc xuất hành đầu năm.",
}
SECOND_LABEL = {"cuoi-hoi": "Năm sinh vợ / chồng"}


def load(y1: int, m1: int, y2: int, m2: int, tet: int) -> dict:
    out = subprocess.check_output(["node", str(ROOT / "tools/van_su_data.js"), str(y1), str(m1), str(y2), str(m2), str(tet)])
    return json.loads(out)


def day_slug(d: int, m: int, y: int) -> str:
    return f"lich-am-ngay-{d}-{m}-{y}"


def good_slug(act: str, m: int, y: int) -> str:
    return f"xem-ngay-tot-{act}-thang-{m}-{y}"


GOOD_HUB = "xem-ngay-tot"


def xd_hub(tet: int) -> str:
    return f"tuoi-xong-dat-{tet}"


def xd_slug(tet: int, y: int) -> str:
    return f"tuoi-xong-dat-{tet}-sinh-nam-{y}"


def add_months(y: int, m: int, k: int) -> tuple[int, int]:
    i = y * 12 + (m - 1) + k
    return i // 12, i % 12 + 1


def lunar_long(x: dict) -> str:
    return f"ngày {x['ld']} tháng {lunar_month_name(x['lm']).lower()}{' nhuận' if x['leap'] else ''} năm {x['ccYear']}"


def lunar_short(x: dict) -> str:
    return f"{x['ld']}/{x['lm']}{' nhuận' if x['leap'] else ''}"


def birth_years(chi: int, lo: int = 1950, hi: int = 2010) -> list[int]:
    return [y for y in range(lo, hi + 1) if (y + 8) % 12 == chi]


def dmy(x: dict) -> str:
    return f"{x['d']}/{x['m']}/{x['y']}"


class Ctx:
    """Những trang nào được tạo, để chỉ đặt liên kết tới trang có thật."""

    def __init__(self, data: dict, today: date, day_from: tuple, day_to: tuple, good_months: list, month_years: list):
        self.days = data["days"]
        self.by = {(x["y"], x["m"], x["d"]): x for x in self.days}
        self.acts, self.order = data["acts"], data["actOrder"]
        self.xd = data["xongDat"]
        self.today = today
        self.day_pages = {(x["y"], x["m"], x["d"]) for x in self.days
                          if day_from <= (x["y"], x["m"]) <= day_to}
        self.good_months = good_months
        self.month_years = month_years

    def day_link(self, x: dict, text: str | None = None) -> str:
        t = E(text or dmy(x))
        return f'<a href="/{day_slug(x["d"], x["m"], x["y"])}/">{t}</a>' if (x["y"], x["m"], x["d"]) in self.day_pages else t

    def good_link(self, act: str, m: int, y: int, text: str) -> str:
        return f'<a href="/{good_slug(act, m, y)}/">{E(text)}</a>' if (y, m) in self.good_months else E(text)

    def month_days(self, y: int, m: int) -> list[dict]:
        return [x for x in self.days if x["y"] == y and x["m"] == m]


# ---------------------------------------------------------------- trang từng ngày

def day_page(c: Ctx, x: dict) -> tuple[dict, str]:
    d, m, y = x["d"], x["m"], x["y"]
    verdict = f"Ngày {'hoàng đạo' if x['hd'] else 'hắc đạo'} ({x['spirit']})"
    ky = [n for n, f in (("tam nương", x["tamNuong"]), ("nguyệt kỵ", x["nguyetKy"])) if f]
    hols = ", ".join(h[0] for h in x["hols"])
    acts = [c.good_link(a, m, y, c.acts[a]["name"]) for a in x["goodFor"]]
    if acts:
        fit = f'<p>Ngày tốt cho: <b>{", ".join(acts)}</b>. Nên bắt đầu vào một trong các giờ hoàng đạo ở trên.</p>'
    elif not x["hd"]:
        fit = ("<p>Đây là ngày hắc đạo nên dân gian thường tránh khởi sự việc lớn như cưới hỏi, khai trương, động thổ. "
               "Việc thường ngày vẫn làm bình thường.</p>")
    elif ky:
        fit = f"<p>Ngày hoàng đạo nhưng phạm ngày {' và '.join(ky)}, dân gian thường kiêng làm việc lớn.</p>"
    else:
        fit = (f"<p>Ngày hoàng đạo nhưng trực {x['truc']} ({x['trucNote'][0].lower() + x['trucNote'][1:]}), "
               "nên chưa phải ngày đẹp cho cưới hỏi, khai trương hay động thổ.</p>")
    others = [c.good_link(a, m, y, c.acts[a]["name"].split(",")[0].lower()) for a in c.order]
    if (y, m) in c.good_months:
        fit += f'<p class="note">Xem các ngày tốt khác trong tháng {m}/{y}: {", ".join(others)}.</p>'
    prev_x = c.by.get(_shift(x, -1)); next_x = c.by.get(_shift(x, 1))
    nav = (f'<div class="cal-head">'
           + (f'<a class="btn" href="/{day_slug(prev_x["d"], prev_x["m"], prev_x["y"])}/">‹ {prev_x["d"]}/{prev_x["m"]}</a>'
              if prev_x and _key(prev_x) in c.day_pages else "<span></span>")
           + (f'<a class="btn" href="/{month_slug(m, y)}/">Cả tháng {m}/{y}</a>' if y in c.month_years else "<span></span>")
           + (f'<a class="btn" href="/{day_slug(next_x["d"], next_x["m"], next_x["y"])}/">{next_x["d"]}/{next_x["m"]} ›</a>'
              if next_x and _key(next_x) in c.day_pages else "<span></span>")
           + "</div>")
    years = ", ".join(str(v) for v in birth_years(x["xungChi"]))
    body = (f'<p class="lede">{x["wd"]}, ngày {d}/{m}/{y} dương lịch là <b>{lunar_long(x)}</b> âm lịch.</p>'
            f'<section class="today-box"><h2>{x["wd"]}, {d:02d}/{m:02d}/{y}</h2><div class="body">'
            f'<p class="big">Âm lịch: <b>{lunar_short(x)}</b> năm {x["ccYear"]}</p>'
            f'<p class="{"good" if x["hd"] else "bad"}">{verdict} · Trực {x["truc"]}{" · phạm " + ", ".join(ky) if ky else ""}</p>'
            + (f'<p>Ngày lễ: <b>{E(hols)}</b></p>' if hols else "") +
            "</div></section>"
            + nav +
            f'<h2>Lịch vạn sự ngày {d}/{m}/{y}</h2><div class="scroll"><table class="t kv"><tbody>'
            f'<tr><th>Can chi</th><td>Ngày {x["ccDay"]}, tháng {x["ccMonth"]}, năm {x["ccYear"]}</td></tr>'
            f'<tr><th>Tiết khí</th><td>{x["tiet"]}{" (bắt đầu từ hôm nay)" if x["tietStarts"] else ""}</td></tr>'
            f'<tr><th>Hoàng đạo</th><td>{verdict}</td></tr>'
            f'<tr><th>Trực</th><td><b>{x["truc"]}</b>: {x["trucNote"]}</td></tr>'
            f'<tr><th>Giờ hoàng đạo</th><td>{", ".join(x["hours"])}</td></tr>'
            f'<tr><th>Tuổi xung</th><td>Tuổi {x["xung"]} (sinh năm {years})</td></tr>'
            f'<tr><th>Ngày kỵ</th><td>{"Phạm " + ", ".join(ky) if ky else "Không phạm tam nương, nguyệt kỵ"}</td></tr>'
            "</tbody></table></div>"
            f'<h2>Ngày {d}/{m}/{y} có tốt không?</h2>{fit}'
            f'<p class="note">{REF} Đổi một ngày khác: <a href="/doi-ngay-am-duong-lich/">Đổi ngày âm ↔ dương lịch</a>. '
            f'Chọn ngày theo việc: <a href="/{GOOD_HUB}/">Xem ngày tốt</a>.</p>')
    gf = ", ".join(c.acts[a]["name"].split(",")[0].lower() for a in x["goodFor"])
    desc = (f"{x['wd']} {d}/{m}/{y} là {lunar_long(x)} âm lịch, ngày {x['ccDay']}, {'hoàng đạo' if x['hd'] else 'hắc đạo'} ({x['spirit']}), trực {x['truc']}. "
            f"Giờ hoàng đạo: {', '.join(h.split(' ')[0] for h in x['hours'])}. Tuổi xung: {x['xung']}."
            + (f" Tốt cho {gf}." if gf else ""))
    meta = {"slug": day_slug(d, m, y), "h1": f"Lịch âm ngày {d}/{m}/{y}",
            "title": f"Ngày {d}/{m}/{y} là ngày bao nhiêu âm? Tốt hay xấu, giờ hoàng đạo | Tính Giùm", "description": desc}
    return meta, body


def _key(x: dict) -> tuple:
    return x["y"], x["m"], x["d"]


def _shift(x: dict, k: int) -> tuple:
    from datetime import timedelta
    t = date(x["y"], x["m"], x["d"]) + timedelta(days=k)
    return t.year, t.month, t.day


# ---------------------------------------------------------------- ngày tốt theo việc

FILTER_JS = """<script>
(function(){
  var f = document.getElementById("f"), rows = [].slice.call(document.querySelectorAll("#gd tbody tr")), msg = document.getElementById("gdMsg");
  var CHI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
  function run(e){
    if (e) e.preventDefault();
    var bad = {}, who = [];
    ["y1","y2"].forEach(function(id){ var v = parseInt(document.getElementById(id).value, 10);
      if (v > 1900 && v < 2100) { bad[(v + 8) % 12] = 1; who.push(v + " (tuổi " + CHI[(v + 8) % 12] + ")"); } });
    var n = 0;
    rows.forEach(function(r){ var hide = bad[r.getAttribute("data-xung")] === 1; r.hidden = hide; if (!hide) n++; });
    msg.textContent = who.length ? "Còn " + n + "/" + rows.length + " ngày không xung tuổi " + who.join(", ") + "." : "";
    try { localStorage.setItem("gdYears", JSON.stringify([document.getElementById("y1").value, document.getElementById("y2").value])); } catch (_) {}
  }
  f.addEventListener("submit", run);
  document.getElementById("clr").addEventListener("click", function(){ f.reset(); run(); try { localStorage.removeItem("gdYears"); } catch (_) {} });
  try { var s = JSON.parse(localStorage.getItem("gdYears") || "null"); if (s) { document.getElementById("y1").value = s[0] || ""; document.getElementById("y2").value = s[1] || ""; run(); } } catch (_) {}
})();
</script>"""


def good_page(c: Ctx, act: str, y: int, m: int) -> tuple[dict, str]:
    a = c.acts[act]
    name, lname = a["name"], a["name"].split(",")[0].lower()
    days = [x for x in c.month_days(y, m) if act in x["goodFor"]]
    lst = ", ".join(f"{x['d']}/{m}" for x in days)
    lede = (f"Tháng {m}/{y} có <b>{len(days)} ngày tốt</b> cho {lname}: {lst}." if days else
            f"Tháng {m}/{y} không có ngày nào đạt đủ các tiêu chí cho {lname}. Xem tháng trước hoặc tháng sau ở cuối trang.")
    rows = "".join(
        f'<tr data-xung="{x["xungChi"]}"><td>{c.day_link(x, x["wd"] + " " + str(x["d"]) + "/" + str(m))}</td><td>{lunar_short(x)}</td>'
        f'<td>{x["ccDay"]}</td><td>{x["truc"]}</td><td>{", ".join(h.split(" ")[0] for h in x["hours"])}</td><td>{x["xung"]}</td></tr>'
        for x in days)
    second = SECOND_LABEL.get(act, "Năm sinh người thứ hai")
    form = ('<form class="calc" id="f">'
            '<label class="l" for="y1">Năm sinh của bạn</label><div><input class="in w-s" id="y1" inputmode="numeric" maxlength="4" placeholder="1990"> '
            '<span class="hint">năm âm lịch; sinh trước Tết thì lấy năm trước</span></div>'
            f'<label class="l" for="y2">{second}</label><div><input class="in w-s" id="y2" inputmode="numeric" maxlength="4"> <span class="hint">không bắt buộc</span></div>'
            '<div class="btns"><button class="go" type="submit">Lọc ngày __PLAY__</button><button class="clr" type="button" id="clr">Xoá</button></div></form>'
            '<p class="note" id="gdMsg" aria-live="polite"></p>')
    py, pm = add_months(y, m, -1)
    ny, nm = add_months(y, m, 1)
    nav = (f'<div class="cal-head">'
           + (f'<a class="btn" href="/{good_slug(act, pm, py)}/">‹ Tháng {pm}/{py}</a>' if (py, pm) in c.good_months else "<span></span>")
           + f'<b>{E(name)}</b>'
           + (f'<a class="btn" href="/{good_slug(act, nm, ny)}/">Tháng {nm}/{ny} ›</a>' if (ny, nm) in c.good_months else "<span></span>")
           + "</div>")
    others = ", ".join(c.good_link(o, m, y, c.acts[o]["name"].split(",")[0].lower()) for o in c.order if o != act)
    truc = ", ".join(a["truc"])
    body = (f'<p class="lede">{lede}</p><p>{ACT_NOTE[act]}</p>' + nav + form
            + (f'<div class="scroll"><table class="t" id="gd"><thead><tr><th>Dương lịch</th><th>Âm lịch</th><th>Ngày</th><th>Trực</th>'
               f'<th>Giờ hoàng đạo</th><th>Tuổi xung</th></tr></thead><tbody>{rows}</tbody></table></div>' if days else "")
            + '<div class="article"><h2>Ngày tốt được chọn thế nào?</h2><ul>'
            '<li>Là <b>ngày hoàng đạo</b> (Thanh Long, Minh Đường, Kim Quỹ, Kim Đường, Ngọc Đường, Tư Mệnh).</li>'
            f'<li>Có <b>trực</b> hợp với việc {lname}: {truc}.</li>'
            '<li>Không phạm <b>tam nương</b> (ngày 3, 7, 13, 18, 22, 27 âm lịch) và <b>nguyệt kỵ</b> (ngày 5, 14, 23).</li>'
            '<li>Không xung tuổi người chủ sự: nhập năm sinh ở trên để bỏ những ngày xung tuổi.</li>'
            '<li>Bắt đầu việc trong <b>giờ hoàng đạo</b> của ngày; bấm vào từng ngày để xem chi tiết.</li></ul>'
            f'<p class="note">{REF} Xem việc khác trong tháng {m}/{y}: {others}. Tất cả các tháng: <a href="/{GOOD_HUB}/">Xem ngày tốt</a>.</p></div>'
            + FILTER_JS)
    meta = {"slug": good_slug(act, m, y), "h1": f"Ngày tốt {lname} tháng {m} năm {y}",
            "title": f"Xem ngày tốt {lname} tháng {m}/{y}: {len(days)} ngày đẹp, giờ hoàng đạo | Tính Giùm",
            "description": (f"{len(days)} ngày tốt {lname} tháng {m}/{y}" + (f": {lst}. " if days else ". ")
                            + "Ngày hoàng đạo, trực tốt, không phạm tam nương, nguyệt kỵ; kèm giờ hoàng đạo, tuổi xung và bộ lọc theo năm sinh.")[:300]}
    return meta, body


def good_hub(c: Ctx) -> tuple[dict, str]:
    head = "".join(f"<th>{E(c.acts[a]['name'].split(',')[0])}</th>" for a in c.order)
    rows = ""
    for y, m in c.good_months:
        cells = ""
        for a in c.order:
            n = sum(1 for x in c.month_days(y, m) if a in x["goodFor"])
            cells += f'<td><a href="/{good_slug(a, m, y)}/">{n} ngày</a></td>'
        rows += f"<tr><th>Tháng {m}/{y}</th>{cells}</tr>"
    y0, m0 = c.good_months[0]
    quick = "".join(f'<li><a href="/{good_slug(a, m0, y0)}/">{E(c.acts[a]["name"])} tháng {m0}/{y0}</a></li>' for a in c.order)
    body = ('<p class="lede">Chọn việc và tháng để xem danh sách ngày tốt, kèm giờ hoàng đạo, tuổi xung và bộ lọc theo năm sinh của bạn.</p>'
            f'<h2>Tháng này</h2><ul>{quick}</ul>'
            f'<h2>Số ngày tốt theo tháng</h2><div class="scroll"><table class="t"><thead><tr><th>Tháng</th>{head}</tr></thead><tbody>{rows}</tbody></table></div>'
            '<div class="article"><h2>Cách chọn ngày tốt</h2><ul>'
            '<li>Chỉ lấy <b>ngày hoàng đạo</b>, bỏ ngày hắc đạo.</li>'
            '<li>Xét <b>trực</b> của ngày: mỗi việc hợp với một số trực (cưới hỏi: Định, Thành, Khai; khai trương: Mãn, Định, Thành, Khai…).</li>'
            '<li>Bỏ ngày <b>tam nương</b> (3, 7, 13, 18, 22, 27 âm lịch) và <b>nguyệt kỵ</b> (5, 14, 23).</li>'
            '<li>Trên trang từng tháng, nhập năm sinh để bỏ ngày xung tuổi; chọn giờ hoàng đạo để bắt đầu.</li></ul>'
            f'<p class="note">{REF} Tra một ngày bất kỳ: <a href="/doi-ngay-am-duong-lich/">Đổi ngày âm ↔ dương lịch</a>.</p></div>')
    meta = {"slug": GOOD_HUB, "h1": "Xem ngày tốt", "category": "ngay-lich",
            "title": "Xem ngày tốt: cưới hỏi, động thổ, nhập trạch, khai trương, mua xe | Tính Giùm",
            "description": "Xem ngày tốt theo tháng cho cưới hỏi, động thổ làm nhà, chuyển nhà nhập trạch, khai trương, mua xe, xuất hành: ngày hoàng đạo, trực tốt, giờ hoàng đạo, lọc theo năm sinh."}
    return meta, body


# ---------------------------------------------------------------- tuổi xông đất

def tet_info(c: Ctx) -> tuple[int, dict | None]:
    """Năm của Tết dùng cho trang xông đất và ngày mùng 1 Tết đó."""
    for x in c.days:
        if x["ld"] == 1 and x["lm"] == 1 and not x["leap"] and x["ly"] == c.xd["year"]["year"]:
            return x["ly"], x
    return 0, None


def xd_rows(rs: list[dict], tet: int) -> str:
    return "".join(f"<tr><td><b>{r['year']}</b></td><td>{r['canChi']}</td><td class=\"n\">{tet - r['year'] + 1}</td>"
                   f"<td>{r['napAm']}</td><td>{E('; '.join(r['why']))}</td></tr>" for r in rs)


def xd_owner_page(c: Ctx, tet: int, mung1: dict, y: int) -> tuple[dict, str]:
    r = c.xd["owners"][str(y)]
    O, Y = r["owner"], r["year"]
    best = r["best"]
    avoid_chi = list(dict.fromkeys(a["chi"] for a in r["avoid"]))
    hours = ", ".join(mung1["hours"])
    xung_note = (f"<p>Năm {Y['canChi']}, tuổi {O['chi']} xung với năm {Y['chi']} (phạm Thái tuế), nên theo phong tục càng nên nhờ người hợp tuổi xông đất "
                 "thay vì gia chủ tự xông nhà.</p>") if r["ownerXungYear"] else ""
    body = (f'<p class="lede">Gia chủ sinh năm {y} là tuổi <b>{O["canChi"]}</b>, mệnh {O["napAm"]} ({O["element"]}). '
            f'Năm {tet} là năm {Y["canChi"]}, mệnh {Y["napAm"]} ({Y["element"]}).</p>' + xung_note
            + f'<h2>Tuổi hợp xông đất Tết {Y["canChi"]} {tet}</h2>'
            + (f'<div class="scroll"><table class="t"><thead><tr><th>Năm sinh</th><th>Can chi</th><th class="n">Tuổi mụ</th><th>Mệnh</th><th>Vì sao hợp</th></tr></thead>'
               f'<tbody>{xd_rows(best, tet)}</tbody></table></div>' if best else "<p>Không có tuổi nào hợp rõ rệt; nên chọn người tính tình vui vẻ, làm ăn thuận lợi.</p>")
            + f'<h2>Tuổi nên tránh</h2><p>Tránh nhờ người tuổi <b>{", ".join(avoid_chi) or "—"}</b> xông đất: '
            + E("; ".join(sorted({b for a in r["avoid"] for b in a["bad"]}))) + ".</p>"
            + (f'<p class="note">Cụ thể: {", ".join(str(a["year"]) + " " + a["canChi"] for a in r["avoid"])}.</p>' if r["avoid"] else "")
            + f'<h2>Giờ đẹp xông đất</h2><p>Mùng 1 Tết {Y["canChi"]} là {mung1["wd"].lower()} {dmy(mung1)}. Giờ hoàng đạo: <b>{hours}</b>. '
            "Người xông đất thường đến ngay sau giao thừa hoặc buổi sáng mùng 1, ở lại một lúc, chúc Tết và lì xì cho trẻ nhỏ.</p>"
            '<div class="article"><h2>Lưu ý</h2><ul>'
            '<li>Tuổi tính theo <b>năm âm lịch</b>: người sinh vào tháng 1 hoặc đầu tháng 2 dương lịch, trước Tết, thuộc năm trước.</li>'
            '<li>Cách chấm: địa chi tam hợp, lục hợp với tuổi gia chủ và với năm mới; mệnh nạp âm sinh hoặc cùng mệnh với gia chủ; '
            'trừ điểm khi xung, hại hoặc khắc mệnh.</li>'
            '<li>Ngoài tuổi, dân gian coi trọng người vui vẻ, khỏe mạnh, gia đình êm ấm, làm ăn thuận lợi; tránh người đang có tang.</li></ul>'
            f'<p class="note">Chỉ mang tính tham khảo theo quan niệm dân gian. Xem gia chủ tuổi khác: <a href="/{xd_hub(tet)}/">Tuổi xông đất {tet}</a>. '
            f'Lịch nghỉ Tết: <a href="/lich-nghi-tet/">Lịch nghỉ Tết {tet}</a>.</p></div>')
    top = ", ".join(f"{b['year']} ({b['canChi']})" for b in best[:3])
    meta = {"slug": xd_slug(tet, y), "h1": f"Tuổi xông đất {tet} cho gia chủ sinh năm {y} ({O['canChi']})",
            "title": f"Tuổi xông đất {tet} cho gia chủ {y} {O['canChi']}: tuổi hợp, tuổi kỵ | Tính Giùm",
            "description": (f"Gia chủ sinh năm {y} ({O['canChi']}, mệnh {O['napAm']}) nên chọn người sinh năm {top} xông đất Tết {Y['canChi']} {tet}"
                            + (f"; tránh tuổi {', '.join(avoid_chi)}" if avoid_chi else "") + ". Kèm giờ hoàng đạo mùng 1 Tết.")[:300]}
    return meta, body


def xd_hub_page(c: Ctx, tet: int, mung1: dict) -> tuple[dict, str]:
    Y = c.xd["year"]
    links = "".join(f'<li><a href="/{xd_slug(tet, int(y))}/">{y}</a> <small>{c.xd["owners"][y]["owner"]["canChi"]}</small></li>'
                    for y in sorted(c.xd["owners"], key=int))
    body = (f'<p class="lede">Nhập năm sinh của gia chủ để xem tuổi nào hợp xông đất Tết {Y["canChi"]} {tet} (mùng 1 Tết là {mung1["wd"].lower()} {dmy(mung1)}).</p>'
            '<form class="calc" id="f" data-result="out"><label class="l" for="oy">Năm sinh gia chủ</label>'
            '<div><input class="in w-s" id="oy" inputmode="numeric" maxlength="4" value="1985"> <span class="hint">năm âm lịch</span></div>'
            '<div class="btns"><button class="go" type="submit">Xem tuổi __PLAY__</button><button class="clr" type="button" id="clr">Xoá</button></div></form>'
            '<section class="result" id="out" hidden aria-live="polite"><h2>Kết quả</h2><div class="body"><p class="big" id="res"></p>'
            '<div class="scroll"><table class="t"><thead><tr><th>Năm sinh</th><th>Can chi</th><th class="n">Tuổi mụ</th><th>Mệnh</th><th>Vì sao hợp</th></tr></thead>'
            '<tbody id="tbl"></tbody></table></div><p id="av"></p><p class="note" id="more"></p></div></section>'
            f'<h2>Chọn theo năm sinh gia chủ</h2><ul class="yrs">{links}</ul>'
            '<div class="article"><h2>Xông đất là gì?</h2><ul>'
            '<li>Người đầu tiên bước vào nhà sau giao thừa được tin là ảnh hưởng tới may mắn cả năm của gia đình, nên nhiều nhà nhờ trước một người hợp tuổi.</li>'
            f'<li>Giờ hoàng đạo mùng 1 Tết {Y["canChi"]}: {", ".join(mung1["hours"])}.</li>'
            '<li>Tuổi xét theo năm âm lịch; cách chấm dựa trên tam hợp, lục hợp, xung, hại của địa chi và mệnh ngũ hành nạp âm.</li></ul>'
            '<p class="note">Chỉ mang tính tham khảo theo quan niệm dân gian.</p></div>'
            '<script src="/js/am-lich.js"></script><script src="/js/tuoi.js"></script><script src="/js/van-su.js"></script><script src="/js/xong-dat.js"></script>'
            + XD_JS.replace("__TET__", str(tet)).replace("__HUB__", xd_hub(tet)))
    meta = {"slug": xd_hub(tet), "h1": f"Tuổi xông đất {tet}", "category": "ngay-lich",
            "title": f"Tuổi xông đất {tet} {Y['canChi']}: xem tuổi hợp xông nhà theo năm sinh gia chủ | Tính Giùm",
            "description": f"Xem tuổi xông đất Tết {Y['canChi']} {tet} theo năm sinh gia chủ: tuổi hợp, tuổi nên tránh, giờ hoàng đạo mùng 1 Tết. Tra nhanh cho gia chủ sinh từ 1960 đến 2005."}
    return meta, body


XD_JS = """<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  function run(e){
    if (e) e.preventDefault();
    var y = parseInt($("oy").value, 10);
    $("out").hidden = false;
    if (!(y > 1900 && y < 2100)) { $("res").innerHTML = '<span class="err">Nhập năm sinh, ví dụ 1985.</span>'; $("tbl").innerHTML = ""; $("av").textContent = ""; $("more").textContent = ""; return; }
    var r = XongDat.forOwner(y, __TET__);
    $("res").innerHTML = "Gia chủ <b>" + r.owner.canChi + "</b> (" + r.owner.napAm + "): nên nhờ người sinh năm <b>" +
      r.best.slice(0, 3).map(function(b){ return b.year; }).join(", ") + "</b> xông đất.";
    $("tbl").innerHTML = r.best.map(function(b){ return "<tr><td><b>" + b.year + "</b></td><td>" + b.canChi + '</td><td class="n">' + (__TET__ - b.year + 1) +
      "</td><td>" + b.napAm + "</td><td>" + b.why.join("; ") + "</td></tr>"; }).join("");
    var chis = r.avoid.map(function(a){ return a.chi; }).filter(function(v, i, s){ return s.indexOf(v) === i; });
    $("av").innerHTML = chis.length ? "Nên tránh tuổi <b>" + chis.join(", ") + "</b>." : "";
    $("more").innerHTML = (y >= 1960 && y <= 2005) ? 'Xem chi tiết: <a href="/__HUB__-sinh-nam-' + y + '/">gia chủ sinh năm ' + y + "</a>." : "";
  }
  $("f").addEventListener("submit", run);
  $("clr").addEventListener("click", function(){ $("oy").value = ""; $("out").hidden = true; });
  run();
})();
</script>"""


# ---------------------------------------------------------------- ngày lễ quanh Tết

HOLIDAYS = [  # slug, tên, ngày âm, tháng âm, năm âm lệch so với Tết, nội dung
    ("ong-cong-ong-tao", "Ông Công Ông Táo", 23, 12, -1,
     ["Theo phong tục, các gia đình cúng tiễn ông Công ông Táo về trời vào ngày 23 tháng Chạp; nhiều nhà làm lễ từ vài ngày trước đó và thường xong trước 12 giờ trưa.",
      "Lễ vật thường có: mũ, áo, hia ông Công ông Táo bằng giấy (hai mũ ông, một mũ bà), cá chép sống hoặc cá giấy, hương, hoa, trầu cau, mâm ngũ quả hoặc mâm cỗ.",
      "Sau lễ, nhiều nhà phóng sinh cá chép ở ao hồ sạch; nên thả cá nhẹ nhàng và mang túi ni lông về, không ném cả túi xuống nước."]),
    ("via-than-tai", "Vía Thần Tài", 10, 1, 0,
     ["Mùng 10 tháng Giêng là ngày vía Thần Tài; nhiều gia đình và cửa hàng làm lễ cầu buôn bán thuận lợi, nhiều người mua vàng lấy may.",
      "Lễ vật thường có: hương, hoa, nến, trái cây, xôi, chè hoặc heo quay, bánh kẹo, rượu, nước.",
      "Giá vàng thường tăng và cửa hàng đông khách quanh ngày này: nên mua theo nhu cầu, giữ hoá đơn và so sánh giá mua vào – bán ra."]),
    ("ram-thang-gieng", "Rằm tháng Giêng", 15, 1, 0,
     ["Rằm tháng Giêng (Tết Nguyên tiêu) là ngày rằm lớn đầu năm; nhiều gia đình cúng gia tiên, cúng Phật và đi lễ chùa cầu an.",
      "Lễ vật thường có mâm cỗ chay hoặc mặn, xôi, chè, hoa quả, hương, hoa.",
      "Các chùa lớn thường rất đông từ tối 14 đến hết ngày rằm; nên đi sớm và giữ gìn tư trang."]),
]


def holiday_slug(slug: str, tet: int) -> str:
    return f"{slug}-{tet}"


def holiday_pages(c: Ctx, tet: int) -> list[tuple[dict, str]]:
    out = []
    for slug, name, ld, lm, dy, paras in HOLIDAYS:
        x = next((v for v in c.days if v["ld"] == ld and v["lm"] == lm and not v["leap"] and v["ly"] == tet + dy), None)
        if not x:
            continue
        ky = [n for n, f in (("tam nương", x["tamNuong"]), ("nguyệt kỵ", x["nguyetKy"])) if f]
        jd_note = f'<p class="note" id="cd" data-date="{x["y"]}-{x["m"]:02d}-{x["d"]:02d}"></p>'
        body = (f'<p class="lede">{name} {tet} rơi vào <b>{x["wd"].lower()}, {dmy(x)}</b> dương lịch, tức {lunar_long(x)} âm lịch.</p>'
                f'<section class="today-box"><h2>{name} {tet}</h2><div class="body"><p class="big"><b>{x["wd"]}, {x["d"]:02d}/{x["m"]:02d}/{x["y"]}</b></p>'
                f'<p>Ngày {x["ccDay"]}, {"hoàng đạo" if x["hd"] else "hắc đạo"} ({x["spirit"]}), trực {x["truc"]}{" · phạm " + ", ".join(ky) if ky else ""}.</p>'
                f'<p>Giờ hoàng đạo: <b>{", ".join(x["hours"])}</b></p>{jd_note}</div></section>'
                f'<h2>Phong tục {name}</h2>' + "".join(f"<p>{E(p)}</p>" for p in paras)
                + f'<p class="note">Chi tiết ngày: {c.day_link(x, "lịch vạn sự ngày " + dmy(x))}. Lịch nghỉ Tết: <a href="/lich-nghi-tet/">Lịch nghỉ Tết {tet}</a>. '
                  f'Tuổi xông nhà: <a href="/{xd_hub(tet)}/">Tuổi xông đất {tet}</a>.</p>'
                + COUNTDOWN_JS)
        meta = {"slug": holiday_slug(slug, tet), "h1": f"{name} {tet} là ngày nào?",
                "title": f"{name} {tet} là ngày nào? {x['wd']} {dmy(x)}, giờ cúng đẹp | Tính Giùm",
                "description": f"{name} {tet} vào {x['wd'].lower()} {dmy(x)} dương lịch ({lunar_long(x)}). Giờ hoàng đạo: {', '.join(h.split(' ')[0] for h in x['hours'])}. Phong tục, lễ vật thường chuẩn bị."}
        out.append((meta, body))
    return out


COUNTDOWN_JS = """<script>
(function(){
  var el = document.getElementById("cd"); if (!el) return;
  var p = el.getAttribute("data-date").split("-"), t = Date.UTC(+p[0], p[1] - 1, +p[2]), n = new Date(), now = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  var k = Math.round((t - now) / 864e5);
  el.textContent = k > 0 ? "Còn " + k + " ngày nữa." : k === 0 ? "Là hôm nay." : "Đã qua " + (-k) + " ngày.";
})();
</script>"""


# ---------------------------------------------------------------- tất cả

def build_all(today: date, month_years: list[int]) -> tuple[list[tuple[dict, str]], list[dict], set, dict]:
    """-> (các trang, mục cho danh sách công cụ, tập ngày có trang riêng, liên kết ngày tốt cho trang lịch tháng)"""
    day_from = add_months(today.year, today.month, -3)
    day_to = add_months(today.year, today.month, 15)
    good_months = [add_months(today.year, today.month, k) for k in range(14)]
    tet_year = today.year if (today.month, today.day) <= (2, 25) else today.year + 1   # Tết sắp tới (hoặc vừa qua)
    data = load(*day_from, *day_to, tet_year)
    c = Ctx(data, today, day_from, day_to, good_months, month_years)
    pages = [day_page(c, x) for x in c.days if _key(x) in c.day_pages]
    pages += [good_page(c, a, y, m) for (y, m) in good_months for a in c.order]
    hub = good_hub(c)
    pages.append(hub)
    listing = [{"slug": GOOD_HUB, "h1": "Xem ngày tốt", "category": "ngay-lich", "order": "4b",
                "summary": "Ngày tốt cưới hỏi, động thổ, nhập trạch, khai trương theo tháng.",
                "keywords": "xem ngày tốt, ngày tốt, ngày hoàng đạo, ngày cưới đẹp, ngày tốt khai trương, ngày tốt động thổ, ngày tốt chuyển nhà, ngày tốt mua xe"}]
    tet, mung1 = tet_info(c)
    if tet:
        pages.append(xd_hub_page(c, tet, mung1))
        pages += [xd_owner_page(c, tet, mung1, int(y)) for y in c.xd["owners"]]
        pages += holiday_pages(c, tet)
        listing.append({"slug": xd_hub(tet), "h1": f"Tuổi xông đất {tet}", "category": "ngay-lich", "order": "4c",
                        "summary": "Tuổi hợp xông nhà đầu năm theo năm sinh gia chủ.",
                        "keywords": f"tuổi xông đất {tet}, xông đất {tet}, tuổi xông nhà, xông nhà tết, tuổi hợp xông đất, xông đất năm {c.xd['year']['canChi'].lower()}"})
    good_links = {(y, m): "<p><b>Ngày tốt tháng " + f"{m}/{y}" + ":</b> " + ", ".join(
        f'<a href="/{good_slug(a, m, y)}/">{E(c.acts[a]["name"].split(",")[0].lower())}</a>' for a in c.order) + ".</p>" for (y, m) in good_months}
    return pages, listing, c.day_pages, good_links
