# Báo cáo đối chiếu dữ liệu đơn vị hành chính sau sắp xếp

Dữ liệu tại ngày **2026-11-18**, dựng lại ngày 2026-11-18 bằng `python3 tools/hanh_chinh/build.py`; kiểm tra bằng `python3 tools/hanh_chinh/validate.py` (0 lỗi).

## Tổng quan

- **34 tỉnh, thành phố; 3321 đơn vị hành chính cấp xã.**
- Ngày 01/07/2025 (theo 34 nghị quyết): 2621 xã, 687 phường, 13 đặc khu.
- Hiện nay (sau các thay đổi năm 2026): 2599 xã, 709 phường, 13 đặc khu (22 xã của Đồng Nai và Bắc Ninh thành phường).
- 10035 đơn vị cấp xã cũ có mã (trước 01/07/2025: 10.035 theo công bố của Ủy ban Thường vụ Quốc hội), 10574 dòng 'đơn vị mới ← đơn vị cũ' (một xã cũ bị chia cho nhiều xã mới thì có nhiều dòng).

## Nguồn

| Nội dung | Nguồn chính | Đối chiếu |
|---|---|---|
| Đơn vị mới, đơn vị cũ hợp thành, nhập toàn bộ/một phần | 34 nghị quyết của UBTVQH ngày 16/06/2025 (toàn văn trên xaydungchinhsach.chinhphu.vn) | Bảng chuyển đổi ĐVHC mới–cũ của Cục Thống kê |
| Mã đơn vị mới, mã và huyện, tỉnh cũ của đơn vị cũ | Bảng chuyển đổi của Cục Thống kê | Danh mục của Cục Thống kê ngày 30/06/2025 (riêng tỉnh Bắc Giang cũ: bản sao danh mục ngày 04/01/2025 của bên thứ ba) |
| Tên, loại đơn vị hiện hành | Danh mục của Cục Thống kê ngày 18/11/2026 | Nghị quyết 237/NQ-UBTVQH16, 388/NQ-UBTVQH16 (xã thành phường) |
| Vùng lương tối thiểu 2026 | Phụ lục Nghị định 293/2025/NĐ-CP (hiệu lực 01/01/2026) | — |
| Vùng lương tối thiểu 2027 | Phụ lục Nghị định 399/2026/NĐ-CP (hiệu lực 01/01/2027) | — |

Đường dẫn, ngày truy cập và mã băm SHA-256 của từng tệp gốc: `sources/manifest.json`.

## Số đơn vị theo từng tỉnh

Cột *Nghị quyết* là số ghi trong khoản cuối Điều 1 của nghị quyết; *Dữ liệu* là số đơn vị trong bộ dữ liệu; *CTK* là danh mục hiện hành của Cục Thống kê.

