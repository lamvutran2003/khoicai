"""Build data/hanh-chinh/ from the official source copies in data/hanh-chinh/sources/.

    python3 tools/hanh_chinh/build.py

Primary source for every new unit and its old components: the 34 UBTVQH resolutions (Điều 1).
Codes, old districts / provinces and the 'nhập toàn bộ / một phần' notes: the conversion table of the
National Statistics Office (Cục Thống kê). Current names and types: the NSO list as of 18/11/2026, plus the
2026 changes in sources/thay-doi-2026.json. Wage regions: appendices of 293/2025/NĐ-CP and 399/2026/NĐ-CP.
Where the resolution and the NSO table disagree, the resolution wins and the unit gets a flag.
"""
import csv, json, re, sys, unicodedata, collections, datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import parse as P

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/hanh-chinh/sources"
OUT = ROOT / "data/hanh-chinh"
# Old Bắc Giang (old province 24) is the one pre-merger province the NSO service no longer returns for 30/06/2025
# (it answers by current province, and no current province is named Bắc Giang). Its old codes are checked against a
# third-party copy of the NSO list of 04/01/2025. That copy is GPL-licensed, so it is not stored in this repo:
# it is downloaded at a pinned commit into a git-ignored cache and checked against this SHA-256.
THIRD_PARTY_LIST = {
    "url": "https://raw.githubusercontent.com/sunshine-tech/VietnamProvinces/09325227abcfce07baa7f691671b793d014e0805/dev/seed-data/Pre-2025-07/Xa_2025-01-04.csv",
    "sha256": "026361a37fd47ad469ec6d5cc6dbcf2f0ae8a5d4219d10482fbbc8689864a2a4",
    "cache": OUT / ".cache" / "sunshine-tech-Xa_2025-01-04.csv",
}

def third_party_list():
    import hashlib, urllib.request
    c = THIRD_PARTY_LIST["cache"]
    if not c.exists():
        c.parent.mkdir(parents=True, exist_ok=True)
        try:
            data = urllib.request.urlopen(THIRD_PARTY_LIST["url"], timeout=120).read()
        except OSError as e:
            sys.exit("cannot download %s (%s); it is needed to check old Bắc Giang codes" % (THIRD_PARTY_LIST["url"], e))
        c.write_bytes(data)
    if hashlib.sha256(c.read_bytes()).hexdigest() != THIRD_PARTY_LIST["sha256"]:
        sys.exit("checksum mismatch for %s; delete it and rebuild" % c)
    for r in csv.DictReader(open(c, encoding="utf-8")):
        yield {"MaQuanHuyen": r["Mã QH"], "TenQuanHuyen": r["Quận Huyện"], "MaPhuongXa": r["Mã PX"], "TenPhuongXa": r["Phường Xã"], "_src": "nso-2025-01-04-copy"}
TYPEW = re.compile(r"^(xã|phường|thị trấn|đặc khu|huyện)\s+", re.I)

def nfc(s): return unicodedata.normalize("NFC", s or "")
def clean(s):
    s = re.sub(r"\s+", " ", nfc(s).replace("​", "").replace("﻿", "")).strip()
    s = re.sub(r"^Xa ", "Xã ", s); s = re.sub(r"^Thi trấn ", "Thị trấn ", s); s = re.sub(r"^Thị Trấn ", "Thị trấn ", s)
    return s
def split_type(full):
    full = clean(full); m = TYPEW.match(full)
    return (m.group(1).lower(), full[m.end():].strip()) if m else (None, full)
def code_in(s):
    m = re.search(r"\((\d+)\)\s*$", s or ""); return m.group(1) if m else None
