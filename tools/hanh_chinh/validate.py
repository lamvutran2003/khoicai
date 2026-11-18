"""Validate data/hanh-chinh/. Exit code 1 on any error.

    python3 tools/hanh_chinh/validate.py

Checks: unique IDs and slugs; every unit has at least one old unit and a wage region for each year;
per-province and national counts match the resolutions; split old units are recorded consistently
(an old unit merged 'toàn bộ' appears exactly once; a split unit lists the other new units it went to).
"""
import json, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "data/hanh-chinh"
TYPES = {"xã", "phường", "đặc khu"}
REGIONS = {"I", "II", "III", "IV"}
PORTIONS = {"toan-bo", "mot-phan", "phan-con-lai"}
FORMATIONS = {"sap-xep", "giu-nguyen", "doi-ten", "dac-khu-tu-huyen"}
CODE_CHECKS = {"khop", "khop-ten-khac", "ten-khac-chua-xac-minh", "da-sua-ma", "khong-tim-thay", "chua-xac-minh", None}
OLD_TYPES = {"xã", "phường", "thị trấn", "huyện", "khu vực"}

def main():
    errors, warnings = [], []
    index = json.load(open(ROOT / "index.json", encoding="utf-8"))
    years = sorted(index["wage"])
    ids, provs = set(), []
    stated_tot = collections.Counter()
    for p in index["provinces"]:
        doc = json.load(open(ROOT / p["file"], encoding="utf-8")); provs.append(doc)
        units = doc["units"]
        st = doc["sources"]["stated_count"]
        if len(units) != st["total"]: errors.append(f"{doc['name']}: {len(units)} units, resolution states {st['total']}")
        if p["units"] != len(units): errors.append(f"{doc['name']}: index says {p['units']} units, file has {len(units)}")
        # counts by type as of 01/07/2025 (before the 2026 xã→phường changes)
        t25 = collections.Counter((u["type_changes"][0]["from"] if u["type_changes"] else u["type"]) for u in units)
        for t in TYPES:
            if t25.get(t, 0) != st.get(t, 0): errors.append(f"{doc['name']}: {t25.get(t, 0)} {t} on 01/07/2025, resolution states {st.get(t, 0)}")
        cites = doc["sources"].get("citations") or []
        if not any(c["document"] == doc["sources"]["commune_resolution"] and c.get("url", "").startswith("https://") for c in cites):
            errors.append(f"{doc['name']}: no linked citation for {doc['sources']['commune_resolution']}")
        for c in cites:
            if not c.get("url") or not (ROOT / c["copy"]).exists(): errors.append(f"{doc['name']}: citation {c['document']} lacks a URL or local copy")
        for k, v in st.items():
            if k != "total": stated_tot[k] += v
        stated_tot["total"] += st["total"]
        slugs = collections.Counter(u["slug"] for u in units)
        for s, n in slugs.items():
            if n > 1: errors.append(f"{doc['name']}: duplicate slug {s}")
        for u in units:
            where = f"{doc['name']} / {u['full_name']} ({u['id']})"
            if u["id"] in ids: errors.append(f"duplicate unit id {u['id']}")
            ids.add(u["id"])
            if u["type"] not in TYPES: errors.append(f"{where}: bad type {u['type']}")
            if u["formation"] not in FORMATIONS: errors.append(f"{where}: bad formation {u['formation']}")
            if not u["old_units"]: errors.append(f"{where}: no old units")
            for y in years:
                if u["region"].get(y) not in REGIONS: errors.append(f"{where}: no wage region for {y}")
            for ou in u["old_units"]:
                if ou["portion"] not in PORTIONS: errors.append(f"{where}: old unit {ou['full_name']} bad portion {ou['portion']}")
                if ou["code_check"] not in CODE_CHECKS: errors.append(f"{where}: old unit {ou['full_name']} bad code_check {ou['code_check']}")
                if ou["type"] not in OLD_TYPES: errors.append(f"{where}: old unit {ou['full_name']} has no recognised type ({ou['type']})")
                if ou["id"] is None and ou["type"] not in ("huyện", "khu vực"): warnings.append(f"{where}: old unit {ou['full_name']} has no code")
            if u["formation"] == "dac-khu-tu-huyen" and u["type"] != "đặc khu": errors.append(f"{where}: formed from a district but not a special zone")
    # national totals
    if stated_tot["total"] != index["totals"]["units"]: errors.append("national total differs from the sum of the resolutions")
    if len(provs) != 34: errors.append(f"{len(provs)} provinces, expected 34")
    # split consistency across the whole country
    occ = collections.defaultdict(list)
    for doc in provs:
        for u in doc["units"]:
            for ou in u["old_units"]:
                if ou["id"]: occ[ou["id"]].append((u["id"], ou))
    for oid, lst in occ.items():
        whole = [x for x in lst if x[1]["portion"] == "toan-bo"]
        if len(lst) > 1:
            if whole: errors.append(f"old unit {oid} ({lst[0][1]['full_name']}) is merged whole into {whole[0][0]} but also appears in {[c for c, _ in lst if c != whole[0][0]]}")
            for c, ou in lst:
                if not ou["split"] or set(ou["also_in"]) != {cc for cc, _ in lst if cc != c}: errors.append(f"old unit {oid}: split recorded inconsistently in {c}")
        else:
            c, ou = lst[0]
            if ou["split"]: errors.append(f"old unit {oid}: marked split but appears once")
            if ou["portion"] != "toan-bo":
                warnings.append(f"old unit {oid} ({ou['full_name']}, {ou['district']}) is merged only in part into {c}, and no other new unit lists it")
    print(f"{len(provs)} provinces, {len(ids)} units, {len(occ)} old units with codes")
    for w in warnings: print("WARN ", w)
    for e in errors: print("ERROR", e)
    print(f"{len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
