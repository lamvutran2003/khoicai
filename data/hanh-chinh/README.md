# Đơn vị hành chính sau sắp xếp 2025 và vùng lương tối thiểu

Bộ dữ liệu cho tính năng tra cứu "sau sáp nhập": 34 tỉnh, thành phố; 3.321 đơn vị cấp xã (xã, phường, đặc khu) có hiệu lực từ 01/07/2025, cập nhật các thay đổi năm 2026; các đơn vị cũ hợp thành mỗi đơn vị mới; vùng lương tối thiểu năm 2026 và 2027.

Báo cáo đối chiếu (số đơn vị từng tỉnh, chỗ các nguồn khác nhau, điều chưa xác minh): [BAO-CAO.md](BAO-CAO.md).

## Tệp

| Tệp | Nội dung |
|---|---|
| `index.json` | Mức lương theo vùng, tổng số, danh sách 34 tỉnh (trỏ tới tệp từng tỉnh) |
| `tinh/{mã}-{slug}.json` | Một tỉnh: nguồn trích dẫn, số đơn vị theo nghị quyết, danh sách đơn vị |
| `bao-cao-doi-chieu.json` | Mọi điểm khác nhau giữa các nguồn, dạng máy đọc được (`issues`, `notes`) |
| `BAO-CAO.md` | Báo cáo đối chiếu, sinh tự động từ dữ liệu |
| `sources/` | Bản lưu các nguồn chính thức (xem `sources/manifest.json`: đường dẫn, ngày lấy, SHA-256 tệp gốc) |

Không sửa tay các tệp trong `index.json`, `tinh/`, `bao-cao-doi-chieu.json`, `BAO-CAO.md`: chúng được sinh lại từ `sources/`.

## Dựng lại và kiểm tra

```
python3 tools/hanh_chinh/build.py      # sources/ -> index.json, tinh/*.json, bao-cao-doi-chieu.json, BAO-CAO.md
python3 tools/hanh_chinh/validate.py   # thoát với mã 1 nếu có lỗi
node --test tests/hanh-chinh.test.js
python3 tools/hanh_chinh/export_web.py   # -> site/static/js/dia-chi-data.js cho trang tra cứu (chạy lại sau mỗi lần dựng dữ liệu)
```

`build.py` dừng hẳn (không bỏ qua) khi gặp một mục không đọc được trong nghị quyết hoặc phụ lục nghị định. Mọi chỉnh sửa so với nguồn đều được liệt kê có lý do trong mã (`WAGE_ERRATA`, sửa mã đơn vị cũ, sửa tỉnh cũ) và trong báo cáo.

## Nguồn

| Dữ liệu | Nguồn |
|---|---|
| Đơn vị mới, đơn vị cũ hợp thành, nhập toàn bộ hay một phần, số đơn vị mỗi tỉnh | 34 nghị quyết 1654–1687/NQ-UBTVQH15 ngày 16/06/2025 (toàn văn trên xaydungchinhsach.chinhphu.vn), Điều 1 |
| Tỉnh mới | Nghị quyết 202/2025/QH15 ngày 12/06/2025 |
| Mã đơn vị cũ, huyện cũ, tỉnh cũ | Bảng chuyển đổi mới - cũ của Cục Thống kê (danhmuchanhchinh.nso.gov.vn) |
| Mã, tên, loại đơn vị hiện hành | Danh mục của Cục Thống kê ngày 18/11/2026 |
| Kiểm tra mã đơn vị cũ | Danh mục của Cục Thống kê ngày 30/06/2025; riêng tỉnh Bắc Giang cũ (dịch vụ không còn trả), bản sao danh mục 04/01/2025 của sunshine-tech/VietnamProvinces. Bản sao này theo giấy phép GPL nên không lưu trong kho: `build.py` tải về theo commit cố định vào `.cache/` (đã bỏ qua trong git) và kiểm tra SHA-256 |
| Thay đổi năm 2026 | 30/2026/QH16 (thành phố Đồng Nai), 237/NQ-UBTVQH16 (10 phường Đồng Nai), 36/2026/QH16 (thành phố Quảng Ninh), 39/2026/QH16 (thành phố Bắc Ninh), 388/NQ-UBTVQH16 (12 phường Bắc Ninh) |
| Vùng lương 2026 | Nghị định 293/2025/NĐ-CP ngày 10/11/2025, hiệu lực 01/01/2026, Phụ lục |
| Vùng lương 2027 | Nghị định 399/2026/NĐ-CP ngày 02/11/2026, hiệu lực 01/01/2027 (thay thế 293/2025/NĐ-CP), Phụ lục |

Khi nghị quyết và bảng chuyển đổi khác nhau, dữ liệu theo nghị quyết. Mỗi tệp tỉnh có `sources.citations` liệt kê từng văn bản đã dùng cho tỉnh đó kèm đường dẫn và bản lưu.

## `index.json`

```jsonc
{
  "schema_version": 1,
  "as_of": "2026-11-18",              // dữ liệu đúng đến ngày này
  "wage": {
    "2026": { "decree": "293/2025/NĐ-CP", "effective": "2026-01-01", "until": "2026-12-31",
              "monthly": { "I": 5310000, ... }, "hourly": { "I": 25500, ... } },   // đồng
    "2027": { "decree": "399/2026/NĐ-CP", "effective": "2027-01-01", ... }
  },
  "totals": { "provinces": 34, "units": 3321,
              "by_type_now": {...}, "by_type_2025_07_01": {...} },
  "provinces": [
    { "id": "01", "name": "Hà Nội", "full_name": "Thành phố Hà Nội", "slug": "ha-noi",
      "file": "tinh/01-ha-noi.json", "units": 126, "by_type": {...},
      "formed_from": ["Thành phố Hà Nội"], "commune_resolution": "1656/NQ-UBTVQH15" }
  ]
}
```

