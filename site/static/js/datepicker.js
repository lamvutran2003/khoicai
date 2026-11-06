/* Ô ngày dd/mm/yyyy có lịch bật ra (dương lịch, ghi kèm ngày âm và ngày lễ). Cần am-lich.js.
 *   KCDate.attach(inputEl)  -> bọc ô nhập, thêm nút lịch
 *   KCDate.get(inputEl)     -> jd (số ngày Julius) hoặc null
 *   KCDate.set(inputEl, jd)
 */
(function (root) {
  var A = root.AmLich, pad = function (n) { return String(n).padStart(2, "0"); };
  var DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(function (d) { return '<span class="dow">' + d + "</span>"; }).join("");
  var ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  var now = new Date(), todayJd = A.jdFromDate(now.getDate(), now.getMonth() + 1, now.getFullYear());
  var len = function (m, y) { return A.jdFromDate(1, m === 12 ? 1 : m + 1, m === 12 ? y + 1 : y) - A.jdFromDate(1, m, y); };

  function get(input) {
    var m = String(input.value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return null;
    var d = +m[1], mo = +m[2], y = +m[3];
    if (!(y >= 1900 && y <= 2199 && mo >= 1 && mo <= 12 && d >= 1 && d <= len(mo, y))) return null;
    return A.jdFromDate(d, mo, y);
  }
  function set(input, jd) { var d = A.jdToDate(jd); input.value = pad(d.day) + "/" + pad(d.month) + "/" + d.year; }

  function attach(input) {
    var wrap = document.createElement("div"); wrap.className = "dp";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    input.classList.add("in"); input.setAttribute("inputmode", "numeric"); input.setAttribute("autocomplete", "off");
    input.setAttribute("placeholder", "dd/mm/yyyy");
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "dp-btn"; btn.setAttribute("aria-label", "Mở lịch chọn ngày"); btn.innerHTML = ICON;
    var pop = document.createElement("div"); pop.className = "pop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Chọn ngày"); pop.setAttribute("data-no-stale", "");
    pop.innerHTML = '<div class="cal-head"><button type="button" data-k="-1" aria-label="Tháng trước">‹</button><b></b><button type="button" data-k="1" aria-label="Tháng sau">›</button></div><div class="cal-grid small"></div>';
    wrap.appendChild(btn); wrap.appendChild(pop);
    var view;

    function draw() {
      var first = A.jdFromDate(1, view.m, view.y), n = len(view.m, view.y), sel = get(input), lead = ((first + 1) % 7 + 6) % 7, h = DOW;
      pop.querySelector("b").textContent = "Tháng " + view.m + "/" + view.y;
      for (var i = 0; i < lead; i++) h += "<span></span>";
      for (var k = 0; k < n; k++) {
        var j = first + k, l = A.toLunar(k + 1, view.m, view.y), hs = A.holidays(k + 1, view.m, view.y), off = hs.some(function (x) { return x.off; });
        var cls = [(lead + k) % 7 === 6 && "sun", j === sel && "sel", j === todayJd && "today", off && "off", hs.length && !off && "ev"].filter(Boolean).join(" ");
        h += '<button type="button" data-jd="' + j + '" class="' + cls + '"' + (hs.length ? ' title="' + hs.map(function (x) { return x.name; }).join(", ") + '"' : "") + ">" + (k + 1) + "<small>" + (l.day === 1 ? l.day + "/" + l.month : l.day) + "</small></button>";
      }
      pop.querySelector(".cal-grid").innerHTML = h;
    }
    function open() { var j = get(input) || todayJd, d = A.jdToDate(j); view = { m: d.month, y: d.year }; pop.hidden = false; draw(); }
    function close() { pop.hidden = true; }

    input.addEventListener("focus", function () { if (pop.hidden) open(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Escape" || e.key === "Enter") close(); });
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D/g, "").slice(0, 8);
      input.value = v.length > 4 ? v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4) : v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v;
      if (v.length === 8) close();   // gõ đủ ngày thì đóng lịch, khỏi che nút bên dưới
    });
    btn.addEventListener("click", function () { if (pop.hidden) open(); else close(); });
    pop.addEventListener("click", function (e) {
      var k = e.target.closest("[data-k]");
      if (k) { view.m += +k.getAttribute("data-k"); if (view.m < 1) { view.m = 12; view.y--; } if (view.m > 12) { view.m = 1; view.y++; } draw(); return; }
      var b = e.target.closest("[data-jd]"); if (!b) return;
      set(input, +b.getAttribute("data-jd")); close();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    document.addEventListener("click", function (e) { if (!pop.hidden && !wrap.contains(e.target)) close(); });
  }

  root.KCDate = { attach: attach, get: get, set: set, today: todayJd };
})(this);
