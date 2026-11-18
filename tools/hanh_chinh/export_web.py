"""Export data/hanh-chinh/ as a compact script for the browser: site/static/js/dia-chi-data.js (UMD, global DiaChiData).

    python3 tools/hanh_chinh/export_web.py

Run after tools/hanh_chinh/build.py. The file is generated: do not edit it by hand.

Layout (arrays keep the file small; dia-chi.js turns them back into objects):
  v  date the data is valid for
  W  {year: [decree, effective, [monthly I..IV], [hourly I..IV]]}
  P  new provinces    [id, full_name, slug, commune resolution, resolution URL, became-city resolution or ""]
  Q  old provinces    [id, full_name]
  D  old districts    [id, full_name, Q index]
  O  old units        [code or "", type, name, D index or -1, Q index, other spelling or ""]
  U  new units        [id, P index, type, name, region 2026, region 2027, formation, clause, type on 01/07/2025 or -1,
                       type-change resolution or "", [O index, portion, O index, portion, ...]]
  types: new 0 xã 1 phường 2 đặc khu; old 0 xã 1 phường 2 thị trấn 3 huyện 4 khu vực
  formation: 0 sắp xếp 1 giữ nguyên 2 đổi tên 3 đặc khu từ cả huyện; portion: 0 toàn bộ 1 một phần 2 phần còn lại
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/hanh-chinh"
OUT = ROOT / "site/static/js/dia-chi-data.js"
NEW_T = {"xã": 0, "phường": 1, "đặc khu": 2}
OLD_T = {"xã": 0, "phường": 1, "thị trấn": 2, "huyện": 3, "khu vực": 4}
FORM = {"sap-xep": 0, "giu-nguyen": 1, "doi-ten": 2, "dac-khu-tu-huyen": 3}
PORT = {"toan-bo": 0, "mot-phan": 1, "phan-con-lai": 2}


def main():
    index = json.load(open(DATA / "index.json", encoding="utf-8"))
    W = {y: [w["decree"], w["effective"], [w["monthly"][r] for r in ("I", "II", "III", "IV")], [w["hourly"][r] for r in ("I", "II", "III", "IV")]]
         for y, w in index["wage"].items()}
    P, Q, D, O, U = [], [], [], [], []
    qi, di, oi = {}, {}, {}

    def q_index(pid, name):
        k = (pid, name)
        if k not in qi:
            qi[k] = len(Q); Q.append([pid or "", name])
        return qi[k]

    def d_index(did, name, q):
        # the conversion table writes some districts two ways ("Thị Xã X" / "Thị xã X"); one entry per code
        name = name.replace("Thị Xã ", "Thị xã ").replace("Thành Phố ", "Thành phố ")
        k = (did, q) if did else (name, q)
        if k not in di:
            di[k] = len(D); D.append([did or "", name, q])
        return di[k]

    for p in index["provinces"]:
        doc = json.load(open(DATA / p["file"], encoding="utf-8"))
        src = doc["sources"]
        url = next(c["url"] for c in src["citations"] if c["document"] == src["commune_resolution"])
        P.append([doc["id"], doc["full_name"], doc["slug"], src["commune_resolution"], url, src.get("became_city", {}).get("resolution", "")])
        pi = len(P) - 1
        for u in doc["units"]:
            links = []
            for o in u["old_units"]:
                q = q_index(o["province_id"], o["province"])
                d = d_index(o["district_id"], o["district"], q) if o["district"] else -1
                key = o["id"] or (o["type"], o["name"], q)
                if key not in oi:
                    oi[key] = len(O)
                    O.append([o["id"] or "", OLD_T[o["type"]], o["name"], d, q, (o.get("name_in_list") or "") if o.get("code_check") in ("khop-ten-khac", "ten-khac-chua-xac-minh") else ""])
                links += [oi[key], PORT[o["portion"]]]
            tc = u["type_changes"][0] if u["type_changes"] else None
            U.append([u["id"], pi, NEW_T[u["type"]], u["name"], u["region"]["2026"], u["region"]["2027"], FORM[u["formation"]],
                      u["source"].get("clause", 0), NEW_T[tc["from"]] if tc else -1, tc["resolution"] if tc else "", links])
    data = {"v": index["as_of"], "W": W, "P": P, "Q": Q, "D": D, "O": O, "U": U}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text("/* Sinh tự động bởi tools/hanh_chinh/export_web.py từ data/hanh-chinh/ — không sửa tay. Nguồn: xem data/hanh-chinh/README.md */\n"
                   "(function (root, f) { if (typeof module === \"object\" && module.exports) module.exports = f(); else root.DiaChiData = f(); })"
                   "(typeof self !== \"undefined\" ? self : this, function () { return " + body + "; });\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(P)} provinces, {len(U)} units, {len(O)} old units, {len(D)} old districts, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
