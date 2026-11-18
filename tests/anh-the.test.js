const test = require("node:test");
const assert = require("node:assert");
const A = require("../site/static/js/anh-the.js");

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps || 1e-6), `${msg || ""} expected ${b}, got ${a}`);

test("spec table is consistent", () => {
  for (const s of A.SPECS) {
    assert.ok(s.head >= s.range[0] && s.head <= s.range[1], s.id + " target head inside range");
    assert.ok(s.top + s.head < s.h, s.id + " chin stays inside the photo");
    assert.ok(s.bgs.every(b => A.BGS[b]), s.id + " backgrounds exist");
  }
  assert.strictEqual(A.spec("ho-chieu").w, 40);
  assert.strictEqual(A.spec("visa-trung").h, 48);
});

test("mm to pixels at 300 dpi", () => {
  assert.deepStrictEqual([A.mmToPx(40), A.mmToPx(60)], [472, 709]);   // 4×6 cm
  assert.deepStrictEqual([A.mmToPx(30), A.mmToPx(40)], [354, 472]);   // 3×4 cm
  assert.strictEqual(A.mmToPx(50.8), 600);                             // 2 inch
  assert.deepStrictEqual([A.mmToPx(101.6), A.mmToPx(152.4)], [1200, 1800]);
});

// Khuôn mặt giả: hai mắt cách nhau 100 px ở y = 400, khoé miệng thấp hơn 100 px
const face = (tilt = 0) => {
  const r = (x, y) => { const c = Math.cos(tilt), s = Math.sin(tilt), dx = x - 500, dy = y - 400; return [500 + dx * c - dy * s, 400 + dx * s + dy * c]; };
  return { box: [400, 280, 200, 300], eyeR: r(450, 400), eyeL: r(550, 400), nose: r(500, 460), mouthR: r(465, 500), mouthL: r(535, 500) };
};

test("face geometry: level eyes, chin and crown estimates", () => {
  const g = A.faceGeometry(face(), null);
  near(g.angle, 0); near(g.cx, 500); near(g.chinY, 560); near(g.crownY, 240); near(g.headPx, 320); near(g.yaw, 0);
  const t = A.faceGeometry(face(0.2), null);
  near(t.angle, 0.2, 1e-9, "tilt recovered"); near(t.chinY, 560, 1e-6, "chin in levelled frame"); near(t.headPx, 320, 1e-6);
  // Crown from the mask is clamped: a tall bun cannot push the crown above 1.15 × eye-to-chin
  near(A.faceGeometry(face(), 0).crownY, 400 - 1.15 * 160);
  near(A.faceGeometry(face(), 230).crownY, 230);
  near(A.faceGeometry(face(), 330).crownY, 400 - 0.85 * 160);
});

test("crop places the head at the spec size and top margin", () => {
  const s = A.spec("ho-chieu"), g = A.faceGeometry(face(), null), c = A.cropRect(s, g);
  near(c.pxPerMM, 320 / 40); near(c.w, 320); near(c.h, 480); near(c.x, 500 - 160); near(c.y, 240 - 5 * 8);
  near(c.headMM, 40); near(c.topMM, 5);
  const z = A.cropRect(s, g, { zoom: 1.1, dy: 1 });                   // zoom in, move the head down 1 mm
  near(z.headMM, 44, 1e-9); near(z.topMM, 6, 1e-9);
});

test("crop maps back to the source through the rotation", () => {
  const s = A.spec("the-3x4"), g = A.faceGeometry(face(0.3), null), c = A.cropRect(s, g);
  // The eye midpoint is the rotation origin, so it must map to itself
  const u = (g.cx - c.x) / c.w, v = (g.cy - c.y) / c.h, p = A.cropToSource(c, u, v);
  near(p[0], 500, 1e-6); near(p[1], 400, 1e-6);
  // Top-centre of the crop sits above the head along the tilted axis
  const top = A.cropToSource(c, u, 0), d = Math.hypot(top[0] - 500, top[1] - 400);
  near(d, g.cy - c.y, 1e-6);
  assert.ok(top[0] > 500, "rotated clockwise for a positive tilt");
});

test("quality checks", () => {
  const s = A.spec("ho-chieu"), g = A.faceGeometry(face(), null);
  assert.deepStrictEqual(A.checks(s, g, A.cropRect(s, g), { w: 2000, h: 2000 }).map(x => x.level), ["warn"]);  // 320 px wide < 75% of 472
  const big = A.faceGeometry({ ...face(), eyeR: [400, 400], eyeL: [600, 400], mouthR: [430, 600], mouthL: [570, 600], nose: [500, 520] }, null);
  assert.deepStrictEqual(A.checks(s, big, A.cropRect(s, big), { w: 3000, h: 3000 }), []);
  const out = A.checks(s, big, A.cropRect(s, big), { w: 900, h: 900 });
  assert.ok(out.some(x => /vượt ra ngoài/.test(x.text)));
  const turned = A.faceGeometry({ ...face(), nose: [530, 460] }, null);
  assert.ok(A.checks(s, turned, A.cropRect(s, turned), { w: 2000, h: 2000 }).some(x => /nhìn thẳng/.test(x.text)));
  assert.ok(A.checks(s, g, A.cropRect(s, g, { zoom: 1.3 }), { w: 2000, h: 2000 }).some(x => /Cỡ đầu/.test(x.text)));
});

