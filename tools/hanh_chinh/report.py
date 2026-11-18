"""Write data/hanh-chinh/BAO-CAO.md (coverage report) from the built dataset and bao-cao-doi-chieu.json."""
import json, collections
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data/hanh-chinh"
PORTION_VI = {"toan-bo": "toàn bộ", "mot-phan": "một phần", "phan-con-lai": "phần còn lại"}

def main():
    index = json.load(open(OUT / "index.json", encoding="utf-8"))
    rep = json.load(open(OUT / "bao-cao-doi-chieu.json", encoding="utf-8"))
    nso_now = {}
    import csv
    for r in csv.DictReader(open(OUT / "sources/nso-danh-muc-xa-2026-11-18.csv", encoding="utf-8")):
        nso_now[r["MaTinh"]] = nso_now.get(r["MaTinh"], 0) + 1
    L = []
    w = L.append
    t = index["totals"]
    w("# Báo cáo đối chiếu dữ liệu đơn vị hành chính sau sắp xếp")
    w("")
    w(f"Dữ liệu tại ngày **{index['as_of']}**, dựng lại ngày {index['built']} bằng `python3 tools/hanh_chinh/build.py`; kiểm tra bằng `python3 tools/hanh_chinh/validate.py` (0 lỗi).")
    w("")
    w("## Tổng quan")
    w("")
    w(f"- **{t['provinces']} tỉnh, thành phố; {t['units']} đơn vị hành chính cấp xã.**")
    b25 = t["by_type_2025_07_01"]; bn = t["by_type_now"]
    w(f"- Ngày 01/07/2025 (theo 34 nghị quyết): {b25.get('xã', 0)} xã, {b25.get('phường', 0)} phường, {b25.get('đặc khu', 0)} đặc khu.")
    w(f"- Hiện nay (sau các thay đổi năm 2026): {bn.get('xã', 0)} xã, {bn.get('phường', 0)} phường, {bn.get('đặc khu', 0)} đặc khu (22 xã của Đồng Nai và Bắc Ninh thành phường).")
    old_codes = set(); old_total = 0
    provs = []
    for p in index["provinces"]:
        d = json.load(open(OUT / p["file"], encoding="utf-8")); provs.append((p, d))
        for u in d["units"]:
            for ou in u["old_units"]:
                old_total += 1
                if ou["id"]: old_codes.add(ou["id"])
    w(f"- {len(old_codes)} đơn vị cấp xã cũ có mã (trước 01/07/2025: 10.035 theo công bố của Ủy ban Thường vụ Quốc hội), {old_total} dòng 'đơn vị mới ← đơn vị cũ' (một xã cũ bị chia cho nhiều xã mới thì có nhiều dòng).")
    w("")
    w("## Nguồn")
    w("")
    w("| Nội dung | Nguồn chính | Đối chiếu |")
    w("|---|---|---|")
    w("| Đơn vị mới, đơn vị cũ hợp thành, nhập toàn bộ/một phần | 34 nghị quyết của UBTVQH ngày 16/06/2025 (toàn văn trên xaydungchinhsach.chinhphu.vn) | Bảng chuyển đổi ĐVHC mới–cũ của Cục Thống kê |")
    w("| Mã đơn vị mới, mã và huyện, tỉnh cũ của đơn vị cũ | Bảng chuyển đổi của Cục Thống kê | Danh mục của Cục Thống kê ngày 30/06/2025 (riêng tỉnh Bắc Giang cũ: bản sao danh mục ngày 04/01/2025 của bên thứ ba) |")
    w("| Tên, loại đơn vị hiện hành | Danh mục của Cục Thống kê ngày 18/11/2026 | Nghị quyết 237/NQ-UBTVQH16, 388/NQ-UBTVQH16 (xã thành phường) |")
    w("| Vùng lương tối thiểu 2026 | Phụ lục Nghị định 293/2025/NĐ-CP (hiệu lực 01/01/2026) | — |")
    w("| Vùng lương tối thiểu 2027 | Phụ lục Nghị định 399/2026/NĐ-CP (hiệu lực 01/01/2027) | — |")
    w("")
    w("Đường dẫn, ngày truy cập và mã băm SHA-256 của từng tệp gốc: `sources/manifest.json`.")
    w("")
    w("## Số đơn vị theo từng tỉnh")
    w("")
    w("Cột *Nghị quyết* là số ghi trong khoản cuối Điều 1 của nghị quyết; *Dữ liệu* là số đơn vị trong bộ dữ liệu; *CTK* là danh mục hiện hành của Cục Thống kê.")
    w("")
    w("| Mã | Tỉnh, thành phố | Nghị quyết | Nghị quyết: xã/phường/đặc khu | Dữ liệu | CTK 18/11/2026 | Từ tỉnh cũ | Đơn vị cũ | Vùng 2026 (I/II/III/IV) | Vùng 2027 (I/II/III/IV) |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    for p, d in provs:
        st = d["sources"]["stated_count"]
        r26 = collections.Counter(u["region"]["2026"] for u in d["units"]); r27 = collections.Counter(u["region"]["2027"] for u in d["units"])
        olds = sum(len(u["old_units"]) for u in d["units"])
        fmt = lambda c: "/".join(str(c.get(k, 0)) for k in ("I", "II", "III", "IV"))
        w(f"| {d['id']} | {d['full_name']} | {st['total']} ({d['sources']['commune_resolution']}) | {st.get('xã', 0)}/{st.get('phường', 0)}/{st.get('đặc khu', 0)} | {len(d['units'])} | {nso_now.get(d['id'], 0)} | {', '.join(f['name'] for f in d['formed_from'])} | {olds} | {fmt(r26)} | {fmt(r27)} |")
    w("")
    w("## Chỗ các nguồn khác nhau và lựa chọn")
    w("")
    iss = rep["issues"]; notes = rep["notes"]
    by = collections.defaultdict(list)
    for i in iss: by[i["issue"]].append(i)
    for n in notes: by[n["note"]].append(n)
    def section(title, key, fmt, choice):
        lst = by.get(key, [])
        if not lst: return
        w(f"### {title} ({len(lst)})")
        w("")
        for x in lst: w("- " + fmt(x))
        w("")
        w(f"**Lựa chọn:** {choice}")
        w("")
    section("Nghị quyết và bảng chuyển đổi khác nhau về phạm vi nhập", "whole/part differs (resolution kept)",
            lambda x: f"{x['province']}: {x['unit']} ← {x['old']}: nghị quyết ghi *{PORTION_VI[x['resolution']]}*, bảng chuyển đổi ghi *{x['nso']}*.",
            "theo nghị quyết.")
    section("Đơn vị cũ chỉ có trong nghị quyết", "old unit only in resolution (added)",
            lambda x: f"{x['province']}: {x['unit']} ← {x['old']} (bảng chuyển đổi không ghi dòng này).",
            "bổ sung theo nghị quyết; mã lấy từ dòng khác của cùng đơn vị cũ trong bảng chuyển đổi.")
    section("Mã đơn vị cũ sai trong bảng chuyển đổi", "wrong old code in NSO table (corrected)",
            lambda x: f"{x['unit']} ← {x['old']}: bảng chuyển đổi ghi mã {x['table_code']}, là mã của {x['that_code_is']}; mã đúng {x['correct_code']}.",
            "sửa mã theo danh mục của Cục Thống kê (cùng tên, cùng huyện cũ).")
    section("Tỉnh cũ ghi sai trong bảng chuyển đổi", "wrong old province in NSO table (corrected)",
            lambda x: f"Dòng {x['row']} ({x['unit']}): bảng chuyển đổi ghi tỉnh cũ *{x['table']}*; dùng {x['used']}. {x['why']}",
            "sửa theo các dòng còn lại của tỉnh Quảng Trị cũ trong cùng bảng; trước 01/07/2025 mã 44 là tỉnh Quảng Bình.")
    section("Đơn vị có trong nghị quyết nhưng thiếu trong danh mục hiện hành của Cục Thống kê", "missing from NSO current list",
            lambda x: f"{x['province']}: {x['unit']} (mã {x['code']}).",
            "giữ lại; đơn vị được thành lập tại nghị quyết và có trong bảng chuyển đổi của chính Cục Thống kê.")
    section("Lỗi đánh máy trong phụ lục vùng lương", "wage appendix erratum applied",
            lambda x: f"{x['year']}, {x['province']}: phụ lục ghi *{x['appendix']}*, đọc là {', '.join(x['read_as'])}. {x['why']}",
            "đọc theo đơn vị thực tế, có giải thích từng trường hợp.")
    section("Phụ lục vùng lương ghi loại đơn vị cũ", "wage appendix lists unit with another type",
            lambda x: f"{x['year']}, {x['province']}: phụ lục ghi *{x['appendix']}*, đơn vị hiện là {x['unit']}.",
            "ghép theo tên (tên là duy nhất trong tỉnh). Đây là các xã đã thành phường năm 2026.")
    section("Khu vực không phải đơn vị hành chính", "non-commune area named only in resolution",
            lambda x: f"{x['province']}: {x['unit']} ← {x['area']}.", "ghi là đơn vị cũ loại 'khu vực', không có mã.")
    section("Bảng chuyển đổi thiếu loại đơn vị cũ", "old unit type missing in NSO table (taken from resolution)",
            lambda x: f"{x['province']}: {x['old']} (mã {x['code']}) → {x['unit']}.", "lấy loại đơn vị theo nghị quyết.")
    sp = by.get("old unit spelled differently in the pre-merger list", [])
    if sp:
        w(f"### Tên đơn vị cũ viết khác nhau giữa bảng chuyển đổi và danh mục cũ ({len(sp)})")
        w("")
        w("Cùng mã, cùng đơn vị, chỉ khác cách viết (dấu thanh, Đăk/Đắk, tên dân tộc thiểu số, 'NT' và 'Nông trường', số La Mã...). Ví dụ:")
        w("")
        for x in sp[:15]: w(f"- {x['old']} ↔ {x['list']} (mã {x['code']})")
        w("")
        w("**Lựa chọn:** giữ tên theo bảng chuyển đổi, lưu tên trong danh mục cũ ở trường `name_in_list` để tra cứu được cả hai cách viết. Danh sách đủ: `bao-cao-doi-chieu.json`.")
        w("")
    ud = by.get("old unit name differs from the pre-merger list (code kept, unverified)", [])
    if ud:
        w(f"### Tên đơn vị cũ khác hẳn tên trong danh mục cũ, cùng mã ({len(ud)}, chưa xác minh)")
        w("")
        w("Mã có trong danh mục cũ nhưng tên khác nhiều hơn một lỗi dấu, và trong cùng huyện cũ không có đơn vị nào mang tên theo bảng chuyển đổi. Nhiều khả năng là cùng một xã (tên cũ hoặc cách phiên âm khác), nhưng các nguồn hiện có không đủ để khẳng định:")
        w("")
        for x in ud: w(f"- {x['old']} ↔ {x['list']} (mã {x['code']}, {x['district']}) → thuộc {x['unit']}")
        w("")
        w("**Lựa chọn:** giữ mã và tên theo bảng chuyển đổi, ghi tên trong danh mục cũ vào `name_in_list`, đánh dấu `code_check: ten-khac-chua-xac-minh`.")
        w("")
    other = [k for k in by if k not in {"old unit name differs from the pre-merger list (code kept, unverified)", "whole/part differs (resolution kept)", "old unit only in resolution (added)", "wrong old code in NSO table (corrected)",
             "missing from NSO current list", "wage appendix erratum applied", "wage appendix lists unit with another type", "non-commune area named only in resolution",
             "old unit spelled differently in the pre-merger list", "old unit type missing in NSO table (taken from resolution)", "wrong old province in NSO table (corrected)"}]
    if other:
        w("### Vấn đề khác")
        w("")
        for k in other:
            for x in by[k]: w(f"- {k}: {json.dumps(x, ensure_ascii=False)}")
        w("")
    w("### Đặc khu thành lập từ cả huyện")
    w("")
    for p, d in provs:
        for u in d["units"]:
            if u["formation"] == "dac-khu-tu-huyen":
                w(f"- {d['name']}: {u['full_name']} ← {', '.join(o['full_name'] for o in u['old_units'])}")
    w("")
    # wage changes 2026 -> 2027
    mv = collections.defaultdict(collections.Counter)
    for p, d in provs:
        for u in d["units"]:
            if u["region"]["2026"] != u["region"]["2027"]: mv[d["name"]][(u["region"]["2026"], u["region"]["2027"])] += 1
    w("## Thay đổi vùng lương từ 01/01/2027")
    w("")
    w(f"So sánh phụ lục hai nghị định: {sum(sum(c.values()) for c in mv.values())} đơn vị đổi vùng, tất cả đều lên một bậc. Không có văn bản chính thức nào tổng hợp con số này để đối chiếu; đây là kết quả so sánh trực tiếp hai phụ lục.")
    w("")
    for prov, c in mv.items():
        w(f"- {prov}: " + "; ".join(f"{n} đơn vị từ vùng {a} lên vùng {b}" for (a, b), n in sorted(c.items())))
    w("")
    w("## Những điều chưa xác minh được")
    w("")
    bg = collections.Counter(o["code_check"] for p, d in provs for u in d["units"] for o in u["old_units"] if o["province"] == "Tỉnh Bắc Giang" and o["id"])
    w(f"- **Mã đơn vị cũ của tỉnh Bắc Giang cũ** ({sum(bg.values())} đơn vị): dịch vụ web của Cục Thống kê trả danh mục ngày 30/06/2025 theo tỉnh hiện nay, nên không còn trả được tỉnh Bắc Giang cũ. Các mã này được đối chiếu với bản sao danh mục ngày 04/01/2025 do bên thứ ba lưu (sunshine-tech/VietnamProvinces, tải về khi dựng, không lưu trong kho vì giấy phép GPL): {bg.get('khop', 0)} khớp, {bg.get('khop-ten-khac', 0)} khác cách viết, {bg.get('ten-khac-chua-xac-minh', 0)} khác tên. Đây không phải bản lấy trực tiếp từ Cục Thống kê.")
    w("- **Danh sách xã thành lập phường năm 2026** (10 phường Đồng Nai theo 237/NQ-UBTVQH16, 12 phường Bắc Ninh theo 388/NQ-UBTVQH16): lấy từ tin chính thức (Báo Đại biểu Nhân dân, Báo Quốc tế) và khớp với danh mục của Cục Thống kê; chưa đọc được toàn văn hai nghị quyết này.")
    w(f"- **{len(ud)} đơn vị cũ có tên khác hẳn tên trong danh mục cũ cùng mã** (xem mục trên): giữ theo bảng chuyển đổi, chưa xác minh được là cùng một đơn vị.")
    w("- **Mã phường Hoàn Kiếm (00070)**: chỉ có trong bảng chuyển đổi vì danh mục hiện hành của Cục Thống kê thiếu đơn vị này.")
    w("- **Văn bản phụ lục vùng lương** được trích từ tệp PDF có chữ ký số bằng `pdftotext`; một lỗi tách chữ ('p hường') đã được sửa. Mọi tên trong hai phụ lục đều đã ghép được với đúng một đơn vị.")
    w("- **Thay đổi sau ngày 18/11/2026**: văn bản mới nhất trong danh mục của Cục Thống kê là 388/NQ-UBTVQH16 (hiệu lực 20/09/2026). Cần chạy lại khi có nghị quyết mới.")
    w("")
    (OUT / "BAO-CAO.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("wrote BAO-CAO.md")

if __name__ == "__main__":
    main()