| Mã | Tỉnh, thành phố | Nghị quyết | Nghị quyết: xã/phường/đặc khu | Dữ liệu | CTK 18/11/2026 | Từ tỉnh cũ | Đơn vị cũ | Vùng 2026 (I/II/III/IV) | Vùng 2027 (I/II/III/IV) |
|---|---|---|---|---|---|---|---|---|---|
| 01 | Thành phố Hà Nội | 126 (1656/NQ-UBTVQH15) | 75/51/0 | 126 | 125 | Thành phố Hà Nội | 795 | 104/22/0/0 | 104/22/0/0 |
| 04 | Tỉnh Cao Bằng | 56 (1657/NQ-UBTVQH15) | 53/3/0 | 56 | 56 | Tỉnh Cao Bằng | 161 | 0/0/3/53 | 0/0/3/53 |
| 08 | Tỉnh Tuyên Quang | 124 (1684/NQ-UBTVQH15) | 117/7/0 | 124 | 124 | Tỉnh Hà Giang, Tỉnh Tuyên Quang | 335 | 0/0/8/116 | 0/0/8/116 |
| 11 | Tỉnh Điện Biên | 45 (1661/NQ-UBTVQH15) | 42/3/0 | 45 | 45 | Tỉnh Điện Biên | 129 | 0/0/4/41 | 0/0/4/41 |
| 12 | Tỉnh Lai Châu | 38 (1670/NQ-UBTVQH15) | 36/2/0 | 38 | 38 | Tỉnh Lai Châu | 106 | 0/0/2/36 | 0/0/2/36 |
| 14 | Tỉnh Sơn La | 75 (1681/NQ-UBTVQH15) | 67/8/0 | 75 | 75 | Tỉnh Sơn La | 200 | 0/0/4/71 | 0/0/4/71 |
| 15 | Tỉnh Lào Cai | 99 (1673/NQ-UBTVQH15) | 89/10/0 | 99 | 99 | Tỉnh Lào Cai, Tỉnh Yên Bái | 319 | 0/5/14/80 | 0/5/14/80 |
| 19 | Tỉnh Thái Nguyên | 92 (1683/NQ-UBTVQH15) | 77/15/0 | 92 | 92 | Tỉnh Bắc Kạn, Tỉnh Thái Nguyên | 283 | 0/16/27/49 | 0/16/27/49 |
| 20 | Tỉnh Lạng Sơn | 65 (1672/NQ-UBTVQH15) | 61/4/0 | 65 | 65 | Tỉnh Lạng Sơn | 196 | 0/0/4/61 | 0/0/4/61 |
| 22 | Thành phố Quảng Ninh | 54 (1679/NQ-UBTVQH15) | 22/30/2 | 54 | 54 | Tỉnh Quảng Ninh | 184 | 31/5/11/7 | 36/7/11/0 |
| 24 | Thành phố Bắc Ninh | 99 (1658/NQ-UBTVQH15) | 66/33/0 | 99 | 99 | Tỉnh Bắc Giang, Tỉnh Bắc Ninh | 314 | 0/53/14/32 | 0/53/14/32 |
| 25 | Tỉnh Phú Thọ | 148 (1676/NQ-UBTVQH15) | 133/15/0 | 148 | 148 | Tỉnh Hoà Bình, Tỉnh Phú Thọ, Tỉnh Vĩnh Phúc | 482 | 0/26/45/77 | 0/26/45/77 |
| 31 | Thành phố Hải Phòng | 114 (1669/NQ-UBTVQH15) | 67/45/2 | 114 | 114 | Tỉnh Hải Dương, Thành phố Hải Phòng | 451 | 99/15/0/0 | 113/1/0/0 |
| 33 | Tỉnh Hưng Yên | 104 (1666/NQ-UBTVQH15) | 93/11/0 | 104 | 104 | Tỉnh Hưng Yên, Tỉnh Thái Bình | 384 | 0/23/40/41 | 0/23/81/0 |
| 37 | Tỉnh Ninh Bình | 129 (1674/NQ-UBTVQH15) | 97/32/0 | 129 | 129 | Tỉnh Hà Nam, Tỉnh Nam Định, Tỉnh Ninh Bình | 405 | 0/12/80/37 | 0/12/80/37 |
| 38 | Tỉnh Thanh Hóa | 166 (1686/NQ-UBTVQH15) | 147/19/0 | 166 | 166 | Tỉnh Thanh Hóa | 558 | 0/21/69/76 | 0/21/69/76 |
| 40 | Tỉnh Nghệ An | 130 (1678/NQ-UBTVQH15) | 119/11/0 | 130 | 130 | Tỉnh Nghệ An | 412 | 0/19/46/65 | 0/19/46/65 |
| 42 | Tỉnh Hà Tĩnh | 69 (1665/NQ-UBTVQH15) | 60/9/0 | 69 | 69 | Tỉnh Hà Tĩnh | 212 | 0/0/12/57 | 0/0/12/57 |
| 44 | Tỉnh Quảng Trị | 78 (1680/NQ-UBTVQH15) | 69/8/1 | 78 | 78 | Tỉnh Quảng Bình, Tỉnh Quảng Trị | 265 | 0/5/37/36 | 0/5/37/36 |
| 46 | Thành phố Huế | 40 (1675/NQ-UBTVQH15) | 19/21/0 | 40 | 40 | Thành phố Huế | 133 | 0/11/24/5 | 0/11/24/5 |
| 48 | Thành phố Đà Nẵng | 94 (1659/NQ-UBTVQH15) | 70/23/1 | 94 | 94 | Thành phố Đà Nẵng, Tỉnh Quảng Nam | 282 | 0/24/35/35 | 0/30/29/35 |
| 51 | Tỉnh Quảng Ngãi | 96 (1677/NQ-UBTVQH15) | 86/9/1 | 96 | 96 | Tỉnh Quảng Ngãi, Tỉnh Kon Tum | 274 | 0/0/25/71 | 0/0/25/71 |
| 52 | Tỉnh Gia Lai | 135 (1664/NQ-UBTVQH15) | 110/25/0 | 135 | 135 | Tỉnh Bình Định, Tỉnh Gia Lai | 376 | 0/0/12/123 | 0/6/18/111 |
| 56 | Tỉnh Khánh Hòa | 65 (1667/NQ-UBTVQH15) | 48/16/1 | 65 | 65 | Tỉnh Khánh Hòa, Tỉnh Ninh Thuận | 205 | 0/24/29/12 | 0/24/29/12 |
| 66 | Tỉnh Đắk Lắk | 102 (1660/NQ-UBTVQH15) | 88/14/0 | 102 | 102 | Tỉnh Phú Yên, Tỉnh Đắk Lắk | 294 | 0/0/17/85 | 0/0/17/85 |
| 68 | Tỉnh Lâm Đồng | 124 (1671/NQ-UBTVQH15) | 103/20/1 | 124 | 124 | Tỉnh Bình Thuận, Tỉnh Đắk Nông, Tỉnh Lâm Đồng | 331 | 0/16/31/77 | 0/16/31/77 |
| 75 | Thành phố Đồng Nai | 95 (1662/NQ-UBTVQH15) | 72/23/0 | 95 | 95 | Tỉnh Bình Phước, Tỉnh Đồng Nai | 271 | 42/23/18/12 | 47/20/16/12 |
| 79 | Thành phố Hồ Chí Minh | 168 (1685/NQ-UBTVQH15) | 54/113/1 | 168 | 168 | Tỉnh Bình Dương, Tỉnh Bà Rịa - Vũng Tàu, Thành phố Hồ Chí Minh | 493 | 144/14/10/0 | 158/10/0/0 |
| 80 | Tỉnh Tây Ninh | 96 (1682/NQ-UBTVQH15) | 82/14/0 | 96 | 96 | Tỉnh Tây Ninh, Tỉnh Long An, Tỉnh Tiền Giang | 302 | 20/29/34/13 | 20/29/34/13 |
| 82 | Tỉnh Đồng Tháp | 102 (1663/NQ-UBTVQH15) | 82/20/0 | 102 | 102 | Tỉnh Tiền Giang, Tỉnh Đồng Tháp | 308 | 0/12/27/63 | 0/12/27/63 |
| 86 | Tỉnh Vĩnh Long | 124 (1687/NQ-UBTVQH15) | 105/19/0 | 124 | 124 | Tỉnh Bến Tre, Tỉnh Trà Vinh, Tỉnh Vĩnh Long | 359 | 0/21/30/73 | 0/21/30/73 |
| 91 | Tỉnh An Giang | 102 (1654/NQ-UBTVQH15) | 85/14/3 | 102 | 102 | Tỉnh An Giang, Tỉnh Kiên Giang | 303 | 0/13/29/60 | 0/13/29/60 |
| 92 | Thành phố Cần Thơ | 103 (1668/NQ-UBTVQH15) | 72/31/0 | 103 | 103 | Thành phố Cần Thơ, Tỉnh Hậu Giang, Tỉnh Sóc Trăng | 266 | 0/19/35/49 | 0/19/35/49 |
| 96 | Tỉnh Cà Mau | 64 (1655/NQ-UBTVQH15) | 55/9/0 | 64 | 64 | Tỉnh Bạc Liêu, Tỉnh Cà Mau | 186 | 0/7/23/34 | 0/7/23/34 |

