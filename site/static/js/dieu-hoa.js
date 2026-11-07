/* Công suất điều hoà (máy lạnh) cần cho một phòng.
 *   Cơ bản: 200 BTU cho mỗi m³ phòng (= 600 BTU/m² với trần cao 3 m) — cách tính phổ biến của các nhà bán lẻ điện máy.
 *   Loại phòng: văn phòng ~750 BTU/m² (× 1,25); quán cà phê, nhà hàng ~950 BTU/m² (× 1,6).
 *   Bếp hoặc nhiều thiết bị toả nhiệt: + 0,5 HP (4.500 BTU).
 *   Nắng nhiều (hướng Tây, tầng thượng, nhiều kính): + 10%; mỗi người thường xuyên ở phòng từ người thứ 3: + 600 BTU
 *   (theo hướng dẫn chọn máy của chương trình Energy Star, Mỹ).
 */
(function (root) {
  var ROOM = { home: 1, office: 1.25, shop: 1.6 };
  var SIZES = [[9000, "1 HP"], [12000, "1,5 HP"], [18000, "2 HP"], [24000, "2,5 HP"], [28000, "3 HP"], [36000, "4 HP"], [48000, "5 HP"]];

  function need(o) {
    var h = o.height > 0 ? o.height : 3, base = o.area * h * 200 * (ROOM[o.room] || 1);
    var sun = o.sunny ? base * 0.1 : 0, people = Math.max(0, (o.people || 0) - 2) * 600, kitchen = o.kitchen ? 4500 : 0;
    var btu = base + sun + people + kitchen;
    var pick = SIZES.filter(function (s) { return s[0] >= btu; })[0] || null;
    return { base: base, sun: sun, people: people, kitchen: kitchen, btu: btu, size: pick ? pick[0] : null, hp: pick ? pick[1] : null,
             splitInto: pick ? 1 : Math.ceil(btu / 24000) };
  }

  var API = { need: need, SIZES: SIZES, ROOM: ROOM };
  if (typeof module === "object" && module.exports) module.exports = API; else root.DieuHoa = API;
})(this);