test("print sheet layout on 10×15 and A4", () => {
  const L = (id, sheet) => A.sheetLayout(A.spec(id), sheet || "10x15");
  assert.strictEqual(L("the-3x4").count, 9);
  assert.strictEqual(L("ho-chieu").count, 4);
  assert.strictEqual(L("visa-schengen").count, 8);
  assert.ok(L("visa-schengen").landscape);
  assert.strictEqual(L("visa-my").count, 2);
  assert.strictEqual(L("visa-trung").count, 4);
  assert.strictEqual(L("the-3x4", "a4").count, 36);
  for (const id of A.SPECS.map(s => s.id)) for (const sh of ["10x15", "a4"]) {
    const l = L(id, sh);
    assert.ok(l.count >= 1, id + " fits at least once");
    for (const c of l.cells) {
      assert.ok(c.x >= l.margin - 1e-9 && c.y >= l.margin - 1e-9 && c.x + c.w <= l.wmm - l.margin + 1e-9 && c.y + c.h <= l.hmm - l.margin + 1e-9, id + " inside margins");
      assert.ok(c.px.x + c.px.w <= l.wpx && c.px.y + c.px.h <= l.hpx);
    }
    for (let i = 0; i < l.cells.length; i++) for (let j = i + 1; j < l.cells.length; j++) {
      const a = l.cells[i], b = l.cells[j];
      assert.ok(a.x + a.w <= b.x + 1e-9 || b.x + b.w <= a.x + 1e-9 || a.y + a.h <= b.y + 1e-9 || b.y + b.h <= a.y + 1e-9, id + " no overlap");
    }
  }
  const l = L("the-3x4");
  assert.deepStrictEqual([l.wpx, l.hpx], [1200, 1800]);
  near(l.cells[0].x * 2 + 3 * 30 + 2 * 2.4, 101.6, 1e-9, "grid centred");
});

test("cut marks stay outside every photo and inside the sheet", () => {
  for (const id of ["the-3x4", "ho-chieu", "visa-schengen"]) {
    const l = A.sheetLayout(A.spec(id), "10x15"), segs = A.cutMarks(l);
    assert.strictEqual(segs.length, l.count * 8);
    for (const [x1, y1, x2, y2] of segs) {
      for (const t of [0, 0.5, 1]) {
        const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        assert.ok(x >= 0 && y >= 0 && x <= l.wmm && y <= l.hmm, "inside sheet");
        for (const c of l.cells) assert.ok(!(x > c.x + 1e-9 && x < c.x + c.w - 1e-9 && y > c.y + 1e-9 && y < c.y + c.h - 1e-9), "not on a photo");
      }
    }
  }
});

test("JPEG dpi: patch JFIF, or insert APP0 when missing", () => {
  const jfif = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xFF, 0xDB, 0, 4, 9, 9, 0xFF, 0xD9]);
  const p = A.setJpegDpi(jfif, 300);
  assert.strictEqual(p.length, jfif.length); assert.strictEqual(A.readJpegDpi(p), 300); assert.strictEqual(p[16] * 256 + p[17], 300);
  assert.strictEqual(jfif[13], 0, "input untouched");
  const exif = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, 0, 4, 1, 2, 0xFF, 0xD9]);
  const q = A.setJpegDpi(exif, 300);
  assert.strictEqual(q.length, exif.length + 18); assert.strictEqual(A.readJpegDpi(q), 300);
  assert.deepStrictEqual([...q.subarray(20)], [...exif.subarray(2)], "rest of file preserved");
  assert.throws(() => A.setJpegDpi(new Uint8Array([1, 2, 3]), 300));
});

test("YuNet letterbox input and decoding with NMS", () => {
  const w = 4, h = 2, rgba = new Uint8ClampedArray(w * h * 4);
  rgba.set([10, 20, 30, 255], 0);
  const inp = A.yunetInput(rgba, w, h), P = 640 * 640;
  near(inp.scale, 160);
  assert.deepStrictEqual([inp.data[0], inp.data[P], inp.data[2 * P]], [30, 20, 10], "BGR order");
  assert.strictEqual(inp.data[400 * 640 + 10], 0, "padding below the image");
  const mk = (n, k) => new Float32Array(n * k);
  const outs = {};
  for (const st of [8, 16, 32]) { const n = (640 / st) ** 2; outs["cls_" + st] = mk(n, 1); outs["obj_" + st] = mk(n, 1); outs["bbox_" + st] = mk(n, 4); outs["kps_" + st] = mk(n, 10); }
  const put = (st, r, c, score) => { const i = r * (640 / st) + c; outs["cls_" + st][i] = score; outs["obj_" + st][i] = score; outs["bbox_" + st].set([0.5, 0.5, Math.log(4), Math.log(4)], i * 4);
    outs["kps_" + st].set([0.2, 0.3, 0.8, 0.3, 0.5, 0.5, 0.3, 0.7, 0.7, 0.7], i * 10); };
  put(16, 10, 20, 0.9); put(16, 10, 21, 0.8);   // overlapping duplicate, suppressed by NMS
  put(32, 2, 2, 0.95); put(8, 0, 0, 0.3);         // second face; one below threshold
  const f = A.yunetDecode(outs, 2, 0.6);
  assert.strictEqual(f.length, 2);
  near(f[0].score, 0.95, 1e-6);
  near(f[1].box[0], ((20 + 0.5) * 16 - 32) / 2, 1e-4); near(f[1].box[2], 32, 1e-4);
  near(f[1].eyeR[0], (20 + 0.2) * 16 / 2, 1e-4); near(f[1].mouthL[1], (10 + 0.7) * 16 / 2, 1e-4);
});