## Chỗ các nguồn khác nhau và lựa chọn

### Nghị quyết và bảng chuyển đổi khác nhau về phạm vi nhập (1)

- Tỉnh Lâm Đồng: Xã Hòa Thắng ← Xã Hòa Thắng: nghị quyết ghi *phần còn lại*, bảng chuyển đổi ghi *Nhập toàn bộ*.

**Lựa chọn:** theo nghị quyết.

### Đơn vị cũ chỉ có trong nghị quyết (1)

- Tỉnh Lâm Đồng: Xã Hồng Thái ← Xã Hòa Thắng (bảng chuyển đổi không ghi dòng này).

**Lựa chọn:** bổ sung theo nghị quyết; mã lấy từ dòng khác của cùng đơn vị cũ trong bảng chuyển đổi.

### Mã đơn vị cũ sai trong bảng chuyển đổi (3)

- Xã Thuận An ← Xã Đặng Xá: bảng chuyển đổi ghi mã 00553, là mã của Xã Cổ Bi; mã đúng 00556.
- Xã Phục Hòa ← Xã Mỹ Hưng: bảng chuyển đổi ghi mã 01615, là mã của Xã Hồng Quang; mã đúng 01651.
- Xã Thái Bình ← Xã Phú Thịnh: bảng chuyển đổi ghi mã 02485, là mã của Xã Công Đa; mã đúng 02482.

