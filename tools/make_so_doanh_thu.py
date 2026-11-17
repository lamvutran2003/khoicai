"""Tạo file Excel "Sổ doanh thu hộ kinh doanh" cho trang /so-doanh-thu-ho-kinh-doanh/.

    python3 tools/make_so_doanh_thu.py   ->  site/static/files/so-doanh-thu-ho-kinh-doanh.xlsx

Ghi doanh thu hằng ngày theo 4 nhóm ngành, tự cộng theo tháng, quý, cả năm; báo khi vượt ngưỡng 1 tỷ đồng và ước tính
thuế GTGT, TNCN theo tỷ lệ (Nghị định 68/2026/NĐ-CP sửa đổi bởi Nghị định 141/2026/NĐ-CP). Chỉ để tham khảo.
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent.parent / "site/static/files/so-doanh-thu-ho-kinh-doanh.xlsx"
ROWS = 1000
NAVY, GREY, LIGHT = "0B3D6E", "F3F3F3", "EEF3F9"
GROUPS = [("Bán hàng hoá", 0.01, 0.005), ("Dịch vụ", 0.05, 0.02), ("Sản xuất, vận tải, ăn uống", 0.03, 0.015), ("Kinh doanh khác", 0.02, 0.01)]
MONEY = "#,##0"
thin = Side(style="thin", color="CCCCCC")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)


def head(ws, row, values, widths=None):
    for i, v in enumerate(values, 1):
        c = ws.cell(row=row, column=i, value=v)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=NAVY)
        c.alignment = Alignment(wrap_text=True, vertical="center")
        c.border = BOX
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[chr(64 + i)].width = w


def main() -> None:
    wb = Workbook()

    # Hướng dẫn
    ws = wb.active
    ws.title = "Hướng dẫn"
    ws.column_dimensions["A"].width = 110
    lines = [
        ("SỔ DOANH THU HỘ KINH DOANH", True),
        ("Mẫu tham khảo do tinhgium.vn soạn, dựa theo nội dung sổ doanh thu bán hàng hoá, dịch vụ (S2a-HKD).", False),
        ("", False),
        ("1. Nhập năm ở ô B1 của trang 'Tổng hợp'.", False),
        ("2. Trang 'Doanh thu': mỗi dòng một khoản thu (hoặc tổng thu trong ngày), ghi số tiền vào cột đúng nhóm ngành. Cột 'Cộng' tự tính.", False),
        ("3. Trang 'Chi phí' (không bắt buộc): ghi chi phí có hoá đơn, chứng từ nếu muốn tính thuế TNCN trên thu nhập.", False),
        ("4. Trang 'Tổng hợp' tự cộng theo tháng, quý, cả năm, báo khi doanh thu vượt 1 tỷ đồng và ước tính thuế theo tỷ lệ.", False),
        ("", False),
        ("Quy tắc chính từ năm 2026:", True),
        ("• Doanh thu cả năm đến 1 tỷ đồng: không nộp thuế GTGT, TNCN; vẫn thông báo doanh thu (hạn 31/01 năm sau).", False),
        ("• Trên 1 tỷ: GTGT = toàn bộ doanh thu × tỷ lệ ngành; TNCN = phần vượt 1 tỷ × tỷ lệ ngành (hoặc thu nhập × 15%); khai thuế theo quý; dùng hoá đơn điện tử.", False),
        ("• Tỷ lệ GTGT / TNCN: hàng hoá 1% / 0,5%; dịch vụ 5% / 2%; sản xuất, vận tải, ăn uống 3% / 1,5%; khác 2% / 1%.", False),
        ("• Năm 2026, 2027: giảm 30% thuế TNCN nếu doanh thu không quá 10 tỷ đồng.", False),
        ("", False),
        ("Số thuế trong sổ chỉ là ước tính để tham khảo. Tính chi tiết: https://tinhgium.vn/tinh-thue-ho-kinh-doanh/", False),
    ]
    for i, (t, b) in enumerate(lines, 1):
        c = ws.cell(row=i, column=1, value=t)
        c.font = Font(bold=b, size=14 if i == 1 else 11, color=NAVY if b else "111111")
        c.alignment = Alignment(wrap_text=True)

    # Doanh thu
    d = wb.create_sheet("Doanh thu")
    head(d, 1, ["Ngày", "Số hoá đơn / chứng từ", "Diễn giải"] + [g[0] for g in GROUPS] + ["Cộng"], [12, 18, 34, 16, 16, 18, 16, 16])
    d.row_dimensions[1].height = 34
    for r in range(2, ROWS + 2):
        d.cell(row=r, column=1).number_format = "dd/mm/yyyy"
        for col in range(4, 9):
            d.cell(row=r, column=col).number_format = MONEY
        d.cell(row=r, column=8, value=f'=IF(SUM(D{r}:G{r})=0,"",SUM(D{r}:G{r}))')
        d.cell(row=r, column=8).fill = PatternFill("solid", fgColor=GREY)
    d.freeze_panes = "A2"
    dv = DataValidation(type="date", operator="greaterThan", formula1="DATE(2000,1,1)", showErrorMessage=True,
                        errorTitle="Ngày không hợp lệ", error="Nhập ngày dạng dd/mm/yyyy")
    d.add_data_validation(dv)
    dv.add(f"A2:A{ROWS + 1}")

    # Chi phí
    c = wb.create_sheet("Chi phí")
    head(c, 1, ["Ngày", "Số hoá đơn / chứng từ", "Nội dung chi", "Số tiền"], [12, 18, 44, 16])
    for r in range(2, ROWS + 2):
        c.cell(row=r, column=1).number_format = "dd/mm/yyyy"
        c.cell(row=r, column=4).number_format = MONEY
    c.freeze_panes = "A2"

    # Tổng hợp
    t = wb.create_sheet("Tổng hợp")
    t.column_dimensions["A"].width = 38
    for col in "BCDEFG":
        t.column_dimensions[col].width = 17
    t["A1"], t["B1"] = "Năm", 2026
    t["A1"].font = Font(bold=True)
    t["B1"].fill = PatternFill("solid", fgColor="FFF4CC")
    rng = f"'Doanh thu'!$A$2:$A${ROWS + 1}"
    head_row = 3
    labels = ["Tháng"] + [g[0] for g in GROUPS] + ["Cộng"]
    for i, v in enumerate(labels, 1):
        cell = t.cell(row=head_row, column=i, value=v)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor=NAVY)
        cell.alignment = Alignment(wrap_text=True)
    t.row_dimensions[head_row].height = 32
    cols = "DEFG"
    for m in range(1, 13):
        r = head_row + m
        t.cell(row=r, column=1, value=f"Tháng {m}")
        for j, col in enumerate(cols):
            src = f"'Doanh thu'!${col}$2:${col}${ROWS + 1}"
            t.cell(row=r, column=2 + j, value=f"=SUMPRODUCT((YEAR({rng})=$B$1)*(MONTH({rng})={m})*{src})").number_format = MONEY
        t.cell(row=r, column=6, value=f"=SUM(B{r}:E{r})").number_format = MONEY
    first, last = head_row + 1, head_row + 12
    r = last + 1
    t.cell(row=r, column=1, value="Cả năm").font = Font(bold=True)
    for j in range(2, 7):
        col = chr(64 + j)
        t.cell(row=r, column=j, value=f"=SUM({col}{first}:{col}{last})").number_format = MONEY
        t.cell(row=r, column=j).font = Font(bold=True)
    year_row = r

    r += 2
    t.cell(row=r, column=1, value="Theo quý").font = Font(bold=True)
    for q in range(1, 5):
        rr = r + q
        t.cell(row=rr, column=1, value=f"Quý {q}")
        a, b = first + 3 * (q - 1), first + 3 * q - 1
        t.cell(row=rr, column=2, value=f"=SUM(F{a}:F{b})").number_format = MONEY
        t.cell(row=rr, column=3, value=f"=SUM(F{first}:F{b})").number_format = MONEY
    t.cell(row=r, column=2, value="Doanh thu quý").font = Font(bold=True)
    t.cell(row=r, column=3, value="Cộng dồn").font = Font(bold=True)

    r += 6
    tot = f"F{year_row}"
    rows = [
        ("Tổng doanh thu cả năm", f"={tot}"),
        ("Tình trạng", f'=IF({tot}>1000000000,"Vượt 1 tỷ: khai thuế theo quý, dùng hoá đơn điện tử","Chưa vượt 1 tỷ: không nộp GTGT, TNCN; thông báo doanh thu")'),
        ("Thuế GTGT ước tính", f"=IF({tot}>1000000000," + "+".join(f"{'BCDE'[j]}{year_row}*{g[1]}" for j, g in enumerate(GROUPS)) + ",0)"),
        ("Thuế TNCN theo tỷ lệ (trước giảm)", f"=IF({tot}>1000000000,({tot}-1000000000)*(" + "+".join(f"{'BCDE'[j]}{year_row}*{g[2]}" for j, g in enumerate(GROUPS)) + f")/{tot},0)"),
        ("Giảm 30% TNCN (năm 2026, 2027, doanh thu ≤ 10 tỷ)", f"=IF(AND(OR($B$1=2026,$B$1=2027),{tot}<=10000000000),-ROUND(B{r + 3}*0.3,0),0)"),
        ("Tổng thuế ước tính", f"=ROUND(B{r + 2}+B{r + 3}+B{r + 4},0)"),
        ("Tổng chi phí đã ghi", f"=SUMPRODUCT((YEAR('Chi phí'!$A$2:$A${ROWS + 1})=$B$1)*'Chi phí'!$D$2:$D${ROWS + 1})"),
    ]
    for i, (label, f) in enumerate(rows):
        t.cell(row=r + i, column=1, value=label).font = Font(bold=i in (1, 5))
        cell = t.cell(row=r + i, column=2, value=f)
        cell.number_format = MONEY
        cell.font = Font(bold=i in (1, 5))
        cell.fill = PatternFill("solid", fgColor=LIGHT)
    t.cell(row=r + len(rows) + 1, column=1,
           value="Ước tính khi tính thuế TNCN theo tỷ lệ trên doanh thu; ngành hỗn hợp chia phần vượt 1 tỷ theo tỷ trọng doanh thu từng nhóm.").font = Font(italic=True, color="555555")
    wb.move_sheet("Tổng hợp", offset=-2)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print("saved", OUT)


if __name__ == "__main__":
    main()
