/* Web Worker cho trang Ảnh thẻ: tải mô hình (có lưu đệm), dò khuôn mặt (YuNet) và tách nền (MODNet) ngay trên máy.
 * Không gửi ảnh đi đâu: chỉ tải về các tệp mô hình tĩnh của chính trang web.
 * Tin nhắn vào:  { type: "init", engine, ort, base }     → "progress" … "ready"
 *                { type: "process", rgba, w, h, side }    → "result" { faces, fg, crown, ms }
 */
var MODELS = {
  wasm: { url: "/js/ort-1.22.0/ort-wasm-simd-threaded.wasm", size: 11210254 },
  yunet: { url: "/models/yunet-2023mar.onnx", size: 232589 },
  modnet: { url: "/models/modnet-w8-v1.onnx", size: 6661593 }
};
var CACHE = "anh-the-models-v1", sessions = null, loading = null;

function post(type, data, transfer) { self.postMessage(Object.assign({ type: type }, data || {}), transfer || []); }

// Tải tệp, báo tiến độ; lưu vào Cache Storage để lần sau dùng ngay (cả khi mất mạng)
async function fetchCached(key, onBytes) {
  var url = MODELS[key].url, cache = null;
  try { cache = await caches.open(CACHE); var hit = await cache.match(url); if (hit) { var b = await hit.arrayBuffer(); onBytes(b.byteLength); return b; } } catch (e) { cache = null; }
  var res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  var chunks = [], got = 0;
  if (res.body && res.body.getReader) {
    var reader = res.body.getReader();
    for (;;) { var r = await reader.read(); if (r.done) break; chunks.push(r.value); got += r.value.length; onBytes(r.value.length); }
  } else { var whole = new Uint8Array(await res.arrayBuffer()); chunks.push(whole); got = whole.length; onBytes(got); }
  var buf = new Uint8Array(got), off = 0;
  chunks.forEach(function (c) { buf.set(c, off); off += c.length; });
  if (cache) { try { await cache.put(url, new Response(buf.slice(0), { headers: { "Content-Type": "application/octet-stream" } })); } catch (e) {} }
  return buf.buffer;
}

async function init(msg) {
  importScripts(msg.engine, msg.ort);
  ort.env.wasm.numThreads = 1;                     // GitHub Pages không bật cross-origin isolation, chạy một luồng
  ort.env.wasm.wasmPaths = msg.base;
  var total = MODELS.wasm.size + MODELS.yunet.size + MODELS.modnet.size, done = 0, last = 0;
  var tick = function (n) { done += n; var now = Date.now(); if (now - last > 120 || done >= total) { last = now; post("progress", { done: Math.min(done, total), total: total }); } };
  var bufs = await Promise.all([fetchCached("wasm", tick), fetchCached("yunet", tick), fetchCached("modnet", tick)]);
  ort.env.wasm.wasmBinary = bufs[0];
  var opt = { executionProviders: ["wasm"], graphOptimizationLevel: "all" };
  var yunet = await ort.InferenceSession.create(bufs[1], opt);
  var modnet = await ort.InferenceSession.create(bufs[2], opt);
  sessions = { yunet: yunet, modnet: modnet };
}

async function processImage(msg) {
  var t0 = Date.now(), w = msg.w, h = msg.h, rgba = new Uint8ClampedArray(msg.rgba);
  var yi = AnhThe.yunetInput(rgba, w, h);
  var yo = await sessions.yunet.run({ input: new ort.Tensor("float32", yi.data, [1, 3, AnhThe.YUNET_SIZE, AnhThe.YUNET_SIZE]) });
  var outs = {}; for (var k in yo) outs[k] = yo[k].data;
  var faces = AnhThe.yunetDecode(outs, yi.scale, 0.6);
  var t1 = Date.now();
  post("stage", { stage: "matting", faces: faces.length });
  var sz = AnhThe.modnetSize(w, h, msg.side || 640);
  var mo = await sessions.modnet.run({ input: new ort.Tensor("float32", AnhThe.modnetInput(rgba, w, h, sz.w, sz.h), [1, 3, sz.h, sz.w]) });
  var alpha = AnhThe.upsample(mo.output.data, sz.w, sz.h, w, h);
  var t2 = Date.now();
  var crown = null;
  if (faces.length) { var g = AnhThe.faceGeometry(faces[0], null); crown = AnhThe.crownFromMask(alpha, w, h, g.cx, g.eyeDist * 0.4, g.cy); }
  var fg = AnhThe.refine(rgba, alpha, w, h);
  post("result", { faces: faces, fg: fg.buffer, crown: crown, w: w, h: h, ms: { face: t1 - t0, matting: t2 - t1, refine: Date.now() - t2 } }, [fg.buffer]);
}

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type === "init") {
    if (!loading) loading = init(msg).then(function () { post("ready"); }, function (err) { loading = null; post("error", { stage: "load", message: String(err && err.message || err) }); });
    else loading.then(function () { if (sessions) post("ready"); });
  } else if (msg.type === "process") {
    (loading || Promise.reject(new Error("not initialised"))).then(function () { return processImage(msg); })
      .catch(function (err) { post("error", { stage: "process", message: String(err && err.message || err) }); });
  }
};
