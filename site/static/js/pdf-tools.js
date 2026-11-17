/* Bộ công cụ PDF chạy hoàn toàn trên trình duyệt: ghép, tách, ảnh sang PDF, PDF sang ảnh.
 * Thư viện: pdf-lib (tạo, sửa PDF) và pdf.js của Mozilla (vẽ trang PDF thành ảnh), tải khi cần.
 * File của người dùng không được gửi lên máy chủ.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PdfTools = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // "1-3, 5, 8-" -> [0,1,2,4,7,8,...] (chỉ số từ 0). Trả về { pages, error }
  function parsePages(str, n) {
    var s = String(str || "").replace(/\s+/g, "").replace(/[–—]/g, "-");
    if (!s) return { pages: [], error: "Nhập số trang, ví dụ 1-3, 5" };
    var out = [];
    var parts = s.split(/[,;]/);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; if (!p) continue;
      var m = p.match(/^(\d*)-(\d*)$/), a, b;
      if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : n; }
      else if (/^\d+$/.test(p)) { a = b = +p; }
      else return { pages: [], error: "Không hiểu \"" + p + "\". Viết dạng 1-3, 5, 8-" };
      if (a < 1 || b < 1 || a > n || b > n) return { pages: [], error: "File chỉ có " + n + " trang" };
      var step = a <= b ? 1 : -1;
      for (var k = a; k !== b + step; k += step) out.push(k - 1);
    }
    return out.length ? { pages: out, error: null } : { pages: [], error: "Chưa chọn trang nào" };
  }

  // Chia n trang thành từng nhóm `size` trang: [[0..size-1], ...]
  function chunks(n, size) {
    var r = []; size = Math.max(1, size | 0);
    for (var i = 0; i < n; i += size) { var g = []; for (var k = i; k < Math.min(n, i + size); k++) g.push(k); r.push(g); }
    return r;
  }

  // Nhãn trang gọn: [0,1,2,4] -> "1-3, 5"
  function label(pages) {
    var r = [], i = 0;
    while (i < pages.length) {
      var j = i; while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
      r.push(j > i ? (pages[i] + 1) + "-" + (pages[j] + 1) : String(pages[i] + 1)); i = j + 1;
    }
    return r.join(", ");
  }

  function size(b) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  function baseName(name) { return String(name || "file").replace(/\.[^.]+$/, ""); }

  // Kích thước trang giấy (điểm PDF, 1 pt = 1/72 inch)
  var PAPER = { a4: [595.28, 841.89], letter: [612, 792] };
  // Đặt ảnh (w×h) vào trang: fit = "a4"|"letter"|"image"; orientation "auto"|"portrait"|"landscape"; margin (pt)
  function placeImage(w, h, fit, orientation, margin) {
    if (fit === "image") return { pageW: w, pageH: h, x: 0, y: 0, w: w, h: h };
    var p = PAPER[fit] || PAPER.a4, pw = p[0], ph = p[1];
    var land = orientation === "landscape" || (orientation === "auto" && w > h);
    if (land) { var t = pw; pw = ph; ph = t; }
    var m = margin || 0, aw = pw - 2 * m, ah = ph - 2 * m, k = Math.min(aw / w, ah / h, 1e9);
    var dw = w * k, dh = h * k;
    return { pageW: pw, pageH: ph, x: (pw - dw) / 2, y: (ph - dh) / 2, w: dw, h: dh };
  }

  // ---------- Phần chỉ dùng trên trình duyệt ----------
  var loaded = {};
  function script(src) {
    if (!loaded[src]) loaded[src] = new Promise(function (ok, no) {
      var s = document.createElement("script"); s.src = src; s.onload = ok;
      s.onerror = function () { delete loaded[src]; no(new Error("Không tải được " + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function pdfLib() { return script("/js/pdf-lib.min.js").then(function () { return self.PDFLib; }); }
  function pdfjs() {
    return script("/js/pdfjs.min.js").then(function () {
      self.pdfjsLib.GlobalWorkerOptions.workerSrc = "/js/pdfjs.worker.min.js";
      return self.pdfjsLib;
    });
  }
  function zip() { return script("/js/jszip.min.js").then(function () { return self.JSZip; }); }
  function readBytes(file) { return file.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function download(data, name, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/pdf" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    return blob.size;
  }
  // Mở PDF bằng pdf-lib; báo lỗi dễ hiểu khi file có mật khẩu hoặc hỏng
  function openPdf(PDFLib, bytes) {
    return PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true }).then(function (d) {
      if (d.isEncrypted) throw new Error("encrypted");
      return d;
    });
  }
  function errorText(e) {
    var m = String(e && e.message || e);
    if (/encrypt|password/i.test(m)) return "File PDF đang đặt mật khẩu hoặc bị khoá. Hãy mở khoá file trước rồi thử lại.";
    if (/Không tải được/.test(m)) return "Không tải được thư viện xử lý PDF. Kiểm tra kết nối mạng rồi thử lại.";
    return "Không đọc được file này. File có thể bị hỏng hoặc không phải PDF.";
  }
  // Kéo thả + chọn file cho một ô .drop; onFiles nhận mảng File
  function dropZone(el, input, onFiles) {
    ["dragenter", "dragover"].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove("over"); }); });
    el.addEventListener("drop", function (e) { onFiles([].slice.call(e.dataTransfer.files)); });
    input.addEventListener("change", function () { onFiles([].slice.call(input.files)); input.value = ""; });
  }

  return { parsePages: parsePages, chunks: chunks, label: label, size: size, baseName: baseName, placeImage: placeImage, PAPER: PAPER,
           pdfLib: pdfLib, pdfjs: pdfjs, zip: zip, readBytes: readBytes, download: download, openPdf: openPdf, errorText: errorText, dropZone: dropZone };
});