def wo_code(s): return re.sub(r"\s*\(\d+\)\s*$", "", clean(s))
def pad(c): return c.zfill(5) if re.fullmatch(r"\d{1,5}", c or "") else (c or "")
def slugify(s):
    s = unicodedata.normalize("NFD", nfc(s).replace("đ", "d").replace("Đ", "D"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")
def pkey(name): return P.key(re.sub(r"^(tỉnh|thành phố|thủ đô)\s+", "", clean(name), flags=re.I))
def full(t, n): return (t[0].upper() + t[1:] + " " + n) if t else n
def portion_from_note(note):
    n = (note or "").lower()
    if "một phần" in n: return "mot-phan"
    if "toàn bộ diện tích" in n and "dân số" not in n: return "mot-phan"     # land only; the population went elsewhere
    return "toan-bo"
PORTION = {"whole": "toan-bo", "part": "mot-phan", "rest": "phan-con-lai"}

NSO_DOCS = "https://danhmuchanhchinh.nso.gov.vn/NghiDinh.aspx"

def citations(pv, city, wards):
    """Every source used for one province, with a link and the local copy in sources/."""
    man = {f["file"]: f for f in json.load(open(SRC / "manifest.json", encoding="utf-8"))["files"]}
    rf = "nghi-quyet/%s.txt" % pv["res"]["so"].replace("/", "-")
    out = [
        {"what": "Sắp xếp đơn vị hành chính cấp xã (danh sách đơn vị mới, đơn vị cũ hợp thành, số đơn vị)", "document": pv["res"]["so"],
         "issued": "2025-06-16", "effective": "2025-07-01", "url": man[rf]["url"], "copy": "sources/" + rf},
        {"what": "Sắp xếp đơn vị hành chính cấp tỉnh", "document": "202/2025/QH15", "issued": "2025-06-12", "effective": "2025-07-01",
         "url": NSO_DOCS, "copy": "sources/nso-van-ban-tu-2025-07.json"},
        {"what": "Bảng chuyển đổi đơn vị hành chính mới - cũ (mã đơn vị cũ, huyện cũ, tỉnh cũ, nhập toàn bộ/một phần)", "document": "Cục Thống kê",
         "url": man["nso-bang-chuyen-doi.csv"]["url"], "copy": "sources/nso-bang-chuyen-doi.csv"},
        {"what": "Danh mục đơn vị hành chính hiện hành (mã, tên, loại)", "document": "Cục Thống kê, ngày 18/11/2026",
         "url": "https://danhmuchanhchinh.nso.gov.vn/", "copy": "sources/nso-danh-muc-xa-2026-11-18.csv"},
        {"what": "Vùng lương tối thiểu 2026 (Phụ lục)", "document": "293/2025/NĐ-CP", "issued": "2025-11-10", "effective": "2026-01-01",
         "url": man["nd-293-2025-phu-luc.txt"]["url"], "copy": "sources/nd-293-2025-phu-luc.txt"},
        {"what": "Vùng lương tối thiểu 2027 (Phụ lục)", "document": "399/2026/NĐ-CP", "issued": "2026-11-02", "effective": "2027-01-01",
         "url": man["nd-399-2026-phu-luc.txt"]["url"], "copy": "sources/nd-399-2026-phu-luc.txt"},
    ]
    if city:
        out.append({"what": "Thành lập thành phố trực thuộc trung ương", "document": city["so"], "issued": city["ban_hanh"], "effective": city["hieu_luc"],
                    "url": NSO_DOCS, "copy": "sources/thay-doi-2026.json"})
    for x in wards:
        out.append({"what": "Thành lập phường từ xã (%d đơn vị)" % len(x["ten"]), "document": x["so"], "issued": x["ban_hanh"], "effective": x["hieu_luc"],
                    "url": x["nguon"], "copy": "sources/thay-doi-2026.json", "note": "Tin chính thức về nghị quyết; chưa đọc được toàn văn."})
    return out

def main():
    issues, notes = [], []
    # ---- sources ----
    provinces = {r["MaTinh"]: r for r in csv.DictReader(open(SRC / "nso-danh-muc-tinh-2026-11-18.csv", encoding="utf-8"))}
    now = {r["MaPhuongXa"]: r for r in csv.DictReader(open(SRC / "nso-danh-muc-xa-2026-11-18.csv", encoding="utf-8"))}
    jul = {r["MaPhuongXa"]: r for r in csv.DictReader(open(SRC / "nso-danh-muc-xa-2025-07-01.csv", encoding="utf-8"))}
    conv = []
    for r in csv.DictReader(open(SRC / "nso-bang-chuyen-doi.csv", encoding="utf-8")):
        if not r["ma_xa_moi"] and not r["ma_xa_cu"] and not r["ten_xa_cu"]: continue
        conv.append({"row": int(r["dong_excel"]), "new_prov": wo_code(r["tinh_moi"]), "new_prov_code": code_in(r["tinh_moi"]),
                     "new_name": clean(r["ten_xa_moi"]), "new_code": pad(r["ma_xa_moi"]), "old_name": clean(r["ten_xa_cu"]),
                     "old_code": pad(r["ma_xa_cu"]), "note": clean(r["ghi_chu"]), "old_dist": wo_code(r["quan_huyen_cu"]),
                     "old_dist_code": code_in(r["quan_huyen_cu"]), "old_prov": wo_code(r["tinh_cu"]), "old_prov_code": code_in(r["tinh_cu"])})
    # one row gives the old province as "Quảng Trị (44)" (44 is the NEW code); every other old-Quảng Trị row says "Tỉnh Quảng Trị (45)"
    for r in conv:
        if r["old_prov"] == "Quảng Trị" and r["old_prov_code"] == "44":
            issues.append({"issue": "wrong old province in NSO table (corrected)", "row": r["row"], "unit": r["new_name"], "table": "Quảng Trị (44)", "used": "Tỉnh Quảng Trị (45)",
                           "why": "44 là mã tỉnh Quảng Trị mới; 119 dòng khác của tỉnh Quảng Trị cũ đều ghi mã 45."})
            r["old_prov"], r["old_prov_code"] = "Tỉnh Quảng Trị", "45"
    changes = json.load(open(SRC / "thay-doi-2026.json", encoding="utf-8"))
    resolutions = [P.parse_resolution(str(f)) for f in sorted((SRC / "nghi-quyet").glob("*.txt"))]
    regions = {"2026": P.parse_appendix(str(SRC / "nd-293-2025-phu-luc.txt")), "2027": P.parse_appendix(str(SRC / "nd-399-2026-phu-luc.txt"))}

    # ---- group the conversion table by province and new unit ----
    units_by_prov = collections.defaultdict(lambda: collections.OrderedDict())
    for r in conv:
        pc = r["new_prov_code"]
        units_by_prov[pc].setdefault(r["new_code"], []).append(r)
    if len(units_by_prov) != 34: issues.append({"issue": "province count in conversion table", "n": len(units_by_prov)})
    res_by_prov = {}
    for res in resolutions:
        cand = [pc for pc in units_by_prov if pkey(units_by_prov[pc][next(iter(units_by_prov[pc]))][0]["new_prov"]) == pkey(res["prov"])]
        if len(cand) != 1: raise SystemExit("cannot map resolution %s (%s) to a province" % (res["so"], res["prov"]))
        res_by_prov[cand[0]] = res

    became_ward = {}
    for ch in changes["xa_thanh_phuong"]:
        for n in ch["ten"]: became_ward[(ch["ma_tinh"], P.key(n))] = ch
    city = {c["ma_tinh"]: c for c in changes["tinh_thanh_thanh_pho"]}

    out_provs = []
    old_index = collections.defaultdict(list)          # old code -> [(new code, portion)]
    all_units = []
    for pc in sorted(units_by_prov, key=lambda c: int(c)):
        res = res_by_prov[pc]; groups = units_by_prov[pc]; pmeta = provinces[pc]
        clause_by_key = {}
        for c in res["clauses"]:
            clause_by_key.setdefault((c["new_type"], P.key(c["new_name"])), []).append(c)
        unchanged_keys = {P.key(u["name"]): u for u in res["unchanged"]}
        units = []
        for code, rows in groups.items():
            t25, n25 = split_type(rows[0]["new_name"])
            cur = now.get(code)
            flags = []
            if cur:
                tnow, nnow = split_type(cur["TenPhuongXa"])
            else:
                tnow, nnow = t25, n25
                flags.append("Không có trong danh mục hiện hành của Cục Thống kê (18/11/2026) dù có trong bảng chuyển đổi và nghị quyết; giữ lại theo nghị quyết.")
                notes.append({"note": "missing from NSO current list", "province": pmeta["TenTinh"], "unit": full(tnow, nnow), "code": code})
            # 2026 type changes
            type_changes = []
            if t25 != tnow:
                ch = became_ward.get((pc, P.key(nnow)))
                if ch and t25 == "xã" and tnow == "phường":
                    type_changes.append({"from": "xã", "to": "phường", "resolution": ch["so"], "effective": ch["hieu_luc"]})
                else:
                    issues.append({"issue": "type changed without a recorded resolution", "province": pmeta["TenTinh"], "code": code, "from": t25, "to": tnow})
            elif (pc, P.key(nnow)) in became_ward and tnow != "phường":
                issues.append({"issue": "recorded as becoming a ward but NSO type is not phường", "province": pmeta["TenTinh"], "code": code})
            # which clause of the resolution formed this unit
            cl = clause_by_key.get((t25, P.key(n25)))
            if cl is None:
                alt = [v for (t, k), v in clause_by_key.items() if k == P.key(n25)]
                if len(alt) == 1: cl = alt[0]; flags.append("Nghị quyết ghi loại đơn vị khác: %s." % alt[0][0]["new_type"])
            formation, source, clause = None, {"resolution": res["so"]}, None
            if cl:
                if len(cl) > 1: issues.append({"issue": "two clauses form the same unit", "province": pmeta["TenTinh"], "unit": full(t25, n25)})
                clause = cl[0]; source["clause"] = clause["k"]
                formation = "doi-ten" if clause.get("rename") else ("dac-khu-tu-huyen" if all(p["type"] == "huyện" for p in clause["parts"]) else "sap-xep")
            elif P.key(n25) in unchanged_keys:
                formation = "giu-nguyen"; source["unchanged"] = True
            else:
                issues.append({"issue": "unit not found in resolution", "province": pmeta["TenTinh"], "unit": full(t25, n25), "code": code})
            # old units
            nq_parts = collections.defaultdict(list)
            if clause:
                for p in clause["parts"]: nq_parts[P.key(p["name"])].append(p)
            old_units, used = [], set()
            for r in rows:
                if not r["old_name"] and not r["old_code"]:
                    continue
                ot, on = split_type(r["old_name"])
                if ot is None and "bãi bồi" in r["old_name"].lower(): ot = "khu vực"
                k = P.key(on); portion = portion_from_note(r["note"]); src = "nso"
                match = nq_parts.get(k)
                if not match and clause:
                    lv = [kk for kk in nq_parts if kk not in used and P.loose(kk) == P.loose(on)]
                    if not lv and ot == "khu vực": lv = [kk for kk in nq_parts if "bãibồi" in kk]
                    if len(lv) == 1:
                        match = nq_parts[lv[0]]; k = lv[0]
                        if ot != "khu vực": flags.append("Tên đơn vị cũ viết khác nhau giữa hai nguồn: '%s' (nghị quyết) và '%s' (Cục Thống kê)." % (match[0]["name"], on))
                if match:
                    used.add(k); src = "nghi-quyet+nso"
                    p_nq = PORTION[match[0]["kind"]]
                    if (p_nq == "toan-bo") != (portion == "toan-bo"):
                        flags.append("Nghị quyết ghi '%s' %s, bảng chuyển đổi ghi '%s'; theo nghị quyết." % (on, {"toan-bo": "nhập toàn bộ", "mot-phan": "nhập một phần", "phan-con-lai": "phần còn lại"}[p_nq], r["note"]))
                        issues.append({"issue": "whole/part differs (resolution kept)", "province": pmeta["TenTinh"], "unit": full(tnow, nnow), "old": r["old_name"], "resolution": p_nq, "nso": r["note"]})
                    portion = p_nq
                    if ot is None and match[0]["type"] not in (None, "khu vực", "huyện"):
                        # the NSO table left out the unit type; the resolution names it
                        ot = match[0]["type"]; r = dict(r, old_name=full(ot, on))
                        notes.append({"note": "old unit type missing in NSO table (taken from resolution)", "province": pmeta["TenTinh"], "unit": full(tnow, nnow), "old": r["old_name"], "code": r["old_code"]})
                elif clause and formation == "sap-xep":
                    flags.append("Đơn vị cũ '%s' có trong bảng chuyển đổi nhưng không nêu trong khoản %d của nghị quyết." % (r["old_name"], clause["k"]))
                    issues.append({"issue": "old unit only in NSO table", "province": pmeta["TenTinh"], "unit": full(tnow, nnow), "old": r["old_name"]})
                old_units.append({"id": r["old_code"] or None, "name": on, "type": ot, "full_name": full(ot, on) if ot in ("xã", "phường", "thị trấn") else clean(r["old_name"]),   # một số dòng ghi "xã X" chữ thường
                                  "district": r["old_dist"], "district_id": r["old_dist_code"], "province": r["old_prov"], "province_id": r["old_prov_code"],
                                  "portion": portion, "nso_note": r["note"], "source": src})
            # parts named only in the resolution
            for k, ps in nq_parts.items():
                if k in used: continue
                p = ps[0]
                if p["type"] == "huyện":
                    d = rows[0]
                    old_units.append({"id": None, "name": p["name"], "type": "huyện", "full_name": "Huyện " + p["name"], "district": "Huyện " + p["name"],
                                      "district_id": d["old_dist_code"] if P.key(d["old_dist"]) == P.key("Huyện " + p["name"]) else None, "province": d["old_prov"], "province_id": d["old_prov_code"], "portion": "toan-bo",
                                      "nso_note": rows[0]["note"], "source": "nghi-quyet+nso"})
                    continue
                if p["type"] == "khu vực":
                    old_units.append({"id": None, "name": p["name"], "type": "khu vực", "full_name": p["name"], "district": None, "district_id": None,
                                      "province": rows[0]["old_prov"], "province_id": rows[0]["old_prov_code"], "portion": "toan-bo", "nso_note": None, "source": "nghi-quyet"})
                    notes.append({"note": "non-commune area named only in resolution", "province": pmeta["TenTinh"], "unit": full(tnow, nnow), "area": p["name"]})
                    continue
                # find the old unit's code elsewhere in this province (e.g. an old unit split between two new units)
                cands = [r for rr in groups.values() for r in rr if P.key(split_type(r["old_name"])[1]) == k]
                codes = {r["old_code"] for r in cands}
                ref = cands[0] if len(codes) == 1 else None
                old_units.append({"id": ref["old_code"] if ref else None, "name": p["name"], "type": p["type"], "full_name": full(p["type"], p["name"]),
                                  "district": ref["old_dist"] if ref else None, "district_id": ref["old_dist_code"] if ref else None,
                                  "province": ref["old_prov"] if ref else None, "province_id": ref["old_prov_code"] if ref else None,
                                  "portion": PORTION[p["kind"]], "nso_note": None, "source": "nghi-quyet"})
                flags.append("Nghị quyết (khoản %d) nêu '%s %s' (%s) nhưng bảng chuyển đổi của Cục Thống kê không ghi; bổ sung theo nghị quyết." % (clause["k"], p["type"], p["name"], {"whole": "toàn bộ", "part": "một phần", "rest": "phần còn lại"}[p["kind"]]))
                issues.append({"issue": "old unit only in resolution (added)", "province": pmeta["TenTinh"], "unit": full(tnow, nnow), "old": full(p["type"], p["name"]), "code_found": bool(ref)})
            if formation == "giu-nguyen" and not old_units:
                flags.append("Đơn vị giữ nguyên, không có dòng trong bảng chuyển đổi.")
            u = {"id": code, "name": nnow, "type": tnow, "full_name": full(tnow, nnow), "slug": None,
                 "formation": formation, "source": source, "type_changes": type_changes,
                 "region": {}, "old_units": old_units, "flags": flags,
                 "name_2025": full(t25, n25) if full(t25, n25) != full(tnow, nnow) else None}
            units.append(u)
            for ou in old_units:
                if ou["id"]: old_index[ou["id"]].append((code, ou["portion"]))
        # slugs, unique within the province
        seen = collections.Counter(slugify(full(u["type"], u["name"])) for u in units)
        for u in units:
            s = slugify(full(u["type"], u["name"]))
            u["slug"] = s if seen[s] == 1 else s + "-" + u["id"]
        # counts check (2025 types)
        stated = res["count"]; t25c = collections.Counter(split_type(groups[u["id"]][0]["new_name"])[0] for u in units)
        if stated["total"] != len(units) or any(stated.get(t, 0) != t25c.get(t, 0) for t in ("xã", "phường", "đặc khu")):
            issues.append({"issue": "count differs from resolution", "province": pmeta["TenTinh"], "stated": stated, "built": dict(t25c)})
        old_provs = sorted({(r["old_prov_code"], r["old_prov"]) for rr in groups.values() for r in rr if r["old_prov_code"]})
        out_provs.append({"pc": pc, "meta": pmeta, "res": res, "units": units, "old_provs": old_provs, "stated": stated})
        all_units.extend(units)

    # ---- check every old code against the official pre-merger list ----
    verify_old_codes(all_units, out_provs, issues, notes)
    old_index = collections.defaultdict(list)
    for u in all_units:
        for ou in u["old_units"]:
            if ou["id"]: old_index[ou["id"]].append((u["id"], ou["portion"]))

    # ---- split old units ----
    for u in all_units:
        for ou in u["old_units"]:
            if ou["id"] and len(old_index[ou["id"]]) > 1:
                ou["split"] = True; ou["also_in"] = sorted({c for c, _ in old_index[ou["id"]] if c != u["id"]})
            else:
                ou["split"] = False; ou["also_in"] = []

    # ---- wage regions ----
    region_issues = assign_regions(out_provs, regions, issues, notes)

    # ---- write ----
    write(out_provs, issues, notes, region_issues)

def _name_key(s, loose=False):
    """Type-aware key for an old unit name ('Thị trấn Thạnh An' != 'Xã Thạnh An')."""
    s = clean(s)
    s = re.sub(r"\b(?:NT|N\.T|N\. T)\b\.?", "Nông trường", s)
    s = re.sub(r"^(Phường|Xã|Thị trấn)\s+\1\s+", r"\1 ", s, flags=re.I)
    t, n = split_type(s)
    return (t or "") + "|" + (P.loose(n) if loose else P.key(n))

def verify_old_codes(all_units, out_provs, issues, notes):
    """Check each old unit's code against the NSO list of 30/06/2025 (fallback: copy of the NSO list of 04/01/2025).
    Same code, same name (allowing spelling variants) -> verified. Code points to another unit and the named unit
    exists in the same old district under another code -> the conversion table has a wrong code: corrected and flagged."""
    ref, by_dist = {}, collections.defaultdict(list)
    official = (dict(r, _src="nso-2025-06-30") for r in csv.DictReader(open(SRC / "nso-danh-muc-xa-2025-06-30.csv", encoding="utf-8")))
    for src in (official, third_party_list()):
        for r in src:
            if r["MaPhuongXa"] in ref: continue
            ref[r["MaPhuongXa"]] = r; by_dist[r["MaQuanHuyen"]].append(r)
    stats = collections.Counter()
    for u in all_units:
        for ou in u["old_units"]:
            if not ou["id"]:
                ou["code_check"] = None; continue
            r = ref.get(ou["id"])
            if r is None:
                ou["code_check"] = "khong-tim-thay"; stats["not found"] += 1
                issues.append({"issue": "old code not in any pre-merger list", "unit": u["full_name"], "old": ou["full_name"], "code": ou["id"]})
                continue
            if _name_key(r["TenPhuongXa"]) == _name_key(ou["full_name"]):
                ou["code_check"] = "khop"; stats["match"] += 1; continue
            # same code, name differs only in tone marks / spelling -> the same unit
            if _name_key(r["TenPhuongXa"], True) == _name_key(ou["full_name"], True):
                ou["code_check"] = "khop-ten-khac"; ou["name_in_list"] = r["TenPhuongXa"]; stats["spelling"] += 1
                notes.append({"note": "old unit spelled differently in the pre-merger list", "unit": u["full_name"], "old": ou["full_name"], "list": r["TenPhuongXa"], "code": ou["id"]})
                continue
            # otherwise: is this a wrong code? look for the named unit (same type) in the same old district
            same = [x for x in by_dist.get(ou["district_id"] or r["MaQuanHuyen"], []) if _name_key(x["TenPhuongXa"]) == _name_key(ou["full_name"])]
            if len(same) == 1 and same[0]["MaPhuongXa"] != ou["id"]:
                old = ou["id"]; ou["id"] = same[0]["MaPhuongXa"]; ou["code_check"] = "da-sua-ma"; stats["corrected"] += 1
                u["flags"].append("Bảng chuyển đổi ghi mã %s cho '%s', nhưng mã đó là của '%s'; mã đúng theo danh mục của Cục Thống kê là %s." % (old, ou["full_name"], r["TenPhuongXa"], ou["id"]))
                issues.append({"issue": "wrong old code in NSO table (corrected)", "unit": u["full_name"], "old": ou["full_name"], "table_code": old, "that_code_is": r["TenPhuongXa"], "correct_code": ou["id"]})
            elif len(same) == 0:
                # the code exists, the name differs by more than tone marks, and no unit of our name exists in that district:
                # most likely an older/variant name of the same commune, but not provable from these sources
                ou["code_check"] = "ten-khac-chua-xac-minh"; ou["name_in_list"] = r["TenPhuongXa"]; stats["name differs"] += 1
                notes.append({"note": "old unit name differs from the pre-merger list (code kept, unverified)", "unit": u["full_name"], "old": ou["full_name"], "list": r["TenPhuongXa"], "code": ou["id"], "district": r["TenQuanHuyen"]})
            else:
                ou["code_check"] = "chua-xac-minh"; stats["unclear"] += 1
                issues.append({"issue": "old code / name unclear", "unit": u["full_name"], "old": ou["full_name"], "code": ou["id"], "list_name": r["TenPhuongXa"]})
    print("old-code check:", dict(stats))

def assign_regions(out_provs, regions, issues, notes):
    unresolved = []
    for year, app in regions.items():
        by_key = {pkey(p["province"]): p for p in app}
        for pv in out_provs:
            p = by_key.get(pkey(pv["meta"]["TenTinh"]))
            if p is None: issues.append({"issue": "province missing from wage appendix", "year": year, "province": pv["meta"]["TenTinh"]}); continue
            # type of each unit at the time the decree was issued (Nov 2025 vs Nov 2026)
            def type_at(u):
                if year == "2026" and u["type_changes"]: return u["type_changes"][0]["from"]
                return u["type"]
            idx = collections.defaultdict(list)
            for u in pv["units"]: idx[(type_at(u), P.key(u["name"]))].append(u)
            byname = collections.defaultdict(list)
            for u in pv["units"]: byname[P.key(u["name"])].append(u)
            rest = None
            for g in p["regions"]:
                if g["rest"]: rest = g["region"]; continue
                for it in g["items"]:
                    t = it["type"] if it["type"] != "huyện" else "đặc khu"
                    hit = idx.get((t, P.key(it["name"]))) or []
                    if not hit:
                        hit = byname.get(P.key(it["name"])) or []
                        if len(hit) == 1: notes.append({"note": "wage appendix lists unit with another type", "year": year, "province": pv["meta"]["TenTinh"], "appendix": it["type"] + " " + it["name"], "unit": hit[0]["full_name"]})
                    if not hit:
                        fix_to = WAGE_ERRATA.get((year, pv["pc"], P.key(it["name"])))
                        if fix_to:
                            for nm in fix_to["to"]:
                                hh = byname.get(P.key(nm)) or []
                                if len(hh) == 1:
                                    if year in hh[0]["region"] and hh[0]["region"][year] != g["region"]: issues.append({"issue": "unit listed in two regions", "year": year, "unit": hh[0]["full_name"]})
                                    hh[0]["region"][year] = g["region"]
                                else:
                                    issues.append({"issue": "erratum target not found", "year": year, "province": pv["meta"]["TenTinh"], "to": nm})
                            notes.append({"note": "wage appendix erratum applied", "year": year, "province": pv["meta"]["TenTinh"], "appendix": it["type"] + " " + it["name"], "read_as": fix_to["to"], "why": fix_to["why"]})
                            continue
                    if len(hit) != 1:
                        unresolved.append({"year": year, "province": pv["meta"]["TenTinh"], "item": it["type"] + " " + it["name"], "matches": [u["full_name"] for u in hit]})
                        continue
                    u = hit[0]
                    if year in u["region"] and u["region"][year] != g["region"]:
                        issues.append({"issue": "unit listed in two regions", "year": year, "unit": u["full_name"]})
                    u["region"][year] = g["region"]
            for u in pv["units"]:
                if year not in u["region"]:
                    if rest is None: issues.append({"issue": "no 'còn lại' region", "year": year, "province": pv["meta"]["TenTinh"]}); continue
                    u["region"][year] = rest
    for x in unresolved: issues.append(dict(issue="wage appendix name not resolved", **x))
    return unresolved

# Typing slips in the published wage appendices, each checked by hand against the resolution and the other decree.
WAGE_ERRATA = {
    ("2026", "79", P.key("Tân Thạnh")): {"to": ["Tây Thạnh"], "why": "Không có phường Tân Thạnh ở TP.HCM sau sắp xếp; cùng vị trí trong danh sách, Nghị định 399/2026/NĐ-CP ghi 'Tây Thạnh' (phường Tây Thạnh, khoản 62 Nghị quyết 1685/NQ-UBTVQH15)."},
    ("2026", "79", P.key("Tân Nhựt Bình Chánh")): {"to": ["Tân Nhựt", "Bình Chánh"], "why": "Thiếu dấu phẩy giữa hai xã Tân Nhựt và Bình Chánh; Nghị định 399/2026/NĐ-CP ghi 'Tân Nhựt, Bình Chánh'."},
    ("2026", "24", P.key("Tự Lan")): {"to": ["Tự Lạn"], "why": "Nghị quyết 1658/NQ-UBTVQH15 và Cục Thống kê ghi phường Tự Lạn; không có đơn vị Tự Lan."},
    ("2027", "24", P.key("Tự Lan")): {"to": ["Tự Lạn"], "why": "Nghị quyết 1658/NQ-UBTVQH15 và Cục Thống kê ghi phường Tự Lạn; không có đơn vị Tự Lan."},
}

WAGE = {"2026": {"decree": "293/2025/NĐ-CP", "effective": "2026-01-01", "until": "2026-12-31", "monthly": {"I": 5310000, "II": 4730000, "III": 4140000, "IV": 3700000}, "hourly": {"I": 25500, "II": 22700, "III": 20000, "IV": 17800}},
        "2027": {"decree": "399/2026/NĐ-CP", "effective": "2027-01-01", "monthly": {"I": 5700000, "II": 5080000, "III": 4450000, "IV": 4040000}, "hourly": {"I": 27400, "II": 24400, "III": 21400, "IV": 19400}}}

def write(out_provs, issues, notes, unresolved):
    (OUT / "tinh").mkdir(parents=True, exist_ok=True)
    index = {"schema_version": 1, "built": datetime.date.today().isoformat(), "as_of": "2026-11-18",
             "description": "Đơn vị hành chính cấp tỉnh, cấp xã của Việt Nam sau sắp xếp từ 01/07/2025 (cập nhật thay đổi năm 2026), đơn vị cũ hợp thành và vùng lương tối thiểu.",
             "wage": WAGE, "provinces": [], "totals": {}}
    tot = collections.Counter(); tot25 = collections.Counter()
    for pv in out_provs:
        m = pv["meta"]; name = re.sub(r"^(Thành phố|Tỉnh|Thủ đô)\s+", "", m["TenTinh"])
        slug = slugify(name); fname = "%s-%s.json" % (pv["pc"], slug)
        units = pv["units"]
        for u in units: tot[u["type"]] += 1
        for t, n in pv["stated"].items():
            if t != "total": tot25[t] += n
        doc = {"id": pv["pc"], "name": name, "full_name": m["TenTinh"], "type": "thành phố" if m["LoaiHinh"].startswith("Thành phố") else "tỉnh", "slug": slug,
               "formed_from": [{"id": c, "name": n} for c, n in pv["old_provs"]],
               "sources": {"province_resolution": "202/2025/QH15", "commune_resolution": pv["res"]["so"], "commune_resolution_date": "2025-06-16",
                           "effective": "2025-07-01", "stated_count": pv["stated"]},
               "units": units}
        chg = json.load(open(SRC / "thay-doi-2026.json", encoding="utf-8"))
        city = next((c for c in chg["tinh_thanh_thanh_pho"] if c["ma_tinh"] == pv["pc"]), None)
        if city: doc["sources"]["became_city"] = {"resolution": city["so"], "effective": city["hieu_luc"]}
        doc["sources"]["citations"] = citations(pv, city, [x for x in chg["xa_thanh_phuong"] if x["ma_tinh"] == pv["pc"]])
        json.dump(doc, open(OUT / "tinh" / fname, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        index["provinces"].append({"id": pv["pc"], "name": name, "full_name": m["TenTinh"], "slug": slug, "file": "tinh/" + fname, "units": len(units),
                                   "by_type": dict(collections.Counter(u["type"] for u in units)), "formed_from": [n for _, n in pv["old_provs"]],
                                   "commune_resolution": pv["res"]["so"]})
    index["totals"] = {"provinces": len(out_provs), "units": sum(tot.values()), "by_type_now": dict(tot), "by_type_2025_07_01": dict(tot25)}
    json.dump(index, open(OUT / "index.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"issues": issues, "notes": notes}, open(OUT / "bao-cao-doi-chieu.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("provinces", len(out_provs), "units", sum(tot.values()), dict(tot), "| issues", len(issues), collections.Counter(i["issue"] for i in issues).most_common(), "| notes", collections.Counter(n["note"] for n in notes).most_common())

if __name__ == "__main__":
    main()
    import report; report.main()
