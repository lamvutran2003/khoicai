/* Chỉ số cơ thể cho người lớn (18+): BMI, tỉ lệ mỡ, BMR, TDEE, calo theo mục tiêu.
 * Công thức như calculator.net:
 *   BMR Mifflin–St Jeor:        10W + 6,25H − 5A + 5 (nam) / − 161 (nữ)
 *   BMR Harris–Benedict (sửa):  13,397W + 4,799H − 5,677A + 88,362 (nam); 9,247W + 3,098H − 4,330A + 447,593 (nữ)
 *   BMR Katch–McArdle:          370 + 21,6 × (1 − F) × W, F = tỉ lệ mỡ (dùng khi biết tỉ lệ mỡ)
 *   Tỉ lệ mỡ (U.S. Navy, cm):   nam 495 / (1,0324 − 0,19077 log10(eo − cổ) + 0,15456 log10(cao)) − 450
 *                               nữ  495 / (1,29579 − 0,35004 log10(eo + mông − cổ) + 0,22100 log10(cao)) − 450
 * Kết quả là ước tính để tham khảo, không thay cho tư vấn của bác sĩ, chuyên gia dinh dưỡng.
 */
(function (root) {
  var ACTIVITY = [
    { id: "sed", f: 1.2, name: "Ít vận động", desc: "làm văn phòng, hầu như không tập" },
    { id: "light", f: 1.375, name: "Vận động nhẹ", desc: "tập 1–3 buổi/tuần" },
    { id: "mod45", f: 1.465, name: "Vận động vừa", desc: "tập 4–5 buổi/tuần" },
    { id: "mod", f: 1.55, name: "Vận động khá", desc: "tập hằng ngày, hoặc tập nặng 3–4 buổi/tuần" },
    { id: "high", f: 1.725, name: "Vận động nhiều", desc: "tập nặng 6–7 buổi/tuần" },
    { id: "athlete", f: 1.9, name: "Rất nhiều", desc: "tập rất nặng hằng ngày hoặc lao động nặng" }
  ];
  var KCAL_PER_KG = 7700;   // năng lượng ước tính của 1 kg mỡ cơ thể

  function bmi(kg, cm) { var m = cm / 100; return kg / (m * m); }
  // Phân loại theo ngưỡng cho người châu Á (WHO khu vực Tây Thái Bình Dương)
  function bmiClass(b) {
    return b < 18.5 ? "Thiếu cân" : b < 23 ? "Bình thường" : b < 25 ? "Thừa cân" : b < 30 ? "Béo phì độ I" : "Béo phì độ II";
  }
  function healthyRange(cm) { var m = cm / 100; return [18.5 * m * m, 22.9 * m * m]; }

  function bmrMifflin(sex, age, cm, kg) { return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161); }
  function bmrHarris(sex, age, cm, kg) {
    return sex === "male" ? 13.397 * kg + 4.799 * cm - 5.677 * age + 88.362 : 9.247 * kg + 3.098 * cm - 4.330 * age + 447.593;
  }
  function bmrKatch(kg, fatPct) { return 370 + 21.6 * (1 - fatPct / 100) * kg; }
  // fatPct có thì dùng Katch–McArdle, không thì Mifflin–St Jeor
  function bmr(sex, age, cm, kg, fatPct) { return fatPct > 0 ? bmrKatch(kg, fatPct) : bmrMifflin(sex, age, cm, kg); }

  function activity(id) { return ACTIVITY.filter(function (a) { return a.id === id; })[0] || ACTIVITY[0]; }
  function tdee(sex, age, cm, kg, act, fatPct) { return bmr(sex, age, cm, kg, fatPct) * activity(act).f; }

  // Mục tiêu: kgPerWeek âm = giảm, dương = tăng. Mức tối thiểu khuyến nghị khi tự ăn kiêng: 1.200 (nữ), 1.500 (nam).
  function goal(sex, age, cm, kg, act, kgPerWeek, fatPct) {
    var t = tdee(sex, age, cm, kg, act, fatPct), target = t + kgPerWeek * KCAL_PER_KG / 7, floor = sex === "male" ? 1500 : 1200;
    return { tdee: t, target: target, floor: floor, belowFloor: target < floor };
  }

  // Tỉ lệ mỡ (%) theo số đo vòng (cm). Trả null nếu số đo không hợp lý.
  function fatNavy(sex, cm, waist, neck, hip) {
    var log = Math.log10, v;
    if (sex === "male") { if (waist <= neck) return null; v = 495 / (1.0324 - 0.19077 * log(waist - neck) + 0.15456 * log(cm)) - 450; }
    else { if (waist + hip <= neck) return null; v = 495 / (1.29579 - 0.35004 * log(waist + hip - neck) + 0.22100 * log(cm)) - 450; }
    return v > 0 && v < 75 ? v : null;
  }
  function fatFromBmi(sex, b, age) { return 1.2 * b + 0.23 * age - (sex === "male" ? 16.2 : 5.4); }
  // Phân loại của Hội đồng Thể dục Hoa Kỳ (ACE)
  function fatClass(sex, p) {
    var t = sex === "male" ? [6, 14, 18, 25] : [14, 21, 25, 32];
    return p < t[0] ? "Mỡ thiết yếu" : p < t[1] ? "Vận động viên" : p < t[2] ? "Cân đối" : p < t[3] ? "Trung bình" : "Béo phì";
  }

  var API = { ACTIVITY: ACTIVITY, bmi: bmi, bmiClass: bmiClass, healthyRange: healthyRange, bmr: bmr, bmrMifflin: bmrMifflin,
              bmrHarris: bmrHarris, bmrKatch: bmrKatch, tdee: tdee, goal: goal, activity: activity,
              fatNavy: fatNavy, fatFromBmi: fatFromBmi, fatClass: fatClass };
  if (typeof module === "object" && module.exports) module.exports = API; else root.SucKhoe = API;
})(this);
