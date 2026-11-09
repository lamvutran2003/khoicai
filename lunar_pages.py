"""Trang tĩnh lịch âm: /lich-am-<năm>/ và /lich-am-thang-<tháng>-<năm>/.

Dữ liệu (ngày âm, can chi, ngày lễ) lấy từ chính bộ máy am-lich.js qua tools/lunar_data.js, nên trang tĩnh
và công cụ đổi ngày luôn cho cùng một kết quả.
"""
from __future__ import annotations

import calendar
import html
import json
import subprocess
from pathlib import Path

E = html.escape
ROOT = Path(__file__).resolve().parent
DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
WEEKDAY = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"]


CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"]
CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"]


def can_chi_year(y: int) -> str:
    return f"{CAN[(y + 6) % 10]} {CHI[(y + 8) % 12]}"


def lunar_month_name(m: int) -> str:
    return "Giêng" if m == 1 else "Chạp" if m == 12 else str(m)


def load(first: int, last: int) -> dict:
    out = subprocess.check_output(["node", str(ROOT / "tools/lunar_data.js"), str(first), str(last)])
    return json.loads(out)


def month_slug(m: int, y: int) -> str:
    return f"lich-am-thang-{m}-{y}"


def year_slug(y: int) -> str:
    return f"lich-am-{y}"


def grid(data: dict, y: int, m: int, small: bool = False) -> str:
    lead = calendar.weekday(y, m, 1)
    n = calendar.monthrange(y, m)[1]
    cells = "".join(f'<span class="dow">{d}</span>' for d in DOW) + "<span></span>" * lead
    for d in range(1, n + 1):
        ld, lm, ly, leap, _, _, hols = data["days"][f"{y}-{m}-{d}"]
        off = any(h[1] for h in hols)
        cls = " ".join(c for c in [
            "sun" if (lead + d - 1) % 7 == 6 else "", "off" if off else "", "ev" if hols and not off else "",
            "mark" if ld in (1, 15) else ""] if c)
        sub = f"{ld}/{lm}{'N' if leap else ''}" if ld == 1 else str(ld)
        title = f' title="{E(", ".join(h[0] for h in hols))}"' if hols else ""
        cells += f'<span class="d {cls}"{title}>{d}<small>{sub}</small></span>'
    return f'<div class="cal-grid{" small" if small else ""}">{cells}</div>'


def lunar_text(v) -> str:
    ld, lm, ly, leap = v[:4]
    return f"{ld}/{lm}{' nhuận' if leap else ''}"


# Trang lịch nghỉ Tết đang có (cập nhật mỗi năm khi Chính phủ công bố lịch nghỉ)
TET_PAGE = {2027: "/lich-nghi-tet/"}


def tet_link(y: int) -> str:
    return f'<p><b>Lịch nghỉ Tết {y}:</b> <a href="{TET_PAGE[y]}">nghỉ từ ngày nào, còn bao nhiêu ngày đến Tết</a>.</p>' if y in TET_PAGE else ""