**Lựa chọn:** sửa mã theo danh mục của Cục Thống kê (cùng tên, cùng huyện cũ).

### Tỉnh cũ ghi sai trong bảng chuyển đổi (1)

- Dòng 6211 (Đặc khu Cồn Cỏ): bảng chuyển đổi ghi tỉnh cũ *Quảng Trị (44)*; dùng Tỉnh Quảng Trị (45). 44 là mã tỉnh Quảng Trị mới; 119 dòng khác của tỉnh Quảng Trị cũ đều ghi mã 45.

**Lựa chọn:** sửa theo các dòng còn lại của tỉnh Quảng Trị cũ trong cùng bảng; trước 01/07/2025 mã 44 là tỉnh Quảng Bình.

### Đơn vị có trong nghị quyết nhưng thiếu trong danh mục hiện hành của Cục Thống kê (1)

- Thành phố Hà Nội: Phường Hoàn Kiếm (mã 00070).

**Lựa chọn:** giữ lại; đơn vị được thành lập tại nghị quyết và có trong bảng chuyển đổi của chính Cục Thống kê.

### Lỗi đánh máy trong phụ lục vùng lương (4)

- 2026, Thành phố Bắc Ninh: phụ lục ghi *phường Tự Lan*, đọc là Tự Lạn. Nghị quyết 1658/NQ-UBTVQH15 và Cục Thống kê ghi phường Tự Lạn; không có đơn vị Tự Lan.
- 2026, Thành phố Hồ Chí Minh: phụ lục ghi *phường Tân Thạnh*, đọc là Tây Thạnh. Không có phường Tân Thạnh ở TP.HCM sau sắp xếp; cùng vị trí trong danh sách, Nghị định 399/2026/NĐ-CP ghi 'Tây Thạnh' (phường Tây Thạnh, khoản 62 Nghị quyết 1685/NQ-UBTVQH15).
- 2026, Thành phố Hồ Chí Minh: phụ lục ghi *xã Tân Nhựt Bình Chánh*, đọc là Tân Nhựt, Bình Chánh. Thiếu dấu phẩy giữa hai xã Tân Nhựt và Bình Chánh; Nghị định 399/2026/NĐ-CP ghi 'Tân Nhựt, Bình Chánh'.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *phường Tự Lan*, đọc là Tự Lạn. Nghị quyết 1658/NQ-UBTVQH15 và Cục Thống kê ghi phường Tự Lạn; không có đơn vị Tự Lan.

**Lựa chọn:** đọc theo đơn vị thực tế, có giải thích từng trường hợp.

### Phụ lục vùng lương ghi loại đơn vị cũ (20)

- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Chi Lăng*, đơn vị hiện là Phường Chi Lăng.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Phù Lãng*, đơn vị hiện là Phường Phù Lãng.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Yên Phong*, đơn vị hiện là Phường Yên Phong.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Tiên Du*, đơn vị hiện là Phường Tiên Du.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Gia Bình*, đơn vị hiện là Phường Gia Bình.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Nhân Thắng*, đơn vị hiện là Phường Nhân Thắng.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Lương Tài*, đơn vị hiện là Phường Lương Tài.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Lạng Giang*, đơn vị hiện là Phường Lạng Giang.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Kép*, đơn vị hiện là Phường Kép.
- 2027, Thành phố Bắc Ninh: phụ lục ghi *xã Hiệp Hòa*, đơn vị hiện là Phường Hiệp Hoà.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Nhơn Trạch*, đơn vị hiện là Phường Nhơn Trạch.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Long Thành*, đơn vị hiện là Phường Long Thành.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Trảng Bom*, đơn vị hiện là Phường Trảng Bom.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Dầu Giây*, đơn vị hiện là Phường Dầu Giây.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Xuân Lộc*, đơn vị hiện là Phường Xuân Lộc.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Trị An*, đơn vị hiện là Phường Trị An.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Tân Phú*, đơn vị hiện là Phường Tân Phú.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Đồng Phú*, đơn vị hiện là Phường Đồng Phú.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Tân Khai*, đơn vị hiện là Phường Tân Khai.
- 2027, Thành phố Đồng Nai: phụ lục ghi *xã Lộc Ninh*, đơn vị hiện là Phường Lộc Ninh.

