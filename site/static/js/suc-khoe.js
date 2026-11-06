/* Chỉ số cơ thể cho người lớn (18+): BMI, BMR (Mifflin–St Jeor), TDEE, calo theo mục tiêu.
 * Kết quả là ước tính để tham khảo, không thay cho tư vấn của bác sĩ, chuyên gia dinh dưỡng.
 */
(function (root) {
  var ACTIVITY = [
    { id: "sed", f: 1.2, name: "Ít vận động", desc: "làm văn phòng, hầu như không tập" },
    { id: "light", f: 1.375, name: "Vận động nhẹ", desc: "tập 1–3 buổi/tuần" },
    { id: "mod", f: 1.55, name: "Vận động vừa", desc: "tập 3–5 buổi/tuần" },
    { id: "high", f: 1.725, name: "Vận động nhiều", desc: "tập 6–7 buổi/tuần" },
    { id: "athlete", f: 1.9, name: "Rất nhiều", desc: "lao động nặng hoặc tập 2 lần/ngày" }
  ];
  var KCAL_PER_KG = 7700;   // năng lượng ước tính của 1 kg mỡ cơ thể

  function bmi(kg, cm) { var m = cm / 100; return kg / (m * m); }
  // Phân loại theo ngưỡng cho người châu Á (WHO khu vực Tây Thái Bình Dương)
  function bmiClass(b) {
    return b < 18.5 ? "Thiếu cân" : b < 23 ? "Bình thường" : b < 25 ? "Thừa cân" : b < 30 ? "Béo phì độ I" : "Béo phì độ II";
  }
  function healthyRange(cm) { var m = cm / 100; return [18.5 * m * m, 22.9 * m * m]; }

  function bmr(sex, age, cm, kg) { return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161); }
  function activity(id) { return ACTIVITY.filter(function (a) { return a.id === id; })[0] || ACTIVITY[0]; }
  function tdee(sex, age, cm, kg, act) { return bmr(sex, age, cm, kg) * activity(act).f; }

  // Mục tiêu: kgPerWeek âm = giảm, dương = tăng. Mức tối thiểu khuyến nghị khi tự ăn kiêng: 1.200 (nữ), 1.500 (nam).
  function goal(sex, age, cm, kg, act, kgPerWeek) {
    var t = tdee(sex, age, cm, kg, act), target = t + kgPerWeek * KCAL_PER_KG / 7, floor = sex === "male" ? 1500 : 1200;
    return { tdee: t, target: target, floor: floor, belowFloor: target < floor };
  }

  var API = { ACTIVITY: ACTIVITY, bmi: bmi, bmiClass: bmiClass, healthyRange: healthyRange, bmr: bmr, tdee: tdee, goal: goal, activity: activity };
  if (typeof module === "object" && module.exports) module.exports = API; else root.SucKhoe = API;
})(this);
