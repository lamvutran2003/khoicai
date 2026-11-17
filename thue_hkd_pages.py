"""Trang tĩnh thuế hộ kinh doanh theo ngành:

  /thue-ho-kinh-doanh-2026/                 trang tổng hợp quy định và danh sách ngành
  /thue-ho-kinh-doanh-<ngành>/              ví dụ: tạp hoá, quán ăn, spa, vận tải… (tỷ lệ, bảng ví dụ, việc phải làm)

Số liệu ví dụ tính bằng site/static/js/thue-hkd.js (qua tools/thue_hkd_data.js), cùng bộ máy với công cụ /tinh-thue-ho-kinh-doanh/.
"""
from __future__ import annotations

import html
import json
import subprocess
from pathlib import Path

E = html.escape
ROOT = Path(__file__).resolve().parent
HUB = "thue-ho-kinh-doanh-2026"
CALC = "/tinh-thue-ho-kinh-doanh/"
RULES = ("Căn cứ: Luật Thuế TNCN 109/2025/QH15; Nghị định 68/2026/NĐ-CP sửa đổi bởi Nghị định 141/2026/NĐ-CP; "
         "Nghị định 398/2026/NĐ-CP (giảm 30% thuế TNCN năm 2026, 2027). Cập nhật 11/2026; để tham khảo, kiểm tra lại với cơ quan thuế quản lý trực tiếp.")

# slug, tên ngành, nhóm, ghi chú riêng
SECTORS = [
    ("tap-hoa", "cửa hàng tạp hoá", "hang-hoa", "Bán lẻ hàng tiêu dùng, đồ uống đóng chai, bánh kẹo… thuộc nhóm phân phối hàng hoá."),
    ("quan-ao", "shop quần áo, thời trang", "hang-hoa", "Bán quần áo, giày dép, phụ kiện may sẵn là phân phối hàng hoá; nếu tự may đo thì phần may thuộc nhóm sản xuất."),
    ("my-pham", "shop mỹ phẩm", "hang-hoa", "Bán mỹ phẩm là phân phối hàng hoá; nếu kèm dịch vụ chăm sóc da thì phần dịch vụ tính theo tỷ lệ dịch vụ."),
    ("ban-hang-online", "bán hàng online", "hang-hoa",
     "Bán qua sàn thương mại điện tử có chức năng thanh toán thì sàn khấu trừ, nộp thay thuế cho hộ; doanh thu trên sàn vẫn cộng vào tổng doanh thu cả năm để xét ngưỡng 1 tỷ đồng. Bán qua mạng xã hội, website riêng thì hộ tự khai."),
    ("dien-thoai", "cửa hàng điện thoại, phụ kiện", "hang-hoa", "Bán máy, phụ kiện là phân phối hàng hoá; sửa chữa, thay linh kiện nên ghi doanh thu riêng."),
    ("nha-thuoc", "nhà thuốc", "hang-hoa", "Bán lẻ thuốc, thực phẩm chức năng là phân phối hàng hoá."),
    ("vat-lieu-xay-dung", "cửa hàng vật liệu xây dựng", "hang-hoa", "Bán xi măng, sắt thép, gạch, sơn… là phân phối hàng hoá; nhận thi công thì phần thi công tính riêng."),
    ("van-phong-pham", "cửa hàng văn phòng phẩm", "hang-hoa", "Bán văn phòng phẩm, sách vở là phân phối hàng hoá; dịch vụ photo, in thuộc nhóm khác."),
    ("dien-may-gia-dung", "cửa hàng điện máy, đồ gia dụng", "hang-hoa", "Bán đồ điện, gia dụng là phân phối hàng hoá; lắp đặt, sửa chữa tính riêng."),
    ("spa-nail", "spa, nail, gội đầu dưỡng sinh", "dich-vu", "Làm đẹp, chăm sóc cơ thể là dịch vụ; mỹ phẩm bán lẻ kèm theo nên ghi doanh thu riêng (tỷ lệ hàng hoá)."),
    ("cat-toc", "tiệm cắt tóc, salon tóc", "dich-vu", "Cắt, uốn, nhuộm tóc là dịch vụ."),
    ("nha-nghi-homestay", "nhà nghỉ, homestay", "dich-vu", "Cho khách nghỉ qua đêm là dịch vụ lưu trú; khác với cho thuê nhà dài hạn (có cách tính riêng)."),
    ("giat-la", "tiệm giặt là, giặt sấy", "dich-vu", "Giặt là, giặt sấy là dịch vụ."),
    ("chup-anh", "studio chụp ảnh, quay phim", "dich-vu", "Chụp ảnh, quay phim, trang điểm cô dâu là dịch vụ."),
    ("thiet-ke-quang-cao", "dịch vụ thiết kế, quảng cáo", "dich-vu", "Thiết kế, chạy quảng cáo, làm nội dung là dịch vụ."),
    ("xay-dung-nhan-cong", "nhận thầu xây dựng nhân công", "dich-vu", "Xây dựng không bao thầu nguyên vật liệu (chủ nhà tự mua vật liệu) tính theo tỷ lệ dịch vụ."),
    ("quan-an", "quán ăn, nhà hàng", "san-xuat", "Dịch vụ ăn uống thuộc nhóm dịch vụ có gắn với hàng hoá."),
    ("quan-cafe-tra-sua", "quán cà phê, trà sữa", "san-xuat", "Pha chế, bán đồ uống tại quán hoặc mang đi là dịch vụ ăn uống."),
    ("van-tai", "vận tải, taxi, xe tải", "san-xuat", "Chở hàng, chở khách thuộc nhóm vận tải."),
    ("xuong-may", "xưởng may, gia công", "san-xuat", "May mặc, gia công hàng hoá thuộc nhóm sản xuất."),
    ("lam-banh", "làm bánh, sản xuất thực phẩm", "san-xuat", "Tự làm bánh, chế biến thực phẩm để bán thuộc nhóm sản xuất."),
    ("xay-dung-tron-goi", "xây dựng trọn gói (bao vật liệu)", "san-xuat", "Xây dựng có bao thầu nguyên vật liệu tính theo tỷ lệ của nhóm sản xuất, xây dựng."),
    ("in-an", "cơ sở in ấn", "san-xuat", "In ấn, làm biển bảng là sản xuất hàng hoá."),
]