**Lựa chọn:** ghép theo tên (tên là duy nhất trong tỉnh). Đây là các xã đã thành phường năm 2026.

### Khu vực không phải đơn vị hành chính (1)

- Thành phố Bắc Ninh: Xã Biên Sơn ← Trường bắn TB1.

**Lựa chọn:** ghi là đơn vị cũ loại 'khu vực', không có mã.

### Bảng chuyển đổi thiếu loại đơn vị cũ (2)

- Tỉnh Đắk Lắk: Xã Xuân Quang 3 (mã 22108) → Xã Xuân Phước.
- Tỉnh Đắk Lắk: Xã Xuân Phước (mã 22111) → Xã Xuân Phước.

**Lựa chọn:** lấy loại đơn vị theo nghị quyết.

### Tên đơn vị cũ viết khác nhau giữa bảng chuyển đổi và danh mục cũ (85)

Cùng mã, cùng đơn vị, chỉ khác cách viết (dấu thanh, Đăk/Đắk, tên dân tộc thiểu số, 'NT' và 'Nông trường', số La Mã...). Ví dụ:

- Xã Phong Nặm ↔ Xã Phong Nậm (mã 01483)
- Xã Nậm Ty ↔ Xã Nậm Tỵ (mã 01087)
- Xã Khâu Tinh ↔ Xã Khau Tinh (mã 02263)
- Xã Noong Hẹt ↔ Xã Noọng Hẹt (mã 03352)
- Xã Pu Nhi ↔ Xã Pú Nhi (mã 03370)
- Xã Ta Gia ↔ Xã Tà Gia (mã 03640)
- Xã Nặm Ét ↔ Xã Nậm ét (mã 03712)
- Xã Nặm Păm ↔ Xã Nậm Păm (mã 03826)
- Xã Nà Ớt ↔ Xã Nà Ơt (mã 04162)
- Xã Tả Ngài Chồ ↔ Xã Tả Ngải Chồ (mã 02755)
- Xã Nậm Chày ↔ Xã Nậm Chầy (mã 03076)
- Xã Thẳm Dương ↔ Xã Thẩm Dương (mã 03115)
- Thị trấn Mù Cang Chải ↔ Thị trấn Mù Căng Chải (mã 04456)
- Phường Quan Triều ↔ Phường Quán Triều (mã 05431)
- Phường Trạng Hạ ↔ Phường Trang Hạ (mã 09383)

**Lựa chọn:** giữ tên theo bảng chuyển đổi, lưu tên trong danh mục cũ ở trường `name_in_list` để tra cứu được cả hai cách viết. Danh sách đủ: `bao-cao-doi-chieu.json`.

### Tên đơn vị cũ khác hẳn tên trong danh mục cũ, cùng mã (68, chưa xác minh)

Mã có trong danh mục cũ nhưng tên khác nhiều hơn một lỗi dấu, và trong cùng huyện cũ không có đơn vị nào mang tên theo bảng chuyển đổi. Nhiều khả năng là cùng một xã (tên cũ hoặc cách phiên âm khác), nhưng các nguồn hiện có không đủ để khẳng định:

