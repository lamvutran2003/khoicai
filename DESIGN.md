# Tính Giùm — quy tắc giao diện

Phong cách "cổ điển" kiểu calculator.net: nền trắng, đầu trang xanh navy, khung nhập xám, nút xanh lá, cột phải là danh sách công cụ. Chỉ giao diện sáng.

## Mỗi trang công cụ

1. Front matter: `title`, `h1`, `description`, `category`, `order`, `summary` (thẻ trang chủ, ~10 chữ), `intro` (một câu dưới tiêu đề), `keywords`.
2. Nếu có nhiều chiều tính (Gross → Net / Net → Gross): `.tabs` ngay trên khung nhập, tối đa 3 tab.
3. Khung nhập `form.calc` có `data-result="<id kết quả>"`: mỗi dòng một `label.l` bên trái + ô nhập bên phải.
   - Ô nhập: `.in` + độ rộng `w-l` / `w-m` / `w-s`; đơn vị đặt sau ô bằng `span.u`; ghi chú nhỏ `span.hint`.
   - Số tiền, diện tích: `KCNum.attach()` (tự thêm dấu chấm hàng nghìn khi gõ).
   - Ngày: ô dd/mm/yyyy + lịch bật ra (xem trang âm lịch).
   - Tối đa 4–5 dòng. Tuỳ chọn hiếm dùng: một ô chọn "Mặc định / Khác", không thêm dòng.
4. Nút: `.go` "Tính ▶" (hoặc động từ đúng việc: Đổi, Chuyển, Tạo mã) + `.clr` "Xoá". Enter cũng tính.
5. Kết quả: `section.result` ẩn sẵn, thanh xanh "Kết quả", số chính trong `.big` với phần quan trọng in đậm `<b>`, chi tiết là `table.t`, nút "Sao chép" khi kết quả là chữ.
6. Trang tải xong thì tính sẵn với giá trị mẫu, để người xem thấy ngay kết quả trông thế nào.
7. Dưới cùng `.article`: một bảng hoặc 3–5 gạch đầu dòng về quy tắc tính. Không viết dài.
8. Dữ liệu xử lý trong trình duyệt; tuỳ chọn hay dùng ghi nhớ bằng localStorage (bọc try/catch).

## Không làm

- Không cập nhật kết quả ngay khi gõ (người dùng bấm Tính); sửa số liệu sau khi đã tính thì kết quả mờ đi và nhắc bấm lại.
- Không giao diện tối, không bo tròn lớn, không biểu tượng cảm xúc.
- Không thêm tính năng phụ (đọc to, xử lý hàng loạt…) trừ khi thật cần.

## Khi thêm hoặc đổi tên công cụ

- Chạy `node tools/make_images.js` (cần Playwright) để tạo ảnh xem trước khi chia sẻ `site/static/og/<slug>.png`, rồi commit ảnh.
- Công cụ phụ thuộc quy định (thuế, giá, ngày lễ) thêm `rules:` và `updated:` vào front matter để hiện dòng "Áp dụng … · Cập nhật …".