## Tệp tỉnh `tinh/{mã}-{slug}.json`

```jsonc
{
  "id": "24", "name": "Bắc Ninh", "full_name": "Thành phố Bắc Ninh", "type": "thành phố", "slug": "bac-ninh",
  "formed_from": [ { "id": "24", "name": "Tỉnh Bắc Giang" }, { "id": "27", "name": "Tỉnh Bắc Ninh" } ],
  "sources": {
    "province_resolution": "202/2025/QH15",
    "commune_resolution": "1658/NQ-UBTVQH15", "commune_resolution_date": "2025-06-16", "effective": "2025-07-01",
    "stated_count": { "total": 99, "xã": 66, "phường": 33 },   // số ghi trong nghị quyết
    "became_city": { "resolution": "39/2026/QH16", "effective": "2026-09-20" },   // nếu có
    "citations": [ { "what": "...", "document": "1658/NQ-UBTVQH15", "issued": "2025-06-16", "effective": "2025-07-01",
                     "url": "https://...", "copy": "sources/nghi-quyet/1658-NQ-UBTVQH15.txt" } ]
  },
  "units": [ ... ]
}
```

### Đơn vị mới (`units[]`)

| Trường | Ý nghĩa |
|---|---|
| `id` | Mã đơn vị hiện hành (5 chữ số, của Cục Thống kê). Duy nhất toàn quốc. |
| `name`, `type`, `full_name` | Tên, loại (`xã` / `phường` / `đặc khu`), tên đầy đủ hiện nay |
| `slug` | Duy nhất trong tỉnh, dạng `phuong-bo-ha`; trùng tên thì thêm mã |
| `formation` | `sap-xep` (lập từ sắp xếp), `giu-nguyen` (không sắp xếp), `doi-ten`, `dac-khu-tu-huyen` (đặc khu lập từ cả một huyện) |
| `source` | `{ "resolution": "1658/NQ-UBTVQH15", "clause": 52 }` (khoản trong Điều 1) hoặc `{ "unchanged": true }` |
| `type_changes` | Đổi loại sau 01/07/2025, ví dụ `[{ "from": "xã", "to": "phường", "resolution": "388/NQ-UBTVQH16", "effective": "2026-09-20" }]` |
| `name_2025` | Tên đầy đủ ngày 01/07/2025 nếu khác hiện nay (ví dụ `Xã Bố Hạ`), không thì `null` |
| `region` | Vùng lương theo năm: `{ "2026": "IV", "2027": "IV" }` |
| `old_units` | Các đơn vị cũ hợp thành (ít nhất một) |
| `flags` | Ghi chú tiếng Việt khi các nguồn khác nhau ở đơn vị này |

### Đơn vị cũ (`units[].old_units[]`)

| Trường | Ý nghĩa |
|---|---|
| `id` | Mã đơn vị cũ (trước 01/07/2025). `null` với huyện (đặc khu lập từ cả huyện) và khu vực không phải đơn vị hành chính |
| `name`, `type`, `full_name` | Tên và loại cũ: `xã`, `phường`, `thị trấn`, `huyện`, `khu vực` |
| `district`, `district_id` | Quận, huyện, thị xã, thành phố cũ |
| `province`, `province_id` | Tỉnh cũ (mã cũ, trước 01/07/2025) |
| `portion` | `toan-bo` (toàn bộ diện tích và dân số), `mot-phan` (một phần; kể cả "toàn bộ diện tích" mà không kèm dân số), `phan-con-lai` (phần còn lại sau khi đã tách một phần sang đơn vị khác) |
| `split` | `true` nếu đơn vị cũ này được chia cho nhiều đơn vị mới |
| `also_in` | Mã các đơn vị mới khác cũng nhận một phần đơn vị cũ này |
| `source` | `nghi-quyet+nso` (cả hai nguồn), `nghi-quyet` (chỉ nghị quyết nêu), `nso` (chỉ bảng chuyển đổi) |
| `nso_note` | Cột ghi chú nguyên văn của bảng chuyển đổi |
| `code_check` | Kiểm tra mã với danh mục cũ: `khop` (khớp), `khop-ten-khac` (cùng đơn vị, khác cách viết), `ten-khac-chua-xac-minh` (cùng mã nhưng tên khác hẳn, chưa xác minh), `da-sua-ma` (mã trong bảng chuyển đổi sai, đã sửa theo danh mục cũ), `khong-tim-thay` / `chua-xac-minh` (không kiểm tra được; hiện không có trường hợp nào), `null` (không có mã) |
| `name_in_list` | Tên trong danh mục cũ khi khác tên trong bảng chuyển đổi |

### Quy tắc nhất quán (được `validate.py` và test kiểm tra)

- Mã đơn vị mới không trùng; slug không trùng trong tỉnh.
- Số đơn vị mỗi tỉnh, theo từng loại tại ngày 01/07/2025, bằng số ghi trong nghị quyết; tổng toàn quốc 3.321 (2.621 xã, 687 phường, 13 đặc khu).
- Mỗi đơn vị mới có ít nhất một đơn vị cũ và có vùng lương cho mọi năm trong `index.json`.
- Một đơn vị cũ nhập `toan-bo` chỉ xuất hiện ở đúng một đơn vị mới. Một đơn vị cũ bị chia xuất hiện ở mọi đơn vị mới nhận phần của nó, mỗi lần đều có `split: true` và `also_in` liệt kê đủ các đơn vị còn lại.
- Mỗi tỉnh có trích dẫn kèm đường dẫn cho nghị quyết sắp xếp cấp xã của tỉnh đó.
