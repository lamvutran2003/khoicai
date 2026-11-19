/* Chọn vùng lương tối thiểu theo tên xã, phường (mới hoặc cũ) cho các trang tính lương.
 *
 *   <input id="xa" data-data="/js/dia-chi-data.js" data-engine="/js/dia-chi.js">   (cần goi-y.js nạp trước)
 *   KCVung.attach(input, select, note)
 *
 * Dữ liệu địa chỉ (~150 KB nén) chỉ tải khi người dùng bắt đầu gõ. Chọn gợi ý hoặc gõ một tên chỉ có một nơi thì
 * ô chọn vùng (giá trị 1–4) được đặt theo vùng của xã, phường đó; không khớp thì giữ nguyên ô chọn vùng như cũ.
 * Vùng theo Phụ lục Nghị định 293/2025/NĐ-CP, cùng năm với mức lương tối thiểu trong luong.js.
 */
(function () {
  var YEAR = "2026", NUM = { I: 1, II: 2, III: 3, IV: 4 }, KEY = "kc-vung-xa";
  var loading = null;
  function load(input) {
    if (window.DiaChi) return Promise.resolve(window.DiaChi);
    if (loading) return loading;
    var add = function (src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); };
    loading = add(input.getAttribute("data-data")).then(function () { return add(input.getAttribute("data-engine")); }).then(function () { return window.DiaChi; });
    return loading;
  }
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };

  window.KCVung = {
    attach: function (input, select, note, opt) {
      opt = opt || {};
      var picked = null;
      function apply(units, how) {
        var regs = units.map(function (u) { return u.region[YEAR]; }), uniq = regs.filter(function (g, i) { return regs.indexOf(g) === i; });
        if (uniq.length !== 1) {   // xã cũ bị chia cho đơn vị thuộc nhiều vùng
          note.innerHTML = esc(how) + " thuộc " + units.map(function (u) { return esc(u.fullName) + " (vùng " + u.region[YEAR] + ")"; }).join(", ") + ". Chọn vùng ở ô dưới.";
          return;
        }
        var g = uniq[0];
        if (String(select.value) !== String(NUM[g])) { select.value = NUM[g]; select.dispatchEvent(new Event("change", { bubbles: true })); }
        note.innerHTML = esc(how) + ": <b>vùng " + g + "</b>" + (units.length === 1 ? ' · <a href="' + units[0].url + '">xem xã, phường</a>' : "");
        try { localStorage.setItem(KEY, input.value.trim()); } catch (e) {}
      }
      // gõ xong (không chọn gợi ý): chỉ đặt vùng khi tên chỉ có một nơi
      function resolve() {
        var t = input.value.trim();
        if (!t) { note.textContent = "không bắt buộc; không ghi thì chọn vùng ở ô dưới"; try { localStorage.removeItem(KEY); } catch (e) {} return; }
        if (picked && picked.text === t) return;
        load(input).then(function (D) {
          var r = D.region(t);
          if (r && r.status === "found") return apply([r.unit], r.unit.fullName + ", " + r.unit.province.fullName);
          var o = D.oldToNew(t);
          if (o.status === "found") return apply(o.results.map(function (x) { return x.unit; }), o.old.fullName + " (cũ)" + (o.results.length === 1 ? ", nay là " + o.results[0].unit.fullName : ""));
          note.textContent = (r && r.status === "ambiguous") || o.status === "ambiguous"
            ? "Nhiều nơi tên như vậy: chọn trong gợi ý hoặc ghi thêm tỉnh. Vùng chưa đổi."
            : "Không tìm thấy xã, phường này; vùng giữ như ô dưới.";
        }).catch(function () { note.textContent = "Không tải được danh sách xã, phường; chọn vùng ở ô dưới."; });
      }
      KCSuggest.attach(input, {
        source: function (t) {
          if (!window.DiaChi) { load(input).then(function () { input.dispatchEvent(new Event("input")); }); return []; }
          return DiaChi.search(t, { limit: 8 }).map(function (x) {
            return x.kind === "new" ? { label: x.label + " · vùng " + x.unit.region[YEAR], sub: x.sub, units: [x.unit], text: x.unit.fullName + ", " + x.unit.province.fullName }
              : { label: x.label, sub: x.sub, units: x.units, text: x.old.fullName + ", " + (x.old.district ? x.old.district + ", " : "") + x.old.province,
                old: x.old.fullName + " (cũ)" + (x.units.length === 1 ? ", nay là " + x.units[0].fullName : "") };
          });
        },
        pick: function (it) {
          input.value = it.text; picked = { text: it.text };
          apply(it.units, it.old || it.units[0].fullName + ", " + it.units[0].province.fullName);
        }
      });
      var timer;
      input.addEventListener("input", function () { clearTimeout(timer); picked = picked && picked.text === input.value.trim() ? picked : null; timer = setTimeout(resolve, 700); });
      input.addEventListener("change", resolve);
      if (input.form) input.form.addEventListener("reset", function () { note.textContent = ""; });
      var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
      if (saved && !input.value && opt.restore !== false) { input.value = saved; resolve(); }   // ?vung= trên địa chỉ trang thì không khôi phục
      return { resolve: resolve };
    }
  };
})();