def load(year: int) -> dict:
    return json.loads(subprocess.check_output(["node", str(ROOT / "tools/thue_hkd_data.js"), str(year)]))


def pct(r: float) -> str:
    s = f"{r * 100:.2f}".rstrip("0").rstrip(".")
    return s.replace(".", ",") + "%"


def money(v: float) -> str:
    return f"{round(v):,}".replace(",", ".")


def rev_text(v: float) -> str:
    return f"{v / 1e9:g} tỷ".replace(".", ",") if v >= 1e9 else f"{v / 1e6:g} triệu"


def slug(s: str) -> str:
    return f"thue-ho-kinh-doanh-{s}"


def sector_page(data: dict, s: tuple) -> tuple[dict, str]:
    sid, name, gid, note = s
    g = next(x for x in data["groups"] if x["id"] == gid)
    year = data["year"]
    rows = "".join(f"<tr><td>{rev_text(e['revenue'])}</td><td class=\"n\">{money(e['vat'])}</td><td class=\"n\">{money(e['pit'])}</td>"
                   f"<td class=\"n\"><b>{money(e['total'])}</b></td><td class=\"n\">{money(e['total'] / 4)}</td></tr>" for e in data["examples"][gid])
    ex2 = next(e for e in data["examples"][gid] if e["revenue"] == 2e9)
    same = ", ".join(f'<a href="/{slug(x[0])}/">{E(x[1])}</a>' for x in SECTORS if x[2] == gid and x[0] != sid)
    body = (f'<p class="lede">{E(name[0].upper() + name[1:])} thuộc nhóm <b>{E(g["name"].lower())}</b>: thuế GTGT <b>{pct(g["vat"])}</b> trên toàn bộ doanh thu, '
            f'thuế TNCN <b>{pct(g["pit"])}</b> trên phần doanh thu vượt 1 tỷ đồng/năm. Doanh thu cả năm từ 1 tỷ trở xuống không phải nộp hai loại thuế này.</p>'
            f"<p>{E(note)}</p>"
            f'<h2>Bảng thuế theo doanh thu năm {year}</h2>'
            '<div class="scroll"><table class="t"><thead><tr><th>Doanh thu năm</th><th class="n">Thuế GTGT</th><th class="n">Thuế TNCN</th>'
            '<th class="n">Tổng thuế</th><th class="n">Mỗi quý</th></tr></thead>'
            f"<tbody>{rows}</tbody></table></div>"
            f'<p class="note">Đơn vị: đồng. Thuế TNCN tính theo tỷ lệ trên phần doanh thu vượt 1 tỷ, đã giảm 30% theo Nghị định 398/2026/NĐ-CP; chưa tính giảm thuế GTGT.</p>'
            f'<p><a class="btn solid" href="{CALC}?nganh={gid}&amp;dt=2000000000">Tính với doanh thu của bạn ›</a></p>'
            f'<h2>Ví dụ: doanh thu 2 tỷ đồng</h2><ul>'
            f'<li>Thuế GTGT: 2.000.000.000 × {pct(g["vat"])} = <b>{money(ex2["vat"])} đ</b>.</li>'
            f'<li>Thuế TNCN: (2 tỷ − 1 tỷ) × {pct(g["pit"])} = {money(ex2["pitBefore"])} đ, giảm 30% còn <b>{money(ex2["pit"])} đ</b>.</li>'
            f'<li>Tổng cả năm <b>{money(ex2["total"])} đ</b>, khai và nộp theo quý.</li></ul>'
            '<h2>Phải làm gì?</h2><ul>'
            '<li><b>Doanh thu đến 1 tỷ/năm</b>: không nộp thuế GTGT, TNCN; thông báo doanh thu thực tế cả năm (mẫu 01/TKN-CNKD) chậm nhất 31/01 năm sau.</li>'
            '<li><b>Trên 1 tỷ</b>: khai, nộp thuế theo quý (hạn 30/4, 31/7, 31/10, 31/01) và dùng hoá đơn điện tử có mã hoặc từ máy tính tiền.</li>'
            '<li><b>Từ 1 đến 3 tỷ</b>: có thể chọn tính thuế TNCN trên thu nhập (doanh thu − chi phí hợp lý) × 15% nếu có đủ chứng từ chi phí.</li>'
            '<li><b>Trên 3 tỷ</b>: thuế TNCN tính trên thu nhập × 17% (đến 50 tỷ), phải ghi sổ chi phí và quyết toán năm.</li></ul>'
            '<div class="article"><p class="note">'
            + (f"Ngành cùng nhóm: {same}. " if same else "")
            + f'Tất cả ngành: <a href="/{HUB}/">Thuế hộ kinh doanh 2026</a>. Hạn nộp: <a href="/lich-nop-thue-ho-kinh-doanh/">Lịch nộp thuế hộ kinh doanh</a>. '
              f'Ghi doanh thu: <a href="/so-doanh-thu-ho-kinh-doanh/">Sổ doanh thu (Excel)</a>.</p><p class="note">{E(RULES)}</p></div>')
    meta = {"slug": slug(sid), "category": "tien-hoa-don", "cls": "article",
            "h1": f"Thuế hộ kinh doanh {name} 2026",
            "title": f"Thuế hộ kinh doanh {name} 2026: GTGT {pct(g['vat'])}, TNCN {pct(g['pit'])}, cách tính | Tính Giùm",
            "description": (f"{name[0].upper() + name[1:]} nộp thuế thế nào từ 2026? Doanh thu đến 1 tỷ không nộp thuế; trên 1 tỷ nộp GTGT {pct(g['vat'])} doanh thu, "
                            f"TNCN {pct(g['pit'])} phần vượt 1 tỷ (giảm 30% năm 2026, 2027). Doanh thu 2 tỷ nộp khoảng {money(ex2['total'])} đồng/năm.")}
    return meta, body


