/* Tạo nội dung mã VietQR chuyển khoản (chuẩn EMVCo QR của NAPAS) — quét được bằng app của mọi ngân hàng Việt Nam.
 *
 *   VietQR.payload({ bin:"970436", account:"0123456789", amount:150000, note:"Thanh toan don 25" })
 *
 * Cấu trúc: các trường ID(2) + độ dài(2) + giá trị; cuối cùng là CRC-16/CCITT-FALSE (trường 63).
 */
(function (root) {
  // [BIN, tên ngắn, tên đầy đủ] — từ danh sách ngân hàng NAPAS/VietQR (api.vietqr.io/v2/banks), ngân hàng hay dùng xếp trước
  var BANKS = [
    ["970436", "Vietcombank", "Ngân hàng TMCP Ngoại Thương Việt Nam"],
    ["970415", "VietinBank", "Ngân hàng TMCP Công thương Việt Nam"],
    ["970418", "BIDV", "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam"],
    ["970405", "Agribank", "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam"],
    ["970407", "Techcombank", "Ngân hàng TMCP Kỹ thương Việt Nam"],
    ["970422", "MB Bank", "Ngân hàng TMCP Quân đội"],
    ["970416", "ACB", "Ngân hàng TMCP Á Châu"],
    ["970432", "VPBank", "Ngân hàng TMCP Việt Nam Thịnh Vượng"],
    ["970423", "TPBank", "Ngân hàng TMCP Tiên Phong"],
    ["970403", "Sacombank", "Ngân hàng TMCP Sài Gòn Thương Tín"],
    ["970437", "HDBank", "Ngân hàng TMCP Phát triển TP. Hồ Chí Minh"],
    ["970441", "VIB", "Ngân hàng TMCP Quốc tế Việt Nam"],
    ["970443", "SHB", "Ngân hàng TMCP Sài Gòn – Hà Nội"],
    ["970426", "MSB", "Ngân hàng TMCP Hàng Hải"],
    ["970431", "Eximbank", "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam"],
    ["970448", "OCB", "Ngân hàng TMCP Phương Đông"],
    ["970440", "SeABank", "Ngân hàng TMCP Đông Nam Á"],
    ["970449", "LPBank", "Ngân hàng TMCP Lộc Phát Việt Nam"],
    ["546034", "Cake", "Ngân hàng số Cake by VPBank"],
    ["546035", "Ubank", "Ngân hàng số Ubank by VPBank"],
    ["963388", "Timo", "Ngân hàng số Timo by Bản Việt"],
    ["963326", "TNEX", "TNEX by MSB"],
    ["970406", "Vikki", "Ngân hàng TNHH MTV số Vikki"],
    ["970414", "MBV", "Ngân hàng TNHH MTV Việt Nam Hiện Đại"],
    ["970444", "Vietcombank Neo", "Ngân hàng TNHH MTV Ngoại thương Công nghệ số"],
    ["970425", "ABBank", "Ngân hàng TMCP An Bình"],
    ["970409", "Bac A Bank", "Ngân hàng TMCP Bắc Á"],
    ["970438", "BaoViet Bank", "Ngân hàng TMCP Bảo Việt"],
    ["970454", "BVBank", "Ngân hàng TMCP Bản Việt"],
    ["970428", "Nam A Bank", "Ngân hàng TMCP Nam Á"],
    ["970419", "NCB", "Ngân hàng TMCP Quốc Dân"],
    ["970452", "KienlongBank", "Ngân hàng TMCP Kiên Long"],
    ["970412", "PVcomBank", "Ngân hàng TMCP Đại Chúng Việt Nam"],
    ["970430", "PGBank", "Ngân hàng TMCP Thịnh vượng và Phát triển"],
    ["970400", "Saigonbank", "Ngân hàng TMCP Sài Gòn Công Thương"],
    ["970429", "SCB", "Ngân hàng TMCP Sài Gòn"],
    ["970427", "VietABank", "Ngân hàng TMCP Việt Á"],
    ["970433", "Vietbank", "Ngân hàng TMCP Việt Nam Thương Tín"],
    ["970408", "GPBank", "Ngân hàng TM TNHH MTV Dầu Khí Toàn Cầu"],
    ["970446", "Co-opBank", "Ngân hàng Hợp tác xã Việt Nam"],
    ["999888", "VBSP", "Ngân hàng Chính sách Xã hội"],
    ["970421", "VRB", "Ngân hàng Liên doanh Việt – Nga"],
    ["970434", "Indovina", "Ngân hàng TNHH Indovina"],
    ["970424", "Shinhan Bank", "Ngân hàng TNHH MTV Shinhan Việt Nam"],
    ["970457", "Woori Bank", "Ngân hàng TNHH MTV Woori Việt Nam"],
    ["458761", "HSBC", "Ngân hàng TNHH MTV HSBC (Việt Nam)"],
    ["970410", "Standard Chartered", "Ngân hàng TNHH MTV Standard Chartered Việt Nam"],
    ["970458", "UOB", "Ngân hàng United Overseas – CN TP. Hồ Chí Minh"],
    ["422589", "CIMB", "Ngân hàng TNHH MTV CIMB Việt Nam"],
    ["970439", "Public Bank", "Ngân hàng TNHH MTV Public Việt Nam"],
    ["970442", "Hong Leong", "Ngân hàng TNHH MTV Hong Leong Việt Nam"],
    ["533948", "Citibank", "Ngân hàng Citibank, N.A. – CN Hà Nội"],
    ["668888", "KBank", "Ngân hàng Kasikornbank"],
    ["970462", "Kookmin HN", "Ngân hàng Kookmin – CN Hà Nội"],
    ["970463", "Kookmin HCM", "Ngân hàng Kookmin – CN TP. Hồ Chí Minh"],
    ["970466", "KEB Hana HCM", "Ngân hàng KEB Hana – CN TP. Hồ Chí Minh"],
    ["970467", "KEB Hana HN", "Ngân hàng KEB Hana – CN Hà Nội"],
    ["970455", "IBK HN", "Ngân hàng Công nghiệp Hàn Quốc – CN Hà Nội"],
    ["970456", "IBK HCM", "Ngân hàng Công nghiệp Hàn Quốc – CN TP. Hồ Chí Minh"],
    ["801011", "Nonghyup", "Ngân hàng Nonghyup – CN Hà Nội"],
    ["796500", "DBS", "DBS Bank – CN TP. Hồ Chí Minh"]
  ];

  function crc16(s) {   // CRC-16/CCITT-FALSE: đa thức 0x1021, giá trị đầu 0xFFFF (tính trên mã UTF-8)
    var bytes = unescape(encodeURIComponent(s)), crc = 0xffff;
    for (var i = 0; i < bytes.length; i++) {
      crc ^= bytes.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return ("000" + crc.toString(16).toUpperCase()).slice(-4);
  }
  function tlv(id, value) { value = String(value); return id + ("0" + value.length).slice(-2) + value; }

  // Nội dung chuyển khoản: bỏ dấu, chỉ giữ chữ, số, khoảng trắng (app ngân hàng hay lỗi với ký tự khác)
  function cleanNote(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
  }
  function cleanAccount(s) { return String(s || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 19); }

  function payload(o) {
    var account = cleanAccount(o.account), amount = Math.round(+o.amount || 0), note = cleanNote(o.note);
    if (!/^\d{6}$/.test(o.bin || "") || !account) return null;
    var merchant = tlv("00", "A000000727") + tlv("01", tlv("00", o.bin) + tlv("01", account)) + tlv("02", "QRIBFTTA");
    var s = tlv("00", "01") + tlv("01", amount > 0 ? "12" : "11") + tlv("38", merchant) + tlv("53", "704");
    if (amount > 0) s += tlv("54", String(amount));
    s += tlv("58", "VN");
    if (note) s += tlv("62", tlv("08", note));
    s += "6304";
    return s + crc16(s);
  }

  var API = { BANKS: BANKS, payload: payload, crc16: crc16, cleanNote: cleanNote, cleanAccount: cleanAccount };
  if (typeof module === "object" && module.exports) module.exports = API; else root.VietQR = API;
})(this);
