/* Ảnh thẻ: bảng kích thước, căn khung theo khuôn mặt, xếp ảnh lên tờ in, ghi 300 dpi vào JPEG,
 * giải mã bộ dò mặt YuNet và làm sạch viền tách nền. Thuần tính toán, chạy được cả trên trình duyệt,
 * trong Web Worker lẫn Node (để kiểm thử).
 *
 * Quy định tham chiếu:
 *  - Hộ chiếu VN: 4×6 cm, nền trắng, nhìn thẳng, đầu để trần, lộ hai tai, không đeo kính (Mẫu TK01, Thông tư 69/2026/TT-BCA);
 *    nộp online: JPEG từ 300 dpi.
 *  - Thị thực điện tử VN: 4×6 cm, nền trắng, JPG dưới 2 MB (cổng evisa.gov.vn).
 *  - Mỹ: 2×2 inch (51×51 mm), đầu (cằm → đỉnh đầu) 25–35 mm, nền trắng (travel.state.gov).
 *  - Schengen: 35×45 mm, khuôn mặt cằm → đỉnh đầu 32–36 mm. Hàn Quốc, Nhật Bản: 35×45 mm, nền trắng.
 *  - Trung Quốc: 33×48 mm, đầu cao 28–33 mm, rộng 15–22 mm, nền trắng (visaforchina.cn).
 *  Ảnh 3×4, 4×6 cho hồ sơ trong nước không có quy định số đo đầu: dùng tỷ lệ phổ biến của tiệm ảnh, người dùng tự chỉnh được.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AnhThe = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // w, h: mm. head: chiều cao đầu mục tiêu (cằm → đỉnh đầu, mm); range: khoảng chấp nhận; top: khoảng từ đỉnh đầu tới mép trên (mm)
  var SPECS = [
    { id: "ho-chieu", name: "Hộ chiếu Việt Nam", short: "Hộ chiếu", w: 40, h: 60, head: 40, range: [36, 46], top: 5, bgs: ["white"],
      note: "Nền trắng, nhìn thẳng, đầu để trần, lộ hai tai, không đeo kính. Nộp online: JPEG từ 300 dpi." },
    { id: "the-3x4", name: "Ảnh thẻ 3×4 (hồ sơ, bằng lái)", short: "3×4", w: 30, h: 40, head: 27, range: [24, 31], top: 3.5, bgs: ["blue", "white", "lightblue"],
      note: "Nhiều hồ sơ (bằng lái, giáo viên dạy lái…) yêu cầu nền xanh; hãy xem hướng dẫn của nơi nộp." },
    { id: "the-4x6", name: "Ảnh 4×6 (xin việc, thi cử)", short: "4×6", w: 40, h: 60, head: 40, range: [36, 46], top: 5, bgs: ["white", "blue", "lightblue"],
      note: "Dùng cho hồ sơ xin việc, thi cử, nhập học…" },
    { id: "visa-vn", name: "Thị thực Việt Nam (e-visa)", short: "E-visa VN", w: 40, h: 60, head: 40, range: [36, 46], top: 5, bgs: ["white"],
      note: "Nền trắng, file JPG dưới 2 MB." },
    { id: "visa-my", name: "Visa, hộ chiếu Mỹ (5×5 cm)", short: "Mỹ 5×5", w: 51, h: 51, head: 30, range: [25, 35], top: 6, bgs: ["white"],
      note: "Đầu từ cằm đến đỉnh cao 25–35 mm, nền trắng." },
    { id: "visa-schengen", name: "Visa Schengen (châu Âu)", short: "Schengen", w: 35, h: 45, head: 34, range: [32, 36], top: 4, bgs: ["white"],
      note: "Khuôn mặt từ cằm đến đỉnh đầu 32–36 mm." },
    { id: "visa-han", name: "Visa Hàn Quốc", short: "Hàn Quốc", w: 35, h: 45, head: 34, range: [32, 36], top: 4, bgs: ["white"],
      note: "Nền trắng, nhìn thẳng, lộ trán và hai tai." },
    { id: "visa-nhat", name: "Visa Nhật Bản", short: "Nhật Bản", w: 35, h: 45, head: 34, range: [32, 36], top: 4, bgs: ["white"],
      note: "Nền trắng, không đội mũ, lộ hai tai." },
    { id: "visa-trung", name: "Visa Trung Quốc", short: "Trung Quốc", w: 33, h: 48, head: 30.5, range: [28, 33], top: 4, bgs: ["white"],
      note: "Đầu cao 28–33 mm, rộng 15–22 mm, nền trắng." }
  ];
  var BGS = { white: { name: "Trắng", color: "#ffffff" }, blue: { name: "Xanh dương", color: "#3d85d6" }, lightblue: { name: "Xanh nhạt", color: "#9cc8f0" } };
  var SHEETS = { "10x15": { name: "10×15 cm (in ở tiệm ảnh)", w: 101.6, h: 152.4 }, a4: { name: "A4 (in ở nhà, văn phòng)", w: 210, h: 297 } };
  var byId = {}; SPECS.forEach(function (s) { byId[s.id] = s; });

  function mmToPx(mm, dpi) { return Math.round(mm / 25.4 * (dpi || 300)); }

  // face: { box: [x, y, w, h], eyeR, eyeL, nose, mouthR, mouthL } (mỗi điểm [x, y], toạ độ ảnh; eyeR là mắt bên trái ảnh)
  // crownMaskY: đỉnh đầu đo từ mặt nạ tách nền (có thể null)
  // Trả về hình học trong hệ toạ độ đã xoay cho hai mắt nằm ngang, gốc xoay = điểm giữa hai mắt
  function faceGeometry(face, crownMaskY) {
    var a = face.eyeR, b = face.eyeL;
    var angle = Math.atan2(b[1] - a[1], b[0] - a[0]);             // radian; > 0 là đầu nghiêng xuống bên phải ảnh
    var cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    var rot = function (p) { var dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(-angle), s = Math.sin(-angle); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
    var m = rot([(face.mouthR[0] + face.mouthL[0]) / 2, (face.mouthR[1] + face.mouthL[1]) / 2]), n = rot(face.nose);
    var eyeDist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    var dm = Math.max(1, m[1] - cy);                                 // mắt → khoé miệng
    var chinY = cy + 1.6 * dm;
    var span = chinY - cy;                                           // mắt → cằm; mắt nằm khoảng giữa đầu
    var crownY = cy - 1.0 * span;                                    // ước lượng theo giải phẫu khi thiếu mặt nạ
    if (crownMaskY != null && isFinite(crownMaskY)) crownY = Math.min(cy - 0.85 * span, Math.max(cy - 1.15 * span, crownMaskY));
    return { angle: angle, cx: cx, cy: cy, eyeY: cy, chinY: chinY, crownY: crownY, headPx: chinY - crownY,
             eyeDist: eyeDist, yaw: (n[0] - cx) / eyeDist };
  }

  // Khung cắt trong hệ toạ độ đã xoay. adj: { zoom (1 = đúng cỡ đầu mục tiêu), dx, dy (mm trên ảnh in) }
  function cropRect(spec, geo, adj) {
    adj = adj || {};
    var zoom = adj.zoom || 1;
    var pxPerMM = geo.headPx / spec.head / zoom;                     // zoom > 1: đầu to hơn (khung hẹp lại)
    var w = spec.w * pxPerMM, h = spec.h * pxPerMM;
    var left = geo.cx - w / 2 - (adj.dx || 0) * pxPerMM;
    var top = geo.crownY - spec.top * pxPerMM - (adj.dy || 0) * pxPerMM;
    return { x: left, y: top, w: w, h: h, pxPerMM: pxPerMM, angle: geo.angle, ox: geo.cx, oy: geo.cy,
             headMM: geo.headPx / pxPerMM, topMM: (geo.crownY - top) / pxPerMM };
  }

  // Ánh xạ điểm (u, v) trong khung cắt (0..1) về toạ độ ảnh gốc
  function cropToSource(crop, u, v) {
    var x = crop.x + u * crop.w, y = crop.y + v * crop.h, dx = x - crop.ox, dy = y - crop.oy;
    var c = Math.cos(crop.angle), s = Math.sin(crop.angle);
    return [crop.ox + dx * c - dy * s, crop.oy + dx * s + dy * c];
  }

  // Cảnh báo chất lượng
  function checks(spec, geo, crop, img) {
    var out = [], outW = mmToPx(spec.w);
    if (crop.w < outW * 0.75) out.push({ level: "warn", text: "Ảnh gốc hơi nhỏ, in ra có thể bị mờ. Hãy chụp gần hơn hoặc dùng ảnh nét hơn." });
    if (Math.abs(geo.yaw) > 0.12) out.push({ level: "warn", text: "Mặt chưa nhìn thẳng vào máy ảnh. Hãy chụp lại, nhìn thẳng." });
    if (Math.abs(geo.angle) > 0.26) out.push({ level: "warn", text: "Đầu nghiêng nhiều; ảnh đã được xoay thẳng nhưng nên chụp lại cho tự nhiên." });
    if (crop.headMM < spec.range[0] - 0.05 || crop.headMM > spec.range[1] + 0.05)
      out.push({ level: "warn", text: "Cỡ đầu " + crop.headMM.toFixed(0) + " mm, nằm ngoài khoảng " + spec.range[0] + "–" + spec.range[1] + " mm thường được chấp nhận." });
    var corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(function (p) { return cropToSource(crop, p[0], p[1]); });
    if (corners.some(function (p) { return p[0] < -1 || p[1] < -1 || p[0] > img.w + 1 || p[1] > img.h + 1; }))
      out.push({ level: "info", text: "Khung ảnh vượt ra ngoài ảnh gốc; phần thiếu được tô màu nền. Nên chụp lùi ra một chút, lấy cả vai." });
    return out;
  }

  // Xếp ảnh lên tờ giấy: thử giấy dọc và ngang, chọn cách được nhiều ảnh nhất. Đơn vị mm, trả kèm pixel ở 300 dpi
  function sheetLayout(spec, sheetId, o) {
    o = o || {};
    var sh = SHEETS[sheetId] || SHEETS["10x15"], gap = o.gap == null ? 2.4 : o.gap, margin = o.margin == null ? 2.5 : o.margin, dpi = o.dpi || 300;
    var fit = function (W, H) {
      var cols = Math.floor((W - 2 * margin + gap) / (spec.w + gap)), rows = Math.floor((H - 2 * margin + gap) / (spec.h + gap));
      return { W: W, H: H, cols: Math.max(0, cols), rows: Math.max(0, rows), n: Math.max(0, cols) * Math.max(0, rows) };
    };
    var p = fit(sh.w, sh.h), l = fit(sh.h, sh.w), best = l.n > p.n ? l : p;
    var gw = best.cols * spec.w + (best.cols - 1) * gap, gh = best.rows * spec.h + (best.rows - 1) * gap;
    var x0 = (best.W - gw) / 2, y0 = (best.H - gh) / 2, cells = [];
    for (var r = 0; r < best.rows; r++) for (var c = 0; c < best.cols; c++) {
      var x = x0 + c * (spec.w + gap), y = y0 + r * (spec.h + gap);
      cells.push({ x: x, y: y, w: spec.w, h: spec.h, px: { x: mmToPx(x, dpi), y: mmToPx(y, dpi), w: mmToPx(spec.w, dpi), h: mmToPx(spec.h, dpi) } });
    }
    return { sheet: sheetId, landscape: best === l && l.n > p.n, wmm: best.W, hmm: best.H, wpx: mmToPx(best.W, dpi), hpx: mmToPx(best.H, dpi),
             cols: best.cols, rows: best.rows, count: cells.length, cells: cells, gap: gap, margin: margin };
  }

  // Dấu cắt: vạch ngắn ở mỗi góc ảnh, nằm trong khoảng hở (không đè lên ảnh). Trả về các đoạn thẳng [x1, y1, x2, y2] (mm)
  function cutMarks(layout, len) {
    len = len == null ? Math.min(2, layout.gap * 0.8) : len;
    var segs = [];
    layout.cells.forEach(function (c) {
      [[c.x, c.y, -1, -1], [c.x + c.w, c.y, 1, -1], [c.x, c.y + c.h, -1, 1], [c.x + c.w, c.y + c.h, 1, 1]].forEach(function (k) {
        segs.push([k[0], k[1] + k[3] * 0.3, k[0], k[1] + k[3] * (0.3 + len)]);      // vạch dọc, kéo dài ra ngoài ảnh theo chiều dọc
        segs.push([k[0] + k[2] * 0.3, k[1], k[0] + k[2] * (0.3 + len), k[1]]);      // vạch ngang
      });
    });
    return segs;
  }

  // Ghi độ phân giải (dpi) vào JPEG: sửa khối JFIF APP0, hoặc chèn mới nếu chưa có
  function setJpegDpi(bytes, dpi) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b[0] !== 0xFF || b[1] !== 0xD8) throw new Error("not a jpeg");
    dpi = dpi || 300;
    var isJfif = b[2] === 0xFF && b[3] === 0xE0 && b[6] === 0x4A && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46 && b[10] === 0;
    if (isJfif) {
      var out = new Uint8Array(b); out[13] = 1; out[14] = dpi >> 8; out[15] = dpi & 255; out[16] = dpi >> 8; out[17] = dpi & 255; return out;
    }
    var app0 = [0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0];
    var res = new Uint8Array(b.length + app0.length); res.set(b.subarray(0, 2), 0); res.set(app0, 2); res.set(b.subarray(2), 2 + app0.length);
    return res;
  }
  function readJpegDpi(b) {
    if (b[2] === 0xFF && b[3] === 0xE0 && b[6] === 0x4A && b[13] === 1) return (b[14] << 8) | b[15];
    return null;
  }

  // ---------- Bộ dò khuôn mặt YuNet (OpenCV Zoo, giấy phép MIT) ----------
  var YUNET_SIZE = 640;
  // Đưa ảnh (RGBA, w×h) vào khung vuông 640 giữ tỷ lệ, kênh BGR, giá trị 0–255. Trả { data: Float32Array(3*640*640), scale }
  function yunetInput(rgba, w, h) {
    var S = YUNET_SIZE, k = Math.min(S / w, S / h), nw = Math.round(w * k), nh = Math.round(h * k);
    var out = new Float32Array(3 * S * S), plane = S * S;
    for (var y = 0; y < nh; y++) {
      var sy = Math.min(h - 1, Math.floor((y + 0.5) / k));
      for (var x = 0; x < nw; x++) {
        var sx = Math.min(w - 1, Math.floor((x + 0.5) / k)), i = (sy * w + sx) * 4, j = y * S + x;
        out[j] = rgba[i + 2]; out[plane + j] = rgba[i + 1]; out[2 * plane + j] = rgba[i];
      }
    }
    return { data: out, scale: k };
  }
  // outs: { cls_8, obj_8, bbox_8, kps_8, ... } (Float32Array). Trả các khuôn mặt sau NMS, toạ độ ảnh gốc, xếp theo điểm giảm dần
  function yunetDecode(outs, scale, threshold) {
    threshold = threshold == null ? 0.6 : threshold;
    var faces = [];
    [8, 16, 32].forEach(function (st) {
      var cols = YUNET_SIZE / st, cls = outs["cls_" + st], obj = outs["obj_" + st], bb = outs["bbox_" + st], kp = outs["kps_" + st];
      for (var i = 0; i < cls.length; i++) {
        var score = Math.sqrt(Math.min(1, Math.max(0, cls[i])) * Math.min(1, Math.max(0, obj[i])));
        if (score < threshold) continue;
        var r = Math.floor(i / cols), c = i % cols;
        var cx = (c + bb[i * 4]) * st, cy = (r + bb[i * 4 + 1]) * st, w = Math.exp(bb[i * 4 + 2]) * st, h = Math.exp(bb[i * 4 + 3]) * st;
        var pts = [];
        for (var n = 0; n < 5; n++) pts.push([(kp[i * 10 + 2 * n] + c) * st / scale, (kp[i * 10 + 2 * n + 1] + r) * st / scale]);
        faces.push({ score: score, box: [(cx - w / 2) / scale, (cy - h / 2) / scale, w / scale, h / scale],
                     eyeR: pts[0], eyeL: pts[1], nose: pts[2], mouthR: pts[3], mouthL: pts[4] });
      }
    });
    faces.sort(function (a, b) { return b.score - a.score; });
    var keep = [];
    faces.forEach(function (f) { if (keep.every(function (k) { return iou(k.box, f.box) < 0.3; })) keep.push(f); });
    return keep;
  }
  function iou(a, b) {
    var x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
    var inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return inter / (a[2] * a[3] + b[2] * b[3] - inter || 1);
  }

  // ---------- Tách nền MODNet: chuẩn bị đầu vào, làm sạch viền ----------
  // Kích thước đầu vào: cạnh dài = side, bội số của 32
  function modnetSize(w, h, side) {
    var k = side / Math.max(w, h);
    return { w: Math.max(32, Math.round(w * k / 32) * 32), h: Math.max(32, Math.round(h * k / 32) * 32) };
  }
  // Ảnh RGBA (w×h) → tensor [1,3,H,W] chuẩn hoá về [-1, 1], lấy mẫu song tuyến
  function modnetInput(rgba, w, h, W, H) {
    var out = new Float32Array(3 * W * H), plane = W * H;
    for (var y = 0; y < H; y++) {
      var fy = Math.max(0, Math.min(h - 1, (y + 0.5) * h / H - 0.5)), y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
      for (var x = 0; x < W; x++) {
        var fx = Math.max(0, Math.min(w - 1, (x + 0.5) * w / W - 0.5)), x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
        var i00 = (y0 * w + x0) * 4, i01 = (y0 * w + x1) * 4, i10 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4, j = y * W + x;
        for (var ch = 0; ch < 3; ch++) {
          var v = (rgba[i00 + ch] * (1 - tx) + rgba[i01 + ch] * tx) * (1 - ty) + (rgba[i10 + ch] * (1 - tx) + rgba[i11 + ch] * tx) * ty;
          out[ch * plane + j] = v / 127.5 - 1;
        }
      }
    }
    return out;
  }
  // Phóng mặt nạ (W×H, 0..1) về w×h
  function upsample(m, W, H, w, h) {
    var out = new Float32Array(w * h);
    for (var y = 0; y < h; y++) {
      var fy = Math.max(0, Math.min(H - 1, (y + 0.5) * H / h - 0.5)), y0 = Math.floor(fy), y1 = Math.min(H - 1, y0 + 1), ty = fy - y0;
      for (var x = 0; x < w; x++) {
        var fx = Math.max(0, Math.min(W - 1, (x + 0.5) * W / w - 0.5)), x0 = Math.floor(fx), x1 = Math.min(W - 1, x0 + 1), tx = fx - x0;
        out[y * w + x] = (m[y0 * W + x0] * (1 - tx) + m[y0 * W + x1] * tx) * (1 - ty) + (m[y1 * W + x0] * (1 - tx) + m[y1 * W + x1] * tx) * ty;
      }
    }
    return out;
  }
  // Làm mờ hộp bằng ảnh tích phân (chạy nhanh với bán kính lớn)
  function boxBlur(src, w, h, r) {
    var I = new Float64Array((w + 1) * (h + 1)), out = new Float32Array(w * h);
    for (var y = 0; y < h; y++) { var row = 0; for (var x = 0; x < w; x++) { row += src[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
    for (y = 0; y < h; y++) {
      var ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1);
      for (x = 0; x < w; x++) {
        var xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1);
        out[y * w + x] = (I[yb * (w + 1) + xb] - I[ya * (w + 1) + xb] - I[yb * (w + 1) + xa] + I[ya * (w + 1) + xa]) / ((yb - ya) * (xb - xa));
      }
    }
    return out;
  }
  // Làm sạch viền: tăng tương phản mặt nạ, ước lượng màu nền cũ quanh viền rồi trừ đi (khử ám màu nền cũ ở tóc, vai).
  // Trả RGBA: RGB = màu tiền cảnh đã khử ám, A = độ phủ. Ghép lên nền mới bằng phép trộn alpha thông thường.
  // Bản đồ màu nền cũ được tính ở độ phân giải 1/4 (màu nền thay đổi chậm), đỡ tốn bộ nhớ trên điện thoại.
  function refine(rgba, alpha, w, h, o) {
    o = o || {};
    var lo = o.lo == null ? 0.12 : o.lo, hi = o.hi == null ? 0.88 : o.hi, n = w * h, f = 4;
    var bw = Math.ceil(w / f), bh = Math.ceil(h / f), cnt = new Float32Array(bw * bh);
    var sum = [new Float32Array(bw * bh), new Float32Array(bw * bh), new Float32Array(bw * bh)], gs = [0, 0, 0], gn = 0, x, y, c, i, k;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x;
      if (alpha[i] < 0.1) { k = ((y / f) | 0) * bw + ((x / f) | 0); cnt[k]++; for (c = 0; c < 3; c++) { sum[c][k] += rgba[i * 4 + c]; gs[c] += rgba[i * 4 + c]; } gn++; }
    }
    var r = Math.max(1, Math.round(Math.max(w, h) * 0.025 / f)), den = boxBlur(cnt, bw, bh, r), num = sum.map(function (a) { return boxBlur(a, bw, bh, r); });
    var g = gn ? gs.map(function (v) { return v / gn; }) : [255, 255, 255];
    var B = [new Float32Array(bw * bh), new Float32Array(bw * bh), new Float32Array(bw * bh)];
    for (k = 0; k < bw * bh; k++) for (c = 0; c < 3; c++) B[c][k] = den[k] > 0.05 ? num[c][k] / den[k] : g[c];
    var out = new Uint8ClampedArray(n * 4);
    for (y = 0; y < h; y++) {
      var fy = Math.max(0, Math.min(bh - 1, (y + 0.5) / f - 0.5)), y0 = fy | 0, y1 = Math.min(bh - 1, y0 + 1), ty = fy - y0;
      for (x = 0; x < w; x++) {
        i = y * w + x;
        var a = Math.min(1, Math.max(0, (alpha[i] - lo) / (hi - lo)));
        out[i * 4 + 3] = Math.round(a * 255);
        if (a >= 0.97 || a <= 0) { out[i * 4] = rgba[i * 4]; out[i * 4 + 1] = rgba[i * 4 + 1]; out[i * 4 + 2] = rgba[i * 4 + 2]; continue; }
        var fx = Math.max(0, Math.min(bw - 1, (x + 0.5) / f - 0.5)), x0 = fx | 0, x1 = Math.min(bw - 1, x0 + 1), tx = fx - x0;
        for (c = 0; c < 3; c++) {
          var P = B[c], bg = (P[y0 * bw + x0] * (1 - tx) + P[y0 * bw + x1] * tx) * (1 - ty) + (P[y1 * bw + x0] * (1 - tx) + P[y1 * bw + x1] * tx) * ty;
          out[i * 4 + c] = (rgba[i * 4 + c] - (1 - a) * bg) / Math.max(a, 0.25);
        }
      }
    }
    return out;
  }
  // Đỉnh đầu theo mặt nạ: hàng trên cùng có độ phủ > 0.5 trong dải cột quanh tâm mặt
  function crownFromMask(alpha, w, h, cx, halfWidth, belowY) {
    var x0 = Math.max(0, Math.round(cx - halfWidth)), x1 = Math.min(w - 1, Math.round(cx + halfWidth));
    for (var y = 0; y < Math.min(h, belowY); y++) {
      var hit = 0;
      for (var x = x0; x <= x1; x++) if (alpha[y * w + x] > 0.5) hit++;
      if (hit >= Math.max(2, (x1 - x0 + 1) * 0.15)) return y;
    }
    return null;
  }

  // ---------- Kiểm tra tư thế (cười lộ răng, tay gần mặt, vai lệch) ----------
  // fg: RGBA đã tách nền (A = độ phủ); face: điểm YuNet; geo: faceGeometry
  function poseChecks(fg, w, h, face, geo) {
    var out = [], d = geo.eyeDist, px = function (x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < w && y < h ? (y * w + x) * 4 : -1; };
    // 1. Cười lộ răng: điểm ảnh sáng, ít màu giữa hai khoé miệng; hoặc miệng kéo rộng
    var mR = face.mouthR, mL = face.mouthL, mw = Math.hypot(mL[0] - mR[0], mL[1] - mR[1]), my = (mR[1] + mL[1]) / 2;
    var teeth = 0, n = 0;
    for (var y = my - 0.12 * d; y <= my + 0.16 * d; y++) for (var x = mR[0] + 0.15 * mw; x <= mL[0] - 0.15 * mw; x++) {
      var i = px(x, y); if (i < 0) continue; n++;
      var r = fg[i], g = fg[i + 1], b = fg[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 165 && (mx - mn) / mx < 0.22) teeth++;
    }
    var teethFrac = n ? teeth / n : 0, ratio = mw / d;
    if (teethFrac > 0.06 || ratio > 1.02) out.push({ id: "smile", level: "warn", text: "Đang cười lộ răng hoặc miệng mở. Ảnh giấy tờ cần nét mặt tự nhiên, miệng khép." });
    // 2. Vật hoặc tay sát mặt: vùng hai bên quai hàm có màu da giống mặt
    var sk = [0, 0, 0], sn = 0;
    for (y = geo.cy + 0.25 * d; y <= geo.cy + 0.5 * d; y++) for (x = geo.cx - 0.2 * d; x <= geo.cx + 0.2 * d; x++) {
      i = px(x, y); if (i < 0 || fg[i + 3] < 128) continue; sk[0] += fg[i]; sk[1] += fg[i + 1]; sk[2] += fg[i + 2]; sn++;
    }
    var hand = false;
    if (sn > 10) {
      var sr = sk[0] / sn, sg = sk[1] / sn, sb = sk[2] / sn, ss = sr + sg + sb, cr = sr / ss, cg = sg / ss;
      [-1, 1].forEach(function (side) {
        var hit = 0, tot = 0;
        for (var yy = geo.chinY - 0.45 * d; yy <= geo.chinY + 0.1 * d; yy += 1) for (var t = 1.0; t <= 1.7; t += 1 / d) {
          var j = px(geo.cx + side * t * d, yy); if (j < 0) continue; tot++;
          if (fg[j + 3] < 128) continue;
          var s2 = fg[j] + fg[j + 1] + fg[j + 2];
          if (s2 > 0.5 * ss && s2 < 1.7 * ss && Math.abs(fg[j] / s2 - cr) < 0.035 && Math.abs(fg[j + 1] / s2 - cg) < 0.03) hit++;
        }
        if (tot && hit / tot > 0.3) hand = true;
      });
    }
    if (hand) out.push({ id: "hand", level: "warn", text: "Có tay hoặc vật sát mặt. Hãy để hai tay xuôi, không che mặt và cổ." });
    // 3. Vai lệch: so độ cao mép vai hai bên trên mặt nạ
    var shoulder = function (side) {
      var x0 = geo.cx + side * 1.8 * d;
      for (var yy = Math.max(0, geo.chinY - 0.3 * d); yy < h; yy++) { var j = px(x0, yy); if (j < 0) return null; if (fg[j + 3] > 128) return yy; }
      return null;
    };
    var sl = shoulder(-1), sr2 = shoulder(1);
    if (sl != null && sr2 != null && Math.abs(sl - sr2) > 0.4 * d) out.push({ id: "shoulder", level: "info", text: "Hai vai chưa ngang. Nên đứng thẳng, vai thả lỏng, nhìn thẳng vào máy ảnh." });
    return { list: out, teeth: teethFrac, mouthRatio: ratio, hand: hand };
  }

  return { SPECS: SPECS, BGS: BGS, SHEETS: SHEETS, spec: function (id) { return byId[id]; }, mmToPx: mmToPx,
           faceGeometry: faceGeometry, cropRect: cropRect, cropToSource: cropToSource, checks: checks,
           sheetLayout: sheetLayout, cutMarks: cutMarks, setJpegDpi: setJpegDpi, readJpegDpi: readJpegDpi,
           YUNET_SIZE: YUNET_SIZE, yunetInput: yunetInput, yunetDecode: yunetDecode, iou: iou,
           modnetSize: modnetSize, modnetInput: modnetInput, upsample: upsample, boxBlur: boxBlur, refine: refine, crownFromMask: crownFromMask,
           poseChecks: poseChecks };
});
