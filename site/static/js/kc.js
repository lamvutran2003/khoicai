/* Hành vi chung của mọi trang công cụ.
 *
 * KC.form(formEl, { calc, clear }) — biểu mẫu kiểu "bấm Tính":
 *   - bấm "Tính" hoặc Enter: chạy calc(), hiện khung kết quả (data-result="<id>") và cuộn tới nếu khuất
 *   - sửa ô nhập sau khi đã có kết quả: kết quả mờ đi kèm nhắc "Bấm Tính để cập nhật"
 *   - nút [data-clear] ("Xoá"): xoá các ô chữ/số, ẩn kết quả, gọi clear()
 * Nút [data-copy-from="<id>"]: sao chép chữ của phần tử đó.
 */
(function () {
  var KC = window.KC = {};

  KC.toast = function (msg) {
    var t = document.getElementById("toast"); if (!t) return;
    t.textContent = msg; t.hidden = false; clearTimeout(KC.toast.h); KC.toast.h = setTimeout(function () { t.hidden = true; }, 2000);
  };

  KC.form = function (form, o) {
    o = o || {};
    var res = document.getElementById(form.getAttribute("data-result"));
    var go = form.querySelector("button[type=submit]");
    if (res && go) res.setAttribute("data-stale", "đã sửa số liệu, bấm " + go.textContent.trim() + " để cập nhật");
    function run(scroll) {
      var ok = o.calc ? o.calc() : true;
      if (!res) return;
      res.hidden = ok === false; res.classList.remove("stale");
      if (scroll && ok !== false) {
        var r = res.getBoundingClientRect();
        if (r.top > window.innerHeight - 80 || r.top < 0) res.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); run(true); });
    var stale = function (e) { if (res && !res.hidden && !(e.target && e.target.closest("[data-no-stale]"))) res.classList.add("stale"); };
    form.addEventListener("input", stale); form.addEventListener("change", stale);
    var clr = form.querySelector("[data-clear]");
    if (clr) clr.addEventListener("click", function () {
      form.querySelectorAll("input:not([type]),input[type=text],input[type=search],input[type=number],textarea").forEach(function (x) { x.value = ""; });
      if (res) res.hidden = true;
      if (o.clear) o.clear();
      var first = form.querySelector("input:not([type=hidden]),textarea"); if (first) first.focus();
    });
    return { run: run };
  };

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-copy-from]"); if (!b) return;
    var el = document.getElementById(b.getAttribute("data-copy-from")); if (!el) return;
    var text = "value" in el ? el.value : el.textContent;
    if (!text.trim()) return;
    var done = function () { KC.toast("Đã sao chép"); };
    var fallback = function () { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); KC.toast("Đã chọn, bấm Ctrl+C để sao chép"); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  });
})();