test("MODNet sizing, normalisation and upsampling", () => {
  assert.deepStrictEqual(A.modnetSize(1200, 1600, 640), { w: 480, h: 640 });
  assert.deepStrictEqual(A.modnetSize(1000, 333, 512), { w: 512, h: 160 });
  const rgba = new Uint8ClampedArray([0, 255, 127.5, 255, 0, 255, 127.5, 255, 0, 255, 127.5, 255, 0, 255, 127.5, 255]);
  const t = A.modnetInput(rgba, 2, 2, 2, 2);
  near(t[0], -1); near(t[4], 1); near(t[8], 0, 0.01);
  const up = A.upsample(new Float32Array([0, 1, 0, 1]), 2, 2, 4, 4);
  near(up[0], 0); near(up[3], 1); assert.ok(up[1] > 0 && up[1] < 0.5);
});

test("edge refinement removes the old background colour", () => {
  // 20×20: left half pink background (alpha 0), right half dark hair (alpha 1), one mixed column (alpha 0.5)
  const w = 20, h = 20, rgba = new Uint8ClampedArray(w * h * 4), alpha = new Float32Array(w * h);
  const pink = [220, 150, 160], hair = [30, 25, 20];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = x < 9 ? 0 : x === 9 ? 0.5 : 1;
    alpha[i] = a;
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.round(a * hair[c] + (1 - a) * pink[c]);
  }
  const out = A.refine(rgba, alpha, w, h);
  const px = (x, y) => [...out.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)];
  assert.strictEqual(px(2, 10)[3], 0);                          // background fully transparent
  assert.deepStrictEqual(px(15, 10), [30, 25, 20, 255]);        // solid hair untouched
  const m = px(9, 10);
  assert.strictEqual(m[3], 128);
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(m[c] - hair[c]) <= 2, "mixed pixel recovers the hair colour, not pink");
});

test("crown from mask", () => {
  const w = 10, h = 10, a = new Float32Array(w * h);
  for (let y = 3; y < h; y++) for (let x = 3; x < 7; x++) a[y * w + x] = 1;
  a[0 * w + 9] = 1;                                            // a stray pixel outside the band is ignored
  assert.strictEqual(A.crownFromMask(a, w, h, 5, 2, 8), 3);
  assert.strictEqual(A.crownFromMask(new Float32Array(100), w, h, 5, 2, 8), null);
});

test("pose checks: smile, hand near the face, uneven shoulders", () => {
  // 400×400 synthetic portrait: eyes at y=150 (100 px apart), mouth corners at y=250, skin face, background transparent
  const w = 400, h = 400, d = 100, skin = [225, 180, 150];
  const mk = () => { const a = new Uint8ClampedArray(w * h * 4);
    const put = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a.set([...c, 255], (y * w + x) * 4); };
    put(140, 80, 260, 320, skin);                       // face + neck
    put(0, 340, 400, 400, [40, 60, 120]);               // shoulders (shirt)
    return { a, put }; };
  const f = { box: [140, 80, 120, 240], eyeR: [150, 150], eyeL: [250, 150], nose: [200, 200], mouthR: [165, 250], mouthL: [235, 250] };
  const g = A.faceGeometry(f, null);
  const clean = mk(); assert.deepStrictEqual(A.poseChecks(clean.a, w, h, f, g).list, []);
  const smile = mk(); smile.put(180, 243, 220, 262, [245, 245, 240]);
  assert.deepStrictEqual(A.poseChecks(smile.a, w, h, f, g).list.map(x => x.id), ["smile"]);
  const hand = mk(); hand.put(300, 270, 380, 320, skin);
  assert.deepStrictEqual(A.poseChecks(hand.a, w, h, f, g).list.map(x => x.id), ["hand"]);
  const tilt = mk(); for (let y = 290; y < 340; y++) for (let x = 0; x < 60; x++) tilt.a.set([40, 60, 120, 255], (y * w + x) * 4);
  assert.deepStrictEqual(A.poseChecks(tilt.a, w, h, f, g).list.map(x => x.id), ["shoulder"]);
});