def month_page(data: dict, y: int, m: int, years: list[int]) -> tuple[dict, str]:
    n = calendar.monthrange(y, m)[1]
    days = [(d, data["days"][f"{y}-{m}-{d}"]) for d in range(1, n + 1)]
    first, last = days[0][1], days[-1][1]
    cc = can_chi_year(last[2])
    hol_rows = [(d, v, h) for d, v in days for h in v[6]]
    key_rows = [(d, v) for d, v in days if v[0] in (1, 15)]
    intro = (f"Tháng {m}/{y} dương lịch bắt đầu ngày {first[0]} tháng {lunar_month_name(first[1]).lower()}"
             f"{' nhuận' if first[3] else ''} và kết thúc ngày {last[0]} tháng {lunar_month_name(last[1]).lower()}"
             f"{' nhuận' if last[3] else ''} âm lịch.")
    hols = "".join(f'<li class="{"off" if h[1] else ""}"><b>{d}/{m}</b> {E(h[0])}{" (nghỉ)" if h[1] else ""}'
                   f' · âm lịch {lunar_text(v)}</li>' for d, v, h in hol_rows) or "<li>Không có ngày lễ lớn.</li>"
    keys = "".join(f"<tr><td>{'Mùng 1' if v[0] == 1 else 'Rằm (15)'} tháng {lunar_month_name(v[1]).lower()}{' nhuận' if v[3] else ''}</td>"
                   f"<td>{WEEKDAY[calendar.weekday(y, m, d)]}, {d}/{m}/{y}</td></tr>" for d, v in key_rows)
    rows = "".join(f"<tr{' class=\"offrow\"' if any(h[1] for h in v[6]) else ''}><td>{d}/{m}</td><td>{v[5]}</td>"
                   f"<td>{lunar_text(v)}/{v[2]}</td><td>{v[4]}</td><td>{E(', '.join(h[0] for h in v[6]))}</td></tr>" for d, v in days)
    pm, py = (m - 1, y) if m > 1 else (12, y - 1)
    nm, ny = (m + 1, y) if m < 12 else (1, y + 1)
    prev = f'<a class="btn" href="/{month_slug(pm, py)}/">‹ Tháng {pm}/{py}</a>' if py in years else ""
    nxt = f'<a class="btn" href="/{month_slug(nm, ny)}/">Tháng {nm}/{ny} ›</a>' if ny in years else ""
    body = (f'<p class="lede">{intro}</p>'
            f'<div class="calbox"><div class="cal-head">{prev or "<span></span>"}<b>Tháng {m}/{y}</b>{nxt or "<span></span>"}</div>'
            f'{grid(data, y, m)}<p class="note">Số nhỏ là ngày âm lịch. Ô đỏ là ngày nghỉ lễ; chấm cam là ngày lễ, kỷ niệm không nghỉ.</p></div>'
            + (tet_link(y) if m in (1, 2) else "") +
            f'<h2>Ngày lễ tháng {m}/{y}</h2><ul class="hols">{hols}</ul>'
            f'<h2>Mùng 1 và ngày rằm</h2><div class="scroll"><table class="t"><tbody>{keys}</tbody></table></div>'
            f'<h2>Lịch âm từng ngày tháng {m}/{y}</h2>'
            f'<div class="scroll"><table class="t days"><thead><tr><th>Dương lịch</th><th>Thứ</th><th>Âm lịch</th><th>Can chi</th><th>Ghi chú</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div>'
            f'<p class="note">Xem cả năm: <a href="/{year_slug(y)}/">Lịch âm năm {y}</a>. Đổi một ngày bất kỳ: '
            f'<a href="/doi-ngay-am-duong-lich/">Đổi ngày âm ↔ dương lịch</a>. Lịch âm Việt Nam tính theo giờ Hà Nội (UTC+7).</p>')
    hol_names = ", ".join(dict.fromkeys(h[0] for _, _, h in hol_rows))
    meta = {
        "slug": month_slug(m, y), "category": "ngay-lich", "h1": f"Lịch âm tháng {m} năm {y}",
        "title": f"Lịch âm tháng {m} năm {y}: ngày âm, ngày rằm, ngày lễ | Tính Giùm",
        "description": (f"Lịch âm tháng {m}/{y}: {intro} " + (f"Ngày lễ: {hol_names}. " if hol_names else "")
                        + f"Xem ngày âm, can chi từng ngày, mùng 1 và ngày rằm năm {cc}.")[:300],
    }
    return meta, body


def year_page(data: dict, y: int, years: list[int]) -> tuple[dict, str]:
    info = data["years"][str(y)]
    td, tm, ty = info["tet"]
    months = "".join(f'<section class="mini"><h3><a href="/{month_slug(m, y)}/">Tháng {m}</a></h3>{grid(data, y, m, small=True)}</section>'
                     for m in range(1, 13))
    hol_rows = ""
    for m in range(1, 13):
        for d in range(1, calendar.monthrange(y, m)[1] + 1):
            v = data["days"][f"{y}-{m}-{d}"]
            for h in v[6]:
                hol_rows += (f"<tr{' class=\"offrow\"' if h[1] else ''}><td>{E(h[0])}</td><td>{WEEKDAY[calendar.weekday(y, m, d)]}, {d}/{m}/{y}</td>"
                             f"<td>{lunar_text(v)}</td></tr>")
    leap = f" Năm âm lịch {info['canChi']} có tháng {info['leap']} nhuận." if info["leap"] else ""
    others = " · ".join(f'<a href="/{year_slug(o)}/">{o}</a>' for o in years if o != y)
    body = (f'<p class="lede">Năm {y} là năm {info["canChi"]}. Tết Nguyên đán (mùng 1 tháng Giêng) rơi vào '
            f'{WEEKDAY[calendar.weekday(ty, tm, td)].lower()}, ngày {td}/{tm}/{ty}.{leap}</p>'
            + tet_link(y) +
            f'<div class="minis">{months}</div>'
            f'<h2>Ngày lễ, Tết năm {y}</h2><div class="scroll"><table class="t"><thead><tr><th>Ngày lễ</th><th>Dương lịch</th><th>Âm lịch</th></tr></thead>'
            f'<tbody>{hol_rows}</tbody></table></div>'
            f'<p class="note">Dòng tô đỏ là ngày nghỉ lễ hưởng lương. Tết âm lịch được nghỉ 5 ngày, Quốc khánh 2 ngày; ngày nghỉ cụ thể do Chính phủ công bố. '
            f'Năm khác: {others}.</p>')
    meta = {
        "slug": year_slug(y), "category": "ngay-lich", "h1": f"Lịch âm năm {y} ({info['canChi']})",
        "title": f"Lịch âm {y} ({info['canChi']}): lịch vạn niên cả năm, ngày lễ Tết | Tính Giùm",
        "description": f"Lịch âm năm {y} {info['canChi']} đủ 12 tháng, Tết Nguyên đán ngày {td}/{tm}/{ty}, ngày rằm, mùng một và các ngày lễ, ngày nghỉ năm {y}.",
    }
    return meta, body