def hub_page(data: dict) -> tuple[dict, str]:
    rows = ""
    for g in data["groups"]:
        secs = ", ".join(f'<a href="/{slug(x[0])}/">{E(x[1])}</a>' for x in SECTORS if x[2] == g["id"]) or "—"
        rows += f'<tr><td><b>{E(g["name"])}</b><br><small>{secs}</small></td><td class="n">{pct(g["vat"])}</td><td class="n">{pct(g["pit"])}</td></tr>'
    body = ('<p class="lede">Từ 01/01/2026, hộ kinh doanh không còn nộp thuế khoán và lệ phí môn bài, mà tự khai doanh thu thực tế. '
            'Doanh thu cả năm <b>từ 1 tỷ đồng trở xuống không phải nộp thuế GTGT, thuế TNCN</b>.</p>'
            f'<p><a class="btn solid" href="{CALC}">Tính thuế hộ kinh doanh ›</a> <a class="btn" href="/lich-nop-thue-ho-kinh-doanh/">Lịch nộp thuế</a> '
            '<a class="btn" href="/so-doanh-thu-ho-kinh-doanh/">Sổ doanh thu Excel</a></p>'
            '<h2>Nộp bao nhiêu theo doanh thu?</h2><div class="scroll"><table class="t">'
            '<thead><tr><th>Doanh thu cả năm</th><th>Thuế GTGT</th><th>Thuế TNCN</th><th>Kê khai</th></tr></thead><tbody>'
            '<tr><td>Đến 1 tỷ</td><td>Không</td><td>Không</td><td>Thông báo doanh thu (31/01 năm sau)</td></tr>'
            '<tr><td>Trên 1 tỷ đến 3 tỷ</td><td>Doanh thu × tỷ lệ ngành</td><td>(Doanh thu − 1 tỷ) × tỷ lệ ngành, hoặc thu nhập × 15%</td><td>Theo quý, hoá đơn điện tử</td></tr>'
            '<tr><td>Trên 3 tỷ đến 50 tỷ</td><td>Doanh thu × tỷ lệ ngành</td><td>Thu nhập (doanh thu − chi phí) × 17%</td><td>Theo quý, sổ chi phí, quyết toán</td></tr>'
            '<tr><td>Trên 50 tỷ</td><td>Doanh thu × tỷ lệ ngành</td><td>Thu nhập × 20%</td><td>Theo quý, sổ chi phí, quyết toán</td></tr>'
            '</tbody></table></div>'
            '<p>Năm 2026 và 2027, hộ có doanh thu không quá 10 tỷ đồng được <b>giảm 30% số thuế TNCN</b>. Đến 31/12/2026, hàng hoá, dịch vụ thuộc diện giảm thuế GTGT được giảm 20% tỷ lệ % tính thuế GTGT.</p>'
            f'<h2>Tỷ lệ theo ngành nghề</h2><div class="scroll"><table class="t"><thead><tr><th>Nhóm ngành (bấm để xem ví dụ)</th><th class="n">GTGT</th><th class="n">TNCN</th></tr></thead><tbody>{rows}</tbody></table></div>'
            '<div class="article"><h2>Câu hỏi thường gặp</h2>'
            '<details class="qa" open><summary>Doanh thu dưới 1 tỷ có phải làm gì không?</summary><p>Không nộp thuế GTGT, TNCN nhưng vẫn phải thông báo doanh thu thực tế với cơ quan thuế: hộ đang kinh doanh thông báo cả năm chậm nhất 31/01 năm sau; hộ mới ra kinh doanh thông báo 2 lần (31/7 và 31/01 năm sau). Không bắt buộc dùng hoá đơn điện tử.</p></details>'
            '<details class="qa"><summary>Thuế TNCN tính trên toàn bộ doanh thu hay phần vượt 1 tỷ?</summary><p>Khi tính theo tỷ lệ, thuế TNCN chỉ tính trên phần doanh thu vượt 1 tỷ đồng. Thuế GTGT thì tính trên toàn bộ doanh thu khi cả năm vượt 1 tỷ.</p></details>'
            '<details class="qa"><summary>Doanh thu vượt 1 tỷ giữa năm thì sao?</summary><p>Từ quý có doanh thu cộng dồn vượt 1 tỷ, hộ khai thuế theo quý và trong 30 ngày sau quý đó phải đăng ký dùng hoá đơn điện tử có mã hoặc khởi tạo từ máy tính tiền.</p></details>'
            '<details class="qa"><summary>Có còn nộp lệ phí môn bài không?</summary><p>Không. Lệ phí môn bài được bỏ từ 01/01/2026.</p></details></div>'
            f'<p class="note">{E(RULES)}</p>')
    meta = {"slug": HUB, "category": "tien-hoa-don", "cls": "article", "h1": "Thuế hộ kinh doanh 2026",
            "title": "Thuế hộ kinh doanh 2026: ngưỡng 1 tỷ, tỷ lệ theo ngành, cách tính, hạn nộp | Tính Giùm",
            "description": "Tổng hợp thuế hộ kinh doanh 2026 sau khi bỏ thuế khoán: doanh thu đến 1 tỷ không nộp thuế; tỷ lệ GTGT, TNCN theo ngành; cách tính trên phần vượt 1 tỷ hoặc trên thu nhập; giảm 30% TNCN; hạn kê khai."}
    return meta, body


def build_all(year: int = 2026) -> tuple[list[tuple[dict, str]], list[dict]]:
    data = load(year)
    pages = [hub_page(data)] + [sector_page(data, s) for s in SECTORS]
    listing = [{"slug": HUB, "h1": "Thuế hộ kinh doanh 2026", "category": "tien-hoa-don", "order": "50",
                "summary": "Ngưỡng 1 tỷ, tỷ lệ thuế theo ngành, hạn kê khai.",
                "keywords": "thuế hộ kinh doanh 2026, bỏ thuế khoán, hộ kinh doanh dưới 1 tỷ, tỷ lệ thuế hộ kinh doanh, thuế hộ kinh doanh theo ngành"}]
    return pages, listing
