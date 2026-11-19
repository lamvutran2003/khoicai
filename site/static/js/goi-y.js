/* Gợi ý khi gõ cho một ô nhập.
 * KCSuggest.attach(input, { source(text) -> [{ label, sub }], pick(item), min: 2, limit: 8 })
 * Mũi tên lên/xuống để chọn, Enter để lấy, Esc để đóng. Enter khi chưa chọn gợi ý nào thì biểu mẫu gửi như thường.
 */
(function () {
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  window.KCSuggest = {
    attach: function (input, o) {
      var wrap = document.createElement("div"); wrap.className = "sugw";
      input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
      var list = document.createElement("ul"); list.className = "sug"; list.id = input.id + "-sug"; list.setAttribute("role", "listbox"); list.hidden = true;
      list.setAttribute("data-no-stale", ""); wrap.appendChild(list);
      input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-expanded", "false"); input.setAttribute("aria-controls", list.id); input.setAttribute("autocomplete", "off");
      var items = [], act = -1, timer;
      function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); act = -1; }
      function mark() {
        [].forEach.call(list.children, function (li, i) { li.setAttribute("aria-selected", i === act ? "true" : "false"); });
        if (act >= 0) { input.setAttribute("aria-activedescendant", list.id + "-" + act); list.children[act].scrollIntoView({ block: "nearest" }); }
      }
      function update() {
        var v = input.value.trim();
        items = v.length >= (o.min || 2) ? o.source(v).slice(0, o.limit || 8) : [];
        if (!items.length) return close();
        list.innerHTML = items.map(function (it, i) {
          return '<li role="option" aria-selected="false" id="' + list.id + "-" + i + '" data-i="' + i + '"><b>' + esc(it.label) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</li>";
        }).join("");
        list.hidden = false; input.setAttribute("aria-expanded", "true"); act = -1;
      }
      function choose(i) { var it = items[i]; close(); if (it) o.pick(it); }
      input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(update, 90); });
      input.addEventListener("keydown", function (e) {
        if (list.hidden) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); act = (act + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; mark(); }
        else if (e.key === "Enter" && act >= 0) { e.preventDefault(); choose(act); }
        else if (e.key === "Escape") close();
      });
      // Esc trước khi gợi ý kịp hiện: huỷ luôn lần cập nhật đang chờ
      input.addEventListener("keydown", function (e) { if (e.key === "Escape") { clearTimeout(timer); close(); } });
      list.addEventListener("mousedown", function (e) { var li = e.target.closest("li"); if (li) { e.preventDefault(); choose(+li.getAttribute("data-i")); } });
      input.addEventListener("blur", function () { setTimeout(close, 150); });
      if (input.form) input.form.addEventListener("submit", function () { clearTimeout(timer); close(); });
      return { close: close };
    }
  };
})();
