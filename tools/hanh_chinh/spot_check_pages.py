"""Kiểm tra ngẫu nhiên các trang xã, phường đã dựng (dist/dia-chi-moi/<tỉnh>/<xã>/) với bộ dữ liệu và văn bản gốc.

    python3 build.py && python3 tools/hanh_chinh/spot_check_pages.py [số trang=10] [hạt giống]

Mỗi trang: đọc lại từ HTML các đơn vị cũ (tên, huyện/tỉnh cũ, phạm vi nhập), vùng lương, nghị quyết và khoản; so với
data/hanh-chinh; rồi so với toàn văn khoản đó trong nghị quyết (tên đơn vị mới, tên và phạm vi từng đơn vị cũ) và với
phụ lục Nghị định 293/2025/NĐ-CP (vùng của đơn vị). In đoạn nghị quyết để người đọc tự đối chiếu.
"""
import html, json, random, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
import parse as P
from build import WAGE_ERRATA          # lỗi đánh máy trong phụ lục, đã ghi trong BAO-CAO.md

DATA, DIST = ROOT / "data/hanh-chinh", ROOT / "dist"
PORT = {"toàn bộ": "toan-bo", "một phần": "mot-phan", "phần còn lại": "phan-con-lai"}
KIND = {"whole": "toan-bo", "part": "mot-phan", "rest": "phan-con-lai"}
text = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def page_facts(path):
    s = path.read_text(encoding="utf-8")
    main = re.search(r"<main.*?</main>", s, re.S).group(0)
    tbl = re.search(r"<th>Đơn vị cũ</th>.*?<tbody>(.*?)</tbody>", main, re.S).group(1)
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", tbl, re.S):
        tds = re.findall(r"<td>(.*?)</td>", tr, re.S)
        name = text(re.sub(r"<br>.*", "", tds[0], flags=re.S))
        portion = text(re.sub(r"<br>.*", "", tds[2], flags=re.S))
        rows.append((name, text(tds[1]), PORT[portion], "trong Huyện" in tds[2]))
    region = re.search(r"Vùng lương 2026</th><td><b>Vùng (I|II|III|IV)</b>", main).group(1)
    m = re.search(r"Nghị quyết ([\d]+/NQ-UBTVQH15)</a>(?:, khoản (\d+) Điều 1|: không sắp xếp)", main)
    title = re.search(r"<title>(.*?)</title>", s).group(1)
    return {"rows": rows, "region": region, "resolution": m.group(1), "clause": int(m.group(2)) if m.group(2) else None, "title": html.unescape(title)}


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    rnd = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 20261119)
    index = json.load(open(DATA / "index.json", encoding="utf-8"))
    provs = [json.load(open(DATA / p["file"], encoding="utf-8")) for p in index["provinces"]]
    allu = [(p, u) for p in provs for u in p["units"]]
    appendix = {P.key(re.sub(r"^(Tỉnh|Thành phố|Thủ đô) ", "", b["province"])): b for b in P.parse_appendix(str(DATA / "sources/nd-293-2025-phu-luc.txt"))}
    problems = 0
    n = min(n, len(allu))
    for p, u in rnd.sample(allu, n):
        url = f"/dia-chi-moi/{p['slug']}/{u['slug']}/"
        f = page_facts(DIST / url.strip("/") / "index.html")
        errs = []
        # 1. trang = bộ dữ liệu
        want = sorted((o["full_name"], ", ".join(x for x in ([o["district"]] if o["district"] and o["type"] != "huyện" else []) + [o["province"]] if x), o["portion"]) for o in u["old_units"])
        if sorted(r[:3] for r in f["rows"]) != want: errs.append(f"old units on page {f['rows']} != dataset {want}")
        if f["region"] != u["region"]["2026"]: errs.append(f"region {f['region']} != {u['region']['2026']}")
        if f["resolution"] != p["sources"]["commune_resolution"] or f["clause"] != u["source"].get("clause"): errs.append("resolution/clause differs")
        if not f["title"].startswith(u["full_name"] + " (" + p["name"] + ")"): errs.append("title")
        # 2. trang = nghị quyết (toàn văn khoản)
        r = P.parse_resolution(str(DATA / "sources/nghi-quyet" / (f["resolution"].replace("/", "-") + ".txt")))
        if f["clause"]:
            cl = next(c for c in r["clauses"] if c["k"] == f["clause"])
            if P.key(cl["new_name"]) != P.key(u["name"]) or cl["new_type"] != (u["type_changes"][0]["from"] if u["type_changes"] else u["type"]):
                errs.append(f"resolution names {cl['new_type']} {cl['new_name']}")
            # so tên không dấu thanh (Đắk/Đăk, Trang/Trạng: các cách viết đã ghi trong BAO-CAO.md); khu vực không phải đơn vị
            # hành chính (trường bắn, bãi bồi) không có dân số riêng nên "toàn bộ diện tích" là toàn bộ
            res_parts = sorted((P.loose(re.sub(r"\s*\(.*?\)", "", x["name"])), "toan-bo" if x["type"] == "khu vực" else KIND[x["kind"]]) for x in cl["parts"])
            # các xã nằm trong huyện đã nêu (đặc khu lập từ cả huyện) không phải là phần riêng trong nghị quyết
            page_parts = sorted((P.loose(re.sub(r"\s*\(.*?\)|\s+do huyện .*$", "", re.sub(r"^(Xã|Phường|Thị trấn|Huyện) ", "", nm))), por) for nm, _, por, inside in f["rows"] if not inside)
            if res_parts != page_parts: errs.append(f"resolution parts {res_parts} != page {page_parts}")
            src = cl["raw"]
        else:
            if P.key(u["name"]) not in {P.key(x["name"] if isinstance(x, dict) else x) for x in r["unchanged"]}: errs.append("not in the resolution's unchanged list")
            src = "(đơn vị không sắp xếp; nêu ở khoản cuối Điều 1)"
        # 3. vùng = phụ lục Nghị định 293/2025/NĐ-CP
        blk = appendix[P.key(p["name"])]
        def names(it):
            fix = WAGE_ERRATA.get(("2026", p["id"], P.key(it["name"])))
            return [P.key(x) for x in fix["to"]] if fix else [P.key(it["name"])]
        listed = [g["region"] for g in blk["regions"] for it in g["items"] if P.key(u["name"]) in names(it)]
        rest = [g["region"] for g in blk["regions"] if g["rest"]]
        app_region = listed[0] if listed else rest[0]
        if app_region != f["region"]: errs.append(f"appendix says region {app_region}")
        problems += bool(errs)
        print(f"{'OK ' if not errs else 'BAD'} {u['full_name']}, {p['full_name']} — {url}")
        print(f"    trang: vùng {f['region']} ({'liệt kê' if listed else 'các xã, phường còn lại'} trong phụ lục); {f['resolution']}"
              + (f", khoản {f['clause']}" if f["clause"] else "") + "; " + "; ".join(f"{nm} ({por})" for nm, _, por, _i in f["rows"]))
        print(f"    nghị quyết: {src}")
        for e in errs: print("    !!", e)
    print(f"{n - problems}/{n} pages match the dataset, the resolution text and the wage appendix")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
