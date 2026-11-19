/* Địa chỉ trước và sau sắp xếp đơn vị hành chính 2025 (dữ liệu: dia-chi-data.js, sinh từ data/hanh-chinh/).
 *
 * DiaChi.normalise(address)  tách địa chỉ thành số nhà/đường (giữ nguyên), xã/phường, quận/huyện, tỉnh/thành phố;
 *                            hiểu chữ có dấu và không dấu, viết tắt P./Q./TX/TP/H./X./TT, "P5" = "phường 5", thừa dấu cách
 * DiaChi.oldToNew(address)   địa chỉ cũ -> địa chỉ mới, kèm mức tin cậy; đơn vị cũ bị chia thì trả mọi đơn vị mới nhận phần
 * DiaChi.newToOld(unit)      đơn vị mới -> các đơn vị cũ hợp thành (toàn bộ / một phần / phần còn lại)
 * DiaChi.region(unit)        vùng lương tối thiểu và mức lương theo năm
 * DiaChi.search(text, opts)  gợi ý đơn vị mới và cũ khi gõ
 * unit: mã 5 số ("26734"), đối tượng đơn vị, hoặc tên ("Phường Sài Gòn, TP.HCM").
 */
(function (root, f) {
  if (typeof module === "object" && module.exports) module.exports = f(require("./dia-chi-data.js"));
  else root.DiaChi = f(root.DiaChiData);
})(typeof self !== "undefined" ? self : this, function (RAW) {
  "use strict";
  var NEW_T = ["xã", "phường", "đặc khu"], OLD_T = ["xã", "phường", "thị trấn", "huyện", "khu vực"];
  var FORMATION = ["sap-xep", "giu-nguyen", "doi-ten", "dac-khu-tu-huyen"], PORTION = ["toan-bo", "mot-phan", "phan-con-lai"];
  var REG = ["I", "II", "III", "IV"];

  // ---------- chữ ----------
  var nfc = function (s) { return String(s == null ? "" : s).normalize("NFC"); };
  var MARKS = /[̀-ͯ]/g;
  var hasMarks = function (s) { return /[^\x00-\x7f]/.test(nfc(s).replace(/[’‘ʼ´–—]/g, "")); };
  var TONE = { "òa": "oà", "óa": "oá", "ỏa": "oả", "õa": "oã", "ọa": "oạ", "òe": "oè", "óe": "oé", "ỏe": "oẻ", "õe": "oẽ", "ọe": "oẹ",
               "ùy": "uỳ", "úy": "uý", "ủy": "uỷ", "ũy": "uỹ", "ụy": "uỵ" };
  var ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  function words(s, keepMarks) {
    s = nfc(s).toLowerCase().replace(/[’'`´ʼ‘]/g, "");
    if (keepMarks) s = s.replace(/(òa|óa|ỏa|õa|ọa|òe|óe|ỏe|õe|ọe|ùy|úy|ủy|ũy|ụy)/g, function (m) { return TONE[m]; });
    else s = s.replace(/đ/g, "d").normalize("NFD").replace(MARKS, "");
    var w = s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
    return w.map(function (t, i) {
      if (/^\d+$/.test(t)) return String(+t);
      if (i === w.length - 1 && i > 0 && ROMAN[t] && !keepMarks) return String(ROMAN[t]);
      if (i === w.length - 1 && i > 0 && keepMarks && ROMAN[t]) return String(ROMAN[t]);
      return t;
    });
  }
  // fkey: không dấu, không cách ("Bến Nghé" -> "bennghe"); akey: giữ dấu, thống nhất vị trí dấu ("Hoà" = "Hòa")
  var fkey = function (s) { return words(s).join(""); };
  var akey = function (s) { return words(s, true).join(" "); };
  var fold = function (s) { return words(s).join(" "); };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  // Damerau–Levenshtein (hoán vị kề nhau tính 1 lỗi), dừng sớm khi vượt max
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var best = max + 1;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
        d[i][j] = v; if (v < best) best = v;
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  var maxTypos = function (k) { return k.length >= 9 ? 2 : k.length >= 4 ? 1 : 0; };

  // ---------- dữ liệu ----------
  var D = {};
  function load(raw) {
    var stripP = function (n) { return n.replace(/^(Tỉnh|Thành phố|Thủ đô) /, ""); };
    D.v = raw.v;
    D.wage = {};
    Object.keys(raw.W).forEach(function (y) {
      var w = raw.W[y], m = {}, h = {};
      REG.forEach(function (r, i) { m[r] = w[2][i]; h[r] = w[3][i]; });
      D.wage[y] = { year: +y, decree: w[0], from: w[1], monthly: m, hourly: h };
    });
    D.P = raw.P.map(function (p, i) {
      return { i: i, id: p[0], fullName: p[1], name: stripP(p[1]), slug: p[2], resolution: p[3], url: p[4], becameCity: p[5] || null, oldQ: {} };
    });
    D.Q = raw.Q.map(function (q, i) { return { i: i, id: q[0], fullName: q[1], name: stripP(q[1]) }; });
    D.D = raw.D.map(function (d, i) {
      var m = d[1].match(/^(Quận|Huyện|Thị xã|Thành phố) (.+)$/);
      return { i: i, id: d[0], fullName: d[1], type: m ? m[1].toLowerCase() : null, name: m ? m[2] : d[1], q: d[2] };
    });
    D.O = raw.O.map(function (o, i) {
      var t = OLD_T[o[1]];
      return { i: i, code: o[0] || null, type: t, name: o[2], fullName: t === "khu vực" ? o[2] : cap(t) + " " + o[2], d: o[3], q: o[4], alt: o[5] || null, links: [] };
    });
    D.U = raw.U.map(function (u, i) {
      var t = NEW_T[u[2]], x = { i: i, id: u[0], p: u[1], type: t, name: u[3], fullName: cap(t) + " " + u[3], r: { 2026: u[4], 2027: u[5] },
        formation: FORMATION[u[6]], clause: u[7] || null, typeBefore: u[8] >= 0 ? NEW_T[u[8]] : null, typeChange: u[9] || null, slug: u[11], links: [] };
      for (var k = 0; k < u[10].length; k += 2) {
        var o = D.O[u[10][k]];
        x.links.push({ o: o.i, portion: PORTION[u[10][k + 1]] });
        o.links.push({ u: i, portion: PORTION[u[10][k + 1]] });
        D.P[u[1]].oldQ[o.q] = true;
      }
      return x;
    });
    // chỉ mục tra nhanh
    var add = function (map, k, v) { (map[k] = map[k] || []).push(v); };
    D.oF = {}; D.oAlt = {}; D.uF = {}; D.dF = {}; D.qF = {}; D.pF = {};
    D.O.forEach(function (o) { o.f = fkey(o.name); o.a = akey(o.name); add(D.oF, o.f, o.i); if (o.alt) { o.altF = fkey(o.alt.replace(/^(Xã|Phường|Thị trấn) /, "")); add(D.oAlt, o.altF, o.i); } });
    D.U.forEach(function (u) { u.f = fkey(u.name); u.a = akey(u.name); add(D.uF, u.f, u.i); });
    D.D.forEach(function (d) { d.f = fkey(d.name); add(D.dF, d.f, d.i); });
    D.Q.forEach(function (q) { add(D.qF, fkey(q.name), q.i); });
    D.P.forEach(function (p) { add(D.pF, fkey(p.name), p.i); });
    return D;
  }
  load(RAW);

  // Tên tỉnh viết tắt hay dùng (khoá không dấu, không cách)
  var PROV_ALIAS = { hcm: "hochiminh", tphcm: "hochiminh", tphochiminh: "hochiminh", saigon: "hochiminh", sg: "hochiminh", tpsg: "hochiminh",
    hn: "hanoi", tphn: "hanoi", hp: "haiphong", tphp: "haiphong", brvt: "bariavungtau", thuathienhue: "hue", tthue: "hue", tthué: "hue",
    daclac: "daklak", dacnong: "daknong", dnang: "danang", tpdn: "danang", ct: "cantho", tpct: "cantho" };
  function provinceKey(name) { var k = fkey(name); return PROV_ALIAS[k] || k; }
  /* Tỉnh trong địa chỉ -> các tỉnh cũ có thể (tên tỉnh cũ, hoặc tên tỉnh mới thì mọi tỉnh cũ hợp thành) */
  function matchProvince(name) {
    var k = provinceKey(name), q = {}, any = false, p = (D.pF[k] || []).map(function (i) { return D.P[i]; });
    (D.qF[k] || []).forEach(function (i) { q[i] = 2; any = true; });
    p.forEach(function (pp) { Object.keys(pp.oldQ).forEach(function (i) { if (!q[i]) q[i] = 1; any = true; }); });
    var exact = (D.qF[k] || [])[0];
    return any ? { q: q, p: p, name: name, label: exact !== undefined ? D.Q[exact].fullName : p[0].fullName } : null;
  }

  // ---------- tách địa chỉ ----------
  var LEVEL = { "phường": "c", "xã": "c", "thị trấn": "c", "đặc khu": "c", "quận": "d", "huyện": "d", "thị xã": "d", "thành phố": "d", "tỉnh": "p", "thủ đô": "p" };
  var FULL = [["thị", "trấn"], ["thị", "xã"], ["thành", "phố"], ["đặc", "khu"], ["thủ", "đô"], ["phường"], ["xã"], ["quận"], ["huyện"], ["tỉnh"]];
  var ABBR = { p: "phường", ph: "phường", f: "phường", x: "xã", tt: "thị trấn", q: "quận", h: "huyện", tx: "thị xã", tp: "thành phố", dk: "đặc khu", đk: "đặc khu" };

  function prep(s) {
    s = nfc(s).replace(/[\s ]+/g, " ").trim();
    s = s.replace(/b[aà]\s+r[iị]a\s*[-–]\s*v[uũ]ng\s+t[aà]u/gi, function (m) { return m.replace(/\s*[-–]\s*/, " - ").replace(" - ", " "); });
    s = s.replace(/(^|[\s,;(])(p|ph|q|h|x|tx|tt|tp|đk)\.(?=[^\s.])/gi, "$1$2. ");        // "P.Bến Nghé" -> "P. Bến Nghé"
    s = s.replace(/(^|[\s,;(])([pqf])\.?\s*0*(\d{1,2})(?=$|[\s,;.)])/gi, "$1$2 $3");      // "P5", "P.05", "Q.1" -> "P 5", "Q 1"
    s = s.replace(/(^|[\s,;(])t\.p\.?\s*/gi, "$1TP. ");
    return s;
  }
  // tiền tố loại đơn vị tại vị trí i: {n: số chữ, type, sure}
  function prefixAt(ws, i, noMarks) {
    var lo = ws.map(function (w) { return w.toLowerCase().replace(/\.$/, ""); });
    for (var k = 0; k < FULL.length; k++) {
      var f = FULL[k], ok = true, okF = true;
      for (var j = 0; j < f.length; j++) {
        if (lo[i + j] !== f[j]) ok = false;
        if (lo[i + j] === undefined || fold(lo[i + j]) !== fold(f[j]) || hasMarks(lo[i + j])) okF = false;
      }
      if (i + f.length >= ws.length) continue;                 // phải còn tên phía sau
      if (ok) return { n: f.length, type: f.join(" "), sure: true };
      if (okF && noMarks) return { n: f.length, type: f.join(" "), sure: false };
    }
    var a = lo[i], t = ABBR[a];
    if (t && i + 1 < ws.length) {
      if (a === "tt" && /^hu[eế]$/i.test(ws[i + 1])) return null;           // TT Huế = Thừa Thiên Huế
      if (a === "f" && !/^\d+$/.test(ws[i + 1])) return null;
      return { n: 1, type: t, sure: /\.$/.test(ws[i]) || /^\d+$/.test(ws[i + 1]) };
    }
    return null;
  }
  function mkPart(ws, pre) {
    var raw = ws.join(" ");
    if (!pre) return { raw: raw, type: null, level: null, name: raw.replace(/^[.\s]+|[.\s]+$/g, ""), sure: false };
    var name = ws.slice(pre.n).join(" ").replace(/^[.\s]+|[.\s]+$/g, "");
    if (/^\d+$/.test(name)) name = String(+name);                           // "Phường 05" = "Phường 5"
    return { raw: raw, type: pre.type, level: LEVEL[pre.type], name: name, sure: pre.sure };
  }

  function normalise(address) {
    var s = prep(address), noMarks = !hasMarks(s);
    // dấu gạch chỉ tách phần khi không có dấu phẩy (tên có gạch: "Văn Miếu - Quốc Tử Giám")
    var segs = s.split(/[,;\n]/.test(s) ? /\s*[,;\n]\s*/ : /\s*[,;\n]\s*|\s+[-–]\s+/).filter(function (x) { return x.replace(/[\s.]/g, ""); });
    var parts = [];
    segs.forEach(function (seg) {
      var ws = seg.split(" "), start = 0, pre = prefixAt(ws, 0, noMarks);
      for (var i = 1; i < ws.length; i++) {
        var p = prefixAt(ws, i, noMarks);
        if (p && (p.n === 1 && ABBR[ws[i].toLowerCase().replace(/\.$/, "")] ? true : p.sure || noMarks) && !prefixAt(ws, i - 1, noMarks)) {
          parts.push(mkPart(ws.slice(start, i), pre)); start = i; pre = p; i += p.n - 1;
        }
      }
      parts.push(mkPart(ws.slice(start), pre));
    });
    // tên tỉnh dính ở cuối phần cuối ("Q 1 TPHCM", "ben nghe hcm")
    var last = parts[parts.length - 1];
    if (last && !(last.level === "p" || (last.level !== "c" && matchProvince(last.name)))) {
      var ws = last.raw.split(" ");
      for (var n = Math.min(4, ws.length - 1); n >= 1; n--) {
        var tail = ws.slice(ws.length - n), m = matchProvince(tail.join(" "));
        if (m && provinceKey(tail.join(" ")).length >= 2) {
          var headWs = ws.slice(0, ws.length - n), pre0 = last.type ? { n: last.raw.split(" ").length - last.name.split(" ").length, type: last.type, sure: last.sure } : null;
          if (pre0 && headWs.length <= pre0.n) break;
          parts[parts.length - 1] = mkPart(headWs, pre0);
          parts.push(mkPart(tail, null));
          break;
        }
      }
    }
    // vai trò: tỉnh (phải nhất), quận/huyện, xã/phường; phần còn lại bên trái là số nhà, đường
    var r = { input: String(address == null ? "" : address), parts: parts, street: "", commune: null, district: null, province: null, loose: [] };
    var i = parts.length - 1;
    if (i >= 0) {
      var p = parts[i];
      if (p.level === "p" || ((p.level === null || p.type === "thành phố") && matchProvince(p.name))) { p.level = "p"; r.province = p; i--; }
    }
    for (var j = i; j >= 0; j--) if (parts[j].level === "d") { r.district = parts[j]; i = j - 1; break; }
    if (!r.district && r.province && r.province.type === "thành phố" && parts.length > 1 && i >= 0 && parts[i].level === "p") { /* "TP X, Tỉnh Y" đã xử lý ở trên */ }
    var ci = -1;
    for (j = i; j >= 0; j--) if (parts[j].level === "c") { ci = j; break; }
    if (ci >= 0) {
      r.commune = parts[ci]; r.street = parts.slice(0, ci).map(function (x) { return x.raw; }).join(", ");
      // "Phường Hàng Trống, Hoàn Kiếm, Hà Nội": phần không ghi loại ngay sau xã/phường là quận, huyện
      if (!r.district && ci + 1 <= i && parts[ci + 1].level === null) r.district = parts[ci + 1];
    } else {
      for (j = i; j >= 0; j--) if (parts[j].level === null) r.loose.push({ part: parts[j], index: j });
      r.street = parts.slice(0, i + 1).map(function (x) { return x.raw; }).join(", ");
    }
    var label = function (x) { return x.type ? cap(x.type) + " " + x.name : x.name; };
    var pm = r.province && matchProvince(r.province.name);
    r.text = [r.street, r.commune && label(r.commune), r.district && label(r.district), r.province && (pm ? pm.label : label(r.province))].filter(Boolean).join(", ");
    return r;
  }

  // ---------- đối tượng trả ra ----------
  function provObj(p) { return { id: p.id, name: p.name, fullName: p.fullName, slug: p.slug, resolution: p.resolution, url: p.url, becameCity: p.becameCity }; }
  function unitObj(u) {
    var p = D.P[u.p];
    return { id: u.id, name: u.name, type: u.type, fullName: u.fullName, province: provObj(p), formation: u.formation,
      resolution: p.resolution, clause: u.clause, url: p.url, typeBefore: u.typeBefore, typeChange: u.typeChange,
      region: { 2026: u.r[2026], 2027: u.r[2027] }, url: "/dia-chi-moi/" + p.slug + "/" + u.slug + "/" };
  }
  function oldObj(o) {
    var d = o.d >= 0 ? D.D[o.d] : null, q = D.Q[o.q];
    return { code: o.code, type: o.type, name: o.name, fullName: o.fullName, otherSpelling: o.alt,
      district: d ? d.fullName : null, districtId: d ? d.id : null, province: q.fullName, provinceId: q.id,
      label: [o.fullName, d && o.type !== "huyện" && d.fullName, q.fullName].filter(Boolean).join(", ") };
  }
  function newAddress(street, u) { return [street, u.fullName, D.P[u.p].fullName].filter(Boolean).join(", "); }

  // ---------- cũ -> mới ----------
  var OLD_TYPE_OF = { "phường": "phường", "xã": "xã", "thị trấn": "thị trấn" };
  function matchDistrict(part, provQ, notes) {
    var k = fkey(part.name), out = (D.dF[k] || []).filter(function (i) { return !provQ || provQ[D.D[i].q]; });
    if (part.type && out.length > 1) {
      var same = out.filter(function (i) { return D.D[i].type === part.type; });
      if (same.length) out = same;
    }
    if (!out.length && /^(2|9|thuduc)$/.test(k) && (!provQ || Object.keys(provQ).some(function (q) { return D.Q[q].name === "Hồ Chí Minh"; }))) {
      out = D.D.filter(function (d) { return d.fullName === "Thành phố Thủ Đức"; }).map(function (d) { return d.i; });
      if (out.length) notes.push("Quận 2, Quận 9 và quận Thủ Đức đã hợp thành thành phố Thủ Đức từ năm 2021; tra theo thành phố Thủ Đức.");
    }
    if (!out.length && maxTypos(k)) {
      var best = maxTypos(k) + 1, found = [];
      D.D.forEach(function (d) {
        if (provQ && !provQ[d.q]) return;
        var x = dist(k, d.f, maxTypos(k));
        if (x < best) { best = x; found = [d.i]; } else if (x === best) found.push(d.i);
      });
      if (found.length === 1) { out = found; notes.push("Đọc '" + part.name + "' là " + D.D[found[0]].fullName + "."); }
    }
    return out;
  }

  // marks: người dùng gõ có dấu (cả địa chỉ), khi đó tên đúng dấu được ưu tiên hơn tên chỉ giống khi bỏ dấu
  function scoreCandidates(name, ptype, scope, marks) {
    var f = fkey(name), a = akey(name), seen = {}, out = [];
    var push = function (i, how, s) { if (seen[i] !== undefined && out[seen[i]].s >= s) return; var o = D.O[i]; if (o.type === "huyện") return;
      if (scope.q && !scope.q[o.q]) return;
      if (seen[i] !== undefined) out[seen[i]] = { o: o, how: how, s: s }; else { seen[i] = out.length; out.push({ o: o, how: how, s: s }); } };
    (D.oF[f] || []).forEach(function (i) { var o = D.O[i]; push(i, o.a === a ? "exact" : "fold", o.a === a ? 4 : marks ? 2.5 : 3.5); });
    (D.oAlt[f] || []).forEach(function (i) { push(i, "alt", 2.5); });
    if (!out.length && maxTypos(f)) {
      var lim = maxTypos(f);
      D.O.forEach(function (o) {
        if (o.type === "huyện") return;
        if (scope.q && !scope.q[o.q]) return;
        if (scope.d && !scope.d[o.d]) return;
        if (!scope.q && !scope.d && f.length < 6) return;
        var x = dist(f, o.f, lim);
        if (x <= lim) push(o.i, "typo", x === 1 ? 1.5 : 1);
      });
    }
    out.forEach(function (c) {
      if (ptype && OLD_TYPE_OF[ptype]) c.s += OLD_TYPE_OF[ptype] === c.o.type ? 1 : -1;
      if (scope.d) c.s += scope.d[c.o.d] ? 3 : -4;
      if (scope.q) c.s += scope.q[c.o.q] === 2 ? 2 : 1.5;
    });
    return out;
  }
  function resultsFor(o, street) {
    return o.links.map(function (l) { var u = D.U[l.u]; return { unit: unitObj(u), portion: l.portion, address: newAddress(street, u) }; });
  }
  var RANK = { high: 3, medium: 2, low: 1 };
  var lower = function (a, b) { return RANK[a] <= RANK[b] ? a : b; };

  function oldToNew(address) {
    var n = normalise(address), notes = [], scope = {};
    var res = { input: n.input, parsed: n, status: "not-found", confidence: "low", notes: notes, street: n.street, old: null, results: [], candidates: [] };
    if (!n.parts.length) return res;
    var prov = n.province ? matchProvince(n.province.name) : null, provUnknown = null;
    if (n.province && !prov) provUnknown = n.province;
    var provLabel = prov ? prov.label : "";
    var pIndex = n.province ? n.parts.indexOf(n.province) : n.parts.length;
    var streetBefore = function (j) { return n.parts.slice(0, j).map(function (x) { return x.raw; }).join(", "); };
    // Một cách hiểu địa chỉ: phần nào là xã/phường, phần nào là quận/huyện
    var tries = [];
    var distFor = function (j) {
      if (n.district) return n.district;
      for (var k = j + 1; k < pIndex; k++) if (n.parts[k].level === null) return n.parts[k];
      return provUnknown;              // "Phường Linh Trung, Thủ Đức": phần cuối không phải tỉnh thì là quận, huyện
    };
    if (n.commune) {
      var cj = n.parts.indexOf(n.commune);
      tries.push({ name: n.commune.name, type: n.commune.type, street: n.street, dist: distFor(cj) });
      if (!n.commune.sure) tries.push({ name: n.commune.raw, type: null, street: n.street, dist: distFor(cj) });
    }
    n.loose.forEach(function (l) { tries.push({ name: l.part.name, type: null, street: streetBefore(l.index), dist: distFor(l.index) }); });
    if (!tries.length && (n.district || provUnknown)) tries.push({ name: "", type: null, street: n.street, dist: n.district || provUnknown });
    var attempt = function (tr) {
      var sc = {}, nt = [], at = { tr: tr, scope: sc, notes: nt, distOk: false, distBad: false, cands: [] };
      if (prov) sc.q = prov.q;
      if (tr.dist) {
        var ds = matchDistrict(tr.dist, sc.q, nt);
        if (ds.length) { sc.d = {}; ds.forEach(function (i) { sc.d[i] = true; }); at.distOk = true; }
        else if (tr.dist.level === "d") { at.distBad = true; nt.push("Không tìm thấy quận, huyện cũ '" + tr.dist.name + "'" + (prov ? " ở " + provLabel : "") + "; bỏ qua phần này."); }
      }
      if (tr.name) at.cands = scoreCandidates(tr.name, tr.type, sc, hasMarks(n.input));
      // đặc khu lập từ cả huyện (Côn Đảo, Lý Sơn…): chỉ ghi huyện
      if (!at.cands.length && sc.d) D.O.forEach(function (o) { if (o.type === "huyện" && sc.d[o.d]) at.cands.push({ o: o, how: "exact", s: 9 }); });
      at.cands.sort(function (x, y) { return y.s - x.s || (x.o.code || "").localeCompare(y.o.code || ""); });
      at.best = at.cands.length ? at.cands[0].s : -99;
      return at;
    };
    var best = null;
    tries.forEach(function (tr, k) { var at = attempt(tr); at.k = k; if (at.cands.length && (!best || at.best > best.best + 0.01)) best = at; });
    if (provUnknown && !(best && best.tr.dist === provUnknown && best.distOk)) notes.push("Không nhận ra tỉnh, thành phố '" + provUnknown.name + "'; bỏ qua phần này.");
    if (!best) {
      // có thể đã là địa chỉ mới
      var guess = findNew(address);
      if (guess.units.length) {
        res.status = "already-new"; res.confidence = guess.units.length === 1 ? "medium" : "low";
        res.results = guess.units.map(function (u) { return { unit: unitObj(u), portion: null, address: newAddress(guess.street, u) }; });
        notes.push("Không có đơn vị cũ nào tên như vậy, nhưng có đơn vị mới trùng tên: có thể đây đã là địa chỉ mới.");
      }
      return res;
    }
    Array.prototype.push.apply(notes, best.notes);
    var used = best.tr, scope = best.scope, distOk = best.distOk, distBad = best.distBad, cands = best.cands;
    res.street = used.street;
    var top = cands.filter(function (c) { return c.s >= cands[0].s - 0.01; });
    var sig = function (c) { return c.o.links.map(function (l) { return D.U[l.u].id; }).sort().join(","); };
    var groups = {}; top.forEach(function (c) { groups[sig(c)] = true; });
    res.candidates = (top.length > 12 ? top : cands.slice(0, 12)).map(function (c) { return { old: oldObj(c.o), match: c.how, score: c.s, results: resultsFor(c.o, used.street) }; });
    if (Object.keys(groups).length > 1) {
      res.status = "ambiguous"; res.confidence = "low";
      notes.push("Có " + top.length + " đơn vị cũ khớp với '" + (used.name || used.dist.name) + "'. Ghi thêm quận, huyện" + (prov ? "" : " và tỉnh") + " cũ để chọn đúng.");
      return res;
    }
    var c = top[0];
    res.status = "found"; res.old = oldObj(c.o); res.results = resultsFor(c.o, used.street);
    var conf = "high", where = c.o.d >= 0 ? D.D[c.o.d].fullName + ", " + D.Q[c.o.q].fullName : D.Q[c.o.q].fullName;
    if (c.how === "typo") { conf = "medium"; notes.push("Đọc '" + used.name + "' là " + c.o.fullName + " (có thể gõ nhầm)."); }
    if (c.how === "alt") { conf = "medium"; notes.push("'" + used.name + "' là cách viết khác của " + c.o.fullName + "."); }
    if (top.length > 1) { conf = lower(conf, "medium"); notes.push("Có " + top.length + " đơn vị cũ cùng tên nhưng đều thuộc cùng đơn vị mới."); }
    if (!distOk && !prov) { conf = lower(conf, "medium"); notes.push("Không ghi quận, huyện và tỉnh: chỉ có một " + c.o.fullName + " trên cả nước (" + where + ")."); }
    else if (!distOk && !distBad && used.name) notes.push("Không ghi quận, huyện cũ: chỉ có một " + c.o.fullName + " ở " + provLabel + " (" + where + ").");
    if (distBad) conf = lower(conf, "medium");                                 // quận, huyện không có trong danh mục cũ: đã bỏ qua
    if (scope.d && !scope.d[c.o.d] && c.o.type !== "huyện") { conf = "low"; notes.push("Quận, huyện đã ghi không khớp: " + c.o.fullName + " thuộc " + where + "."); }
    if (prov && prov.q[c.o.q] === 1) notes.push("Hiểu '" + n.province.name + "' là " + (prov.p[0] ? prov.p[0].fullName : provLabel) + " sau sắp xếp; đơn vị cũ thuộc " + D.Q[c.o.q].fullName + ".");
    if (res.results.length > 1) {
      conf = lower(conf, "medium");
      notes.push(c.o.fullName + " cũ được chia cho " + res.results.length + " đơn vị mới. Phần nào thuộc đơn vị nào tuỳ vị trí thực tế (thôn, tổ dân phố, đoạn đường); xem nghị quyết hoặc hỏi UBND xã, phường.");
    }
    res.confidence = conf;
    return res;
  }

  // ---------- mới ----------
  function findNew(x) {
    if (x && typeof x === "object" && x.id) x = x.id;
    var s = String(x == null ? "" : x).trim();
    if (/^\d{5}$/.test(s)) { var u = D.U.filter(function (u) { return u.id === s; }); return { units: u, street: "" }; }
    var n = normalise(s), pq = null, pp = null;
    if (n.province) { var m = matchProvince(n.province.name); if (m) { pp = m.p.map(function (p) { return p.i; }); pq = m.q; } }
    var tries = [];
    if (n.commune) { tries.push({ p: n.commune, street: n.street }); if (!n.commune.sure) tries.push({ p: { name: n.commune.raw, type: null }, street: n.street }); }
    n.loose.forEach(function (l) { tries.push({ p: l.part, street: n.parts.slice(0, l.index).map(function (y) { return y.raw; }).join(", ") }); });
    if (!tries.length && n.district) tries.push({ p: { name: n.district.name, type: null }, street: n.street });
    for (var t = 0; t < tries.length; t++) {
      var f = fkey(tries[t].p.name), a = akey(tries[t].p.name), type = tries[t].p.type;
      var us = (D.uF[f] || []).map(function (i) { return D.U[i]; }).filter(function (u) {
        if (pp && pp.length) return pp.indexOf(u.p) >= 0;
        return true;
      });
      if (type && NEW_T.indexOf(type) >= 0) { var st = us.filter(function (u) { return u.type === type || u.typeBefore === type; }); if (st.length) us = st; }
      var ex = us.filter(function (u) { return u.a === a; }); if (ex.length && hasMarks(s)) us = ex;
      if (!us.length && maxTypos(f)) {
        var lim = maxTypos(f);
        us = D.U.filter(function (u) { return (!pp || !pp.length || pp.indexOf(u.p) >= 0) && dist(f, u.f, lim) <= lim; });
        if (!pp && us.length > 3) us = [];
      }
      if (us.length) return { units: us, street: tries[t].street };
    }
    return { units: [], street: n.street };
  }

  function newToOld(x) {
    var r = findNew(x);
    if (r.units.length !== 1) return r.units.length ? { status: "ambiguous", candidates: r.units.map(unitObj) } : null;
    var u = r.units[0];
    return { status: "found", unit: unitObj(u),
      old: u.links.map(function (l) {
        var o = D.O[l.o], other = o.links.filter(function (k) { return k.u !== u.i; });
        var ob = oldObj(o); ob.portion = l.portion; ob.split = other.length > 0;
        ob.alsoIn = other.map(function (k) { var v = D.U[k.u]; return { id: v.id, fullName: v.fullName, portion: k.portion }; });
        return ob;
      }) };
  }

  function region(x) {
    var r = findNew(x);
    if (r.units.length !== 1) return r.units.length ? { status: "ambiguous", candidates: r.units.map(unitObj) } : null;
    var u = r.units[0], years = {};
    Object.keys(D.wage).forEach(function (y) {
      var w = D.wage[y], g = u.r[y];
      years[y] = { region: g, regionNumber: REG.indexOf(g) + 1, monthly: w.monthly[g], hourly: w.hourly[g], decree: w.decree, from: w.from };
    });
    return { status: "found", unit: unitObj(u), years: years };
  }

  // ---------- gợi ý khi gõ ----------
  function search(text, opts) {
    opts = opts || {};
    var n = normalise(text), part = n.commune || (n.loose[0] && n.loose[0].part) || n.district || n.province;
    if (!part) return [];
    var f = fkey(part.name), lim = opts.limit || 12, pIdx = null, out = [];
    if (!f) return [];
    if (opts.province) pIdx = D.P.findIndex(function (p) { return p.id === opts.province; });
    else if (n.province && n.province !== part) { var m = matchProvince(n.province.name); if (m && m.p.length) pIdx = m.p[0].i; }
    var rank = function (k) { return k === f ? 0 : k.indexOf(f) === 0 ? 1 : k.indexOf(f) > 0 ? 2 : -1; };
    D.U.forEach(function (u) {
      if (pIdx !== null && pIdx >= 0 && u.p !== pIdx) return;
      var r = rank(u.f); if (r >= 0) out.push({ kind: "new", r: r, unit: unitObj(u), label: u.fullName, sub: D.P[u.p].fullName });
    });
    if (opts.old !== false) D.O.forEach(function (o) {
      if (o.type === "huyện" || o.type === "khu vực") return;
      var r = rank(o.f); if (r < 0) return;
      var us = o.links.map(function (l) { return D.U[l.u]; });
      if (pIdx !== null && pIdx >= 0 && !us.some(function (u) { return u.p === pIdx; })) return;
      var d = o.d >= 0 ? D.D[o.d].fullName : "";
      out.push({ kind: "old", r: r + 0.5, old: oldObj(o), units: us.map(unitObj), label: o.fullName + " (cũ)", sub: [d, D.Q[o.q].fullName].filter(Boolean).join(", ") + " → " + us.map(function (u) { return u.fullName; }).join(", ") });
    });
    out.sort(function (a, b) { return a.r - b.r || a.label.localeCompare(b.label, "vi"); });
    return out.slice(0, lim);
  }

  return {
    normalise: normalise, oldToNew: oldToNew, newToOld: newToOld, region: region, search: search,
    findNew: function (x) { return findNew(x).units.map(unitObj); },
    provinces: function () { return D.P.map(provObj); },
    units: function (provinceId) { return D.U.filter(function (u) { return !provinceId || D.P[u.p].id === provinceId; }).map(unitObj); },
    wage: D.wage, asOf: D.v, fkey: fkey, _data: D
  };
});