- Xã Sà Phìn ↔ Xã Xà Phìn (mã 00736, Huyện Đồng Văn) → thuộc Xã Sà Phìn
- Thị trấn Phố Bảng ↔ Thị trấn Phó Bảng (mã 00712, Huyện Đồng Văn) → thuộc Xã Phố Bảng
- Xã Sủng Cháng ↔ Xã Sủng Tráng (mã 00829, Huyện Yên Minh) → thuộc Xã Thắng Mố
- Xã Sán Sả Hồ ↔ Xã Sán Xả Hồ (mã 01060, Huyện Hoàng Su Phì) → thuộc Xã Pờ Ly Ngài
- Xã Quý Quân ↔ Xã Quí Quân (mã 02431, Huyện Yên Sơn) → thuộc Xã Lực Hành
- Xã Sá Tổng ↔ Xã Xá Tổng (mã 03178, Huyện Mường Chà) → thuộc Phường Mường Lay
- Xã Huổi Lếch ↔ Xã Huổi Lếnh (mã 03177, Huyện Mường Nhé) → thuộc Xã Mường Toong
- Xã Luân Giói ↔ Xã Luân Giới (mã 03379, Huyện Điện Biên Đông) → thuộc Xã Mường Luân
- Xã Sín Chải ↔ Xã Xín Chải (mã 03223, Huyện Tủa Chùa) → thuộc Xã Sín Chải
- Xã Xá Nhè ↔ Xã Sáng Nhè (mã 03244, Huyện Tủa Chùa) → thuộc Xã Sáng Nhè
- Xã Lản Nhì Thàng ↔ Xã Lả Nhì Thàng (mã 03391, Huyện Phong Thổ) → thuộc Phường Đoàn Kết
- Xã Can Hồ ↔ Xã Kan Hồ (mã 03469, Huyện Mường Tè) → thuộc Xã Bum Tở
- Xã Hua Bum ↔ Xã Hua Bun (mã 03460, Huyện Nậm Nhùn) → thuộc Xã Hua Bum
- Xã Pa Vệ Sủ ↔ Xã Pa Vệ Sử (mã 03448, Huyện Mường Tè) → thuộc Xã Bum Nưa
- Xã Ma Li Pho ↔ Xã Ma Ly Pho (mã 03574, Huyện Phong Thổ) → thuộc Xã Phong Thổ
- Xã Tung Qua Lìn ↔ Xã Tông Qua Lìn (mã 03565, Huyện Phong Thổ) → thuộc Xã Dào San
- Xã Nong Lay ↔ Xã Noong Lay (mã 03754, Huyện Thuận Châu) → thuộc Xã Chiềng La
- Xã Pú Bẩu ↔ Xã Pú Pẩu (mã 04174, Huyện Sông Mã) → thuộc Xã Bó Sinh
- Xã Nàn Sín ↔ Xã Nàn Xín (mã 02836, Huyện Si Ma Cai) → thuộc Xã Sín Chéng
- Xã Nậm Dạng ↔ Xã Nậm Rạng (mã 03073, Huyện Văn Bàn) → thuộc Xã Võ Lao
- Xã Dế Xu Phình ↔ Xã Dế Su Phình (mã 04486, Huyện Mù Căng Chải) → thuộc Xã Púng Luông
- Xã Hát Lừu ↔ Xã Hát Lìu (mã 04618, Huyện Trạm Tấu) → thuộc Xã Hạnh Phúc
- Xã Tà Xi Láng ↔ Xã Tà Si Láng (mã 04603, Huyện Trạm Tấu) → thuộc Xã Tà Xi Láng
- Xã Sỹ Bình ↔ Xã Sĩ Bình (mã 01978, Huyện Bạch Thông) → thuộc Xã Vĩnh Thông
- Xã Sa Lý ↔ Xã Xa Lý (mã 07540, Huyện Lục Ngạn) → thuộc Xã Sa Lý
- Xã Mỵ Hòa ↔ Xã Mi Hòa (mã 05083, Huyện Kim Bôi) → thuộc Xã Dũng Tiến
- Xã Xăm Khòe ↔ Xã Săm Khóe (mã 05245, Huyện Mai Châu) → thuộc Xã Bao La
- Xã An Quý ↔ Xã An Quí (mã 12538, Huyện Quỳnh Phụ) → thuộc Xã Đồng Bằng
- Xã Kim Trung ↔ Xã Kim Chung (mã 12664, Huyện Hưng Hà) → thuộc Xã Hưng Hà
- Xã Vũ Quý ↔ Xã Vũ Quí (mã 13141, Huyện Kiến Xương) → thuộc Xã Vũ Quý
- Phường Tiên Sơn ↔ Xã Tiên Sơn (mã 13369, Thị xã Duy Tiên) → thuộc Phường Tiên Sơn
- Xã Hưng Yên Nam ↔ Xã Hưng Yên (mã 18007, Huyện Hưng Nguyên) → thuộc Xã Yên Trung
- Xã Bhalêê ↔ Xã Bha Lê (mã 20458, Huyện Tây Giang) → thuộc Xã Avương
- Xã Mà Cooih ↔ Xã Mà Cooi (mã 20494, Huyện Đông Giang) → thuộc Xã Bến Hiên
- Xã Zuôih ↔ Xã Zuôich (mã 20701, Huyện Nam Giang) → thuộc Xã Nam Giang
- Xã Tà Bhing ↔ Xã Tà Bhinh (mã 20710, Huyện Nam Giang) → thuộc Xã Bến Giằng
- Xã Đăk Plô ↔ Xã Đắk Blô (mã 23344, Huyện Đắk Glei) → thuộc Xã Đăk Plô
- Xã Pờ Y ↔ Xã Bờ Y (mã 23395, Huyện Ngọc Hồi) → thuộc Xã Bờ Y
- Xã Ngọk Lây ↔ Xã Ngọc Lây (mã 23404, Huyện Tu Mơ Rông) → thuộc Xã Măng Ri
- Xã Ngọk Yêu ↔ Xã Ngọc Yêu (mã 23413, Huyện Tu Mơ Rông) → thuộc Xã Măng Ri
- Xã Măng Bút ↔ Xã Măng Buk (mã 23458, Huyện Kon Plông) → thuộc Xã Măng Bút
- Xã Đak Rong ↔ Xã Đăk Roong (mã 23644, Huyện KBang) → thuộc Xã Đak Rong
- Xã Chư Krey ↔ Xã Chư Krêy (mã 23827, Huyện Kông Chro) → thuộc Xã Chư Krey
- Xã Chơ GLong ↔ Xã Chơ Long (mã 23851, Huyện Kông Chro) → thuộc Xã Chơ Long
- Xã Ia Mrơn ↔ Xã Ia Ma Rơn (mã 24031, Huyện Ia Pa) → thuộc Xã Ia Pa
- Xã Ia Trôk ↔ Xã Ia Trok (mã 24037, Huyện Ia Pa) → thuộc Xã Ia Pa
- Xã Ia Dreh ↔ Xã Ia HDreh (mã 24100, Huyện Krông Pa) → thuộc Xã Ia Dreh
- Phường Hòa Tân Đông ↔ Xã Hòa Tân Đông (mã 22267, Thị xã Đông Hòa) → thuộc Phường Đông Hòa
- Xã Ea H'đing ↔ Xã Ea H'đinh (mã 24274, Huyện Cư M'gar) → thuộc Xã Cư M’gar
- Xã Cuôr Đăng ↔ Xã Cuor Đăng (mã 24301, Huyện Cư M'gar) → thuộc Xã Cuôr Đăng
- Xã Dliê Ya ↔ Xã ĐLiê Ya (mã 24346, Huyện Krông Năng) → thuộc Xã Dliê Ya
- Xã Cư Yang ↔ Xã Cư Jang (mã 24409, Huyện Ea Kar) → thuộc Xã Cư Yang
- Thị trấn M'Drắk ↔ Thị trấn M'Đrắk (mã 24412, Huyện M'Đrắk) → thuộc Xã M’Drắk
- Xã Ea Knuếc ↔ Xã Ea KNuec (mã 24505, Huyện Krông Pắc) → thuộc Xã Ea Knuếc
- Xã Thuận Quý ↔ Xã Thuận Quí (mã 23140, Huyện Hàm Thuận Nam) → thuộc Xã Tân Thành
- Xã Đắk N’Drung ↔ Xã Đắk N'Dung (mã 24727, Huyện Đắk Song) → thuộc Xã Đức An
- Xã Đạ M'Rông ↔ Xã Đạ M' Rong (mã 24859, Huyện Đam Rông) → thuộc Xã Đam Rông 3
- Xã N' Thôn Hạ ↔ Xã N'Thol Hạ (mã 24973, Huyện Đức Trọng) → thuộc Xã Tân Hội
- Xã Đak Lua ↔ Xã Dak Lua (mã 26119, Huyện Tân Phú) → thuộc Xã Đak Lua
- Xã Qui Đức ↔ Xã Quy Đức (mã 27640, Huyện Bình Chánh) → thuộc Xã Hưng Long
- Phường IV ↔ Phường 4 (mã 25462, Thành phố Tây Ninh) → thuộc Phường Tân Ninh
- Xã Mỹ Quí ↔ Xã Mỹ Quý (mã 30055, Huyện Tháp Mười) → thuộc Xã Mỹ Quí
- Xã Quới Sơn ↔ Xã Qưới Sơn (mã 28807, Huyện Châu Thành) → thuộc Xã Giao Long
- Xã An Qui ↔ Xã An Quy (mã 29218, Huyện Thạnh Phú) → thuộc Xã An Qui
- Xã Lục Sĩ Thành ↔ Xã Lục Sỹ Thành (mã 29857, Huyện Trà Ôn) → thuộc Xã Lục Sĩ Thành
- Phường Vĩnh Nguơn ↔ Phường Vĩnh Ngươn (mã 30328, Thành phố Châu Đốc) → thuộc Phường Châu Đốc
- Xã Ô Long Vĩ ↔ Xã Ô Long Vỹ (mã 30475, Huyện Châu Phú) → thuộc Xã Thạnh Mỹ Tây
- Xã Hòa Tú 2 ↔ Xã Hòa Tú II (mã 31729, Huyện Mỹ Xuyên) → thuộc Xã Hòa Tú

**Lựa chọn:** giữ mã và tên theo bảng chuyển đổi, ghi tên trong danh mục cũ vào `name_in_list`, đánh dấu `code_check: ten-khac-chua-xac-minh`.

### Đặc khu thành lập từ cả huyện

- Hải Phòng: Đặc khu Bạch Long Vĩ ← Huyện Bạch Long Vĩ
- Quảng Trị: Đặc khu Cồn Cỏ ← Huyện Cồn Cỏ
- Đà Nẵng: Đặc khu Hoàng Sa ← Huyện Hoàng Sa
- Quảng Ngãi: Đặc khu Lý Sơn ← Huyện Lý Sơn
- Hồ Chí Minh: Đặc khu Côn Đảo ← Huyện Côn Đảo
- An Giang: Đặc khu Kiên Hải ← Xã Hòn Tre, Xã Lại Sơn, Xã An Sơn, Xã Nam Du, Huyện Kiên Hải

## Thay đổi vùng lương từ 01/01/2027

So sánh phụ lục hai nghị định: 129 đơn vị đổi vùng, tất cả đều lên một bậc. Không có văn bản chính thức nào tổng hợp con số này để đối chiếu; đây là kết quả so sánh trực tiếp hai phụ lục.

- Quảng Ninh: 5 đơn vị từ vùng II lên vùng I; 7 đơn vị từ vùng III lên vùng II; 7 đơn vị từ vùng IV lên vùng III
- Hải Phòng: 14 đơn vị từ vùng II lên vùng I
- Hưng Yên: 41 đơn vị từ vùng IV lên vùng III
- Đà Nẵng: 6 đơn vị từ vùng III lên vùng II
- Gia Lai: 6 đơn vị từ vùng III lên vùng II; 12 đơn vị từ vùng IV lên vùng III
- Đồng Nai: 5 đơn vị từ vùng II lên vùng I; 2 đơn vị từ vùng III lên vùng II
- Hồ Chí Minh: 14 đơn vị từ vùng II lên vùng I; 10 đơn vị từ vùng III lên vùng II

## Những điều chưa xác minh được

- **Mã đơn vị cũ của tỉnh Bắc Giang cũ** (192 đơn vị): dịch vụ web của Cục Thống kê trả danh mục ngày 30/06/2025 theo tỉnh hiện nay, nên không còn trả được tỉnh Bắc Giang cũ. Các mã này được đối chiếu với bản sao danh mục ngày 04/01/2025 do bên thứ ba lưu (sunshine-tech/VietnamProvinces, tải về khi dựng, không lưu trong kho vì giấy phép GPL): 191 khớp, 0 khác cách viết, 1 khác tên. Đây không phải bản lấy trực tiếp từ Cục Thống kê.
- **Danh sách xã thành lập phường năm 2026** (10 phường Đồng Nai theo 237/NQ-UBTVQH16, 12 phường Bắc Ninh theo 388/NQ-UBTVQH16): lấy từ tin chính thức (Báo Đại biểu Nhân dân, Báo Quốc tế) và khớp với danh mục của Cục Thống kê; chưa đọc được toàn văn hai nghị quyết này.
- **68 đơn vị cũ có tên khác hẳn tên trong danh mục cũ cùng mã** (xem mục trên): giữ theo bảng chuyển đổi, chưa xác minh được là cùng một đơn vị.
- **Mã phường Hoàn Kiếm (00070)**: chỉ có trong bảng chuyển đổi vì danh mục hiện hành của Cục Thống kê thiếu đơn vị này.
- **Văn bản phụ lục vùng lương** được trích từ tệp PDF có chữ ký số bằng `pdftotext`; một lỗi tách chữ ('p hường') đã được sửa. Mọi tên trong hai phụ lục đều đã ghép được với đúng một đơn vị.
- **Thay đổi sau ngày 18/11/2026**: văn bản mới nhất trong danh mục của Cục Thống kê là 388/NQ-UBTVQH16 (hiệu lực 20/09/2026). Cần chạy lại khi có nghị quyết mới.

