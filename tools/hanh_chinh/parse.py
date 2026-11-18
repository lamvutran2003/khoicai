"""Parsers for the official texts behind data/hanh-chinh:

* the 34 resolutions of the National Assembly Standing Committee (UBTVQH, 16/06/2025) that rearranged
  commune-level units of each province from 01/07/2025 (Điều 1 of each, stored in sources/nghi-quyet/);
* the appendices of the minimum-wage decrees 293/2025/NĐ-CP (from 01/01/2026) and 399/2026/NĐ-CP (from 01/01/2027).

The published HTML/PDF texts contain typing slips (missing spaces, "quy mô dân" for "quy mô dân số", a missing
"của", ...). fix() repairs only spacing and these slips; it never changes a unit name.
"""
import re, unicodedata


TYPES = r"(?:xã|phường|thị trấn|đặc khu|huyện)"
UP = "A-ZĐÂĂÊÔƠƯÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ"
LOW = "a-zđâăêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ"

def fix(t):
    t = unicodedata.normalize("NFC", t)
    t = t.replace("x ã", "xã").replace("’", "'").replace("‘", "'")
    t = re.sub(r"\bp hường\b", "phường", t); t = re.sub(r"\bph ường\b", "phường", t); t = re.sub(r"\bth ị trấn\b", "thị trấn", t)
    t = re.sub(r"Sắp xếp(?=\S)", "Sắp xếp ", t)
    t = re.sub(r"\b(của|và|gồm|là|các)(?=(?:xã|phường|thị trấn|huyện|đặc khu|\d|[" + UP + "]))", r"\1 ", t)
    t = re.sub(r"(?<=[" + LOW + r"])(thành (?:xã|phường|đặc khu))", r" \1", t)
    t = re.sub(r"(?<=[" + LOW + r"])(và (?:xã|phường|thị trấn|các))", r" \1", t)
    t = re.sub(r"\b(xã|phường|thị trấn|đặc khu)(?=[" + UP + r"\d])", r"\1 ", t)
    t = re.sub(r"Điều này(?=\S)", "Điều này ", t)
    t = re.sub(r"khoản(?=\d)", "khoản ", t)
    t = re.sub(r"(?<=\S)(?=sau khi (?:thực hiện )?sắp xếp)", " ", t)
    t = re.sub(r",(?=\S)", ", ", t)
    t = re.sub(r"(?<=[^\s(])thành(?= ?(?:xã|phường|đặc khu)\b)", " thành", t)
    t = re.sub(r"\bthành(?=(?:xã|phường|đặc khu))", "thành ", t)
    t = re.sub(r"\bvà(?=(?:một|phần|toàn))", "và ", t)
    t = re.sub(r"(số|lại|nhiên)của(?=\s|các|xã|phường|thị)", r"\1 của", t)
    t = re.sub(r"\bcủa(?=các)", "của ", t)
    t = re.sub(r"\btại(?=khoản|các)", "tại ", t)
    t = re.sub(r"(?<=[a-zđâăêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ])và(?=\s|các|xã|phường|thị|[A-ZĐÂĂÊÔƠƯ])", " và", t)
    t = re.sub(r"\bvà(?=(?:các|xã|phường|thị trấn|[A-ZĐÂĂÊÔƠƯ]))", "và ", t)
    t = re.sub(r"\bcác(?=xã|phường|thị)", "các ", t)
    t = re.sub(r"(?<=\b[A-Z])và(?= )", " và", t)
    t = re.sub(r"\bHò a\b", "Hòa", t)
    t = re.sub(r"(?<=[a-zđâăêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ])(xã|phường)(?= [A-ZĐÂĂÊÔƠƯ])", r" \1", t)
    t = re.sub(r"\b(huyện|quận|thị xã|thành phố)(?=[A-ZĐÂĂÊÔƠƯ])", r"\1 ", t)
    t = re.sub(r"\)(?=[^\s,.;)])", ") ", t)
    t = re.sub(r"(?<=[^\s(])\(", " (", t)
    t = re.sub(r"\b(xã) xã\b", r"\1", t)
    t = re.sub(r"\bcủa của\b", "của", t)
    t = re.sub(r"[ ]{2,}", " ", t)
    return t

TONE_NEW_TO_OLD = {"òa": "oà", "óa": "oá", "ỏa": "oả", "õa": "oã", "ọa": "oạ", "òe": "oè", "óe": "oé", "ỏe": "oẻ", "õe": "oẽ", "ọe": "oẹ",
                   "ùy": "uỳ", "úy": "uý", "ủy": "uỷ", "ũy": "uỹ", "ụy": "uỵ"}
def key(s):
    """Comparison key: NFC, lower-case, one tone-placement convention (hoà = hòa, thuỷ = thủy), no spaces/punctuation. Tones are kept."""
    s = unicodedata.normalize("NFC", s.lower())
    s = re.sub(r"(?<!q)(òa|óa|ỏa|õa|ọa|òe|óe|ỏe|õe|ọe|ùy|úy|ủy|ũy|ụy)(?![a-zđâăêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ])", lambda m: TONE_NEW_TO_OLD[m.group(1)], s)
    return re.sub(r"[\s'’\-.]", "", s)
def loose(s):
    """Tone-insensitive key, only used to label spelling variants."""
    s = unicodedata.normalize("NFD", s.lower()); s = "".join(ch for ch in s if ch not in "\u0300\u0301\u0303\u0309\u0323")
    s = unicodedata.normalize("NFC", s).replace("ă", "a").replace("â", "a")
    return re.sub(r"[\s'’\-.]", "", s)

MARK = re.compile(r"(một phần diện tích tự nhiên,? toàn bộ quy mô dân(?: số)?(?: của)?|"
                  r"toàn bộ quy mô dân số và một phần diện tích tự nhiên(?: của)?|"
                  r"một phần diện tích(?: tự nhiên)?,? (?:và )?quy mô dân(?: số)?(?: của)?|"
                  r"một phần diện tích tự nhiên(?: của)?|một phần quy mô dân số(?: của)?|"
                  r"(?:toàn )?bộ diện tích tự nhiên,? (?:và )?quy mô dân(?: số)?(?: của)?|"
                  r"toàn bộ diện tích tự nhiên(?: của)?|toàn bộ(?= (?:xã|phường|thị trấn|huyện) )|phần quy mô dân số còn lại của|phần còn lại(?: của)?)")
def mark_kind(m):
    if m.startswith("phần còn lại") or m.startswith("phần quy mô dân số còn lại"): return "rest"
    if m.startswith("một phần") or m.startswith("toàn bộ quy mô dân số và một phần"): return "part"
    # "toàn bộ diện tích tự nhiên của X" without "quy mô dân số": all of the land, not the population
    # (e.g. xã Kỳ Lợi, whose residents went to two other wards) -> a partial merge
    if re.fullmatch(r"toàn bộ diện tích tự nhiên(?: của)?", m): return "part"
    return "whole"

def items(seg, kind=None):
    """Names listed in one segment. In a 'rest' segment, units listed after '... sau khi sắp xếp ... Điều này và'
    grammatically belong to the preceding whole-unit list, so they are returned as kind 'whole'."""
    seg = re.sub(r"\s*\((?:phần còn lại[^)]*|sau khi[^)]*)\)", "", seg)
    pieces = re.split(r"\s*sau khi (?:thực hiện )?sắp xếp(?: theo quy định)?(?: tại)?(?: các)? khoản(?: \d+|,| khoản| và)*(?:\s*(?:của )?Điều này)?", seg)
    out = []
    for idx, piece in enumerate(pieces):
        k = kind if (kind != "rest" or idx == 0) else "whole"
        piece = re.sub(r"^\s*(?:,|và)\s*", "", piece).strip(" ,.;")
        piece = re.sub(r"\s+và\s*$", "", piece)
        if not piece: continue
        for it in _items(piece): it["kind"] = k; out.append(it)
    return out

def _items(seg):
    toks = re.split(r"(?:,\s*|;\s*|\s+và\s+)(?![^(]*\))", seg)
    toks = [x for t0 in toks for x in re.split(r"(?<!các)(?<!và)\s+(?=(?:xã|phường|thị trấn) [A-ZĐÂĂÊÔƠƯ])(?![^(]*\))", t0)]
    out, cur = [], None
    for tok in toks:
        tok = tok.strip(" ,.;")
        if not tok or tok in ("các", "và"): continue
        q = None
        mq = re.search(r"\(([^)]*)\)\s*$", tok)
        if mq: q = mq.group(1).strip(); tok = tok[:mq.start()].strip()
        m = re.match(r"^(?:các\s+)?(xã|phường|thị trấn|huyện|đặc khu)\s+(.+)$", tok, re.I)
        if m:
            cur = m.group(1).lower(); name = m.group(2).strip()
        elif re.match(r"^(?:phường\s+)?Phường\s+\d", tok):
            cur = "phường"; name = tok.split(None, 1)[1]
        else:
            name = tok
        if cur is None:
            # a named area that is not a commune, e.g. "Trường bắn TB1", "khu vực bãi bồi ven biển"
            if re.match(r"^(?:khu vực|Trường bắn|Khu|khu)\b", tok): out.append({"type": "khu vực", "name": tok, "qual": q}); continue
            raise ValueError("cannot tell the unit type of %r in %r" % (tok, seg[:160]))
        name = re.sub(r"^Phường\s+(?=\d)", "", name)
        out.append({"type": cur, "name": name, "qual": q})
    return out

NEW = re.compile(r"\bthành (xã|phường|đặc khu)(?: mới)?(?: có tên gọi là| có tên là)? (?:(xã|phường|đặc khu) )?(.+?)\s*\.?\s*$")
def parse_resolution(path):
    """Parse one stored resolution text (Điều 1) into clauses, the stated count and the list of unchanged units."""
    t = fix(open(path, encoding="utf-8").read())
    num = re.search(r"(\d+)-NQ-UBTVQH15", path).group(1)
    a = t.find("Điều 1"); body = t[a:]
    clauses = re.findall(r"\n\s*(\d+)\.\s*(.+)", body)
    res = {"so": num + "/NQ-UBTVQH15", "clauses": [], "count": None, "unchanged": []}
    for k, c in clauses:
        c = c.strip()
        if c.startswith("Sau khi sắp xếp"):
            m = re.search(r"có (\d+) đơn vị hành chính cấp xã,? gồm ([^;.]+)", c)
            cnt = {"total": int(m.group(1))}
            for n, ty in re.findall(r"(\d+) (xã|phường|đặc khu)", m.group(2)): cnt[ty] = int(n)
            res["count"] = cnt
            mp = re.match(r"Sau khi sắp xếp,? (.+?) có \d+", c); res["prov"] = mp.group(1).strip() if mp else None
            mu = re.search(r"không thực hiện sắp xếp là (.+?)\.?\s*$", c)
            if mu: res["unchanged"] = items(mu.group(1), "whole")
            continue
        mr = re.match(r"Đổi tên (xã|phường) (.+?) thành (xã|phường) (.+?)\s*\.?\s*$", c)
        if mr:
            res["clauses"].append({"k": int(k), "new_type": mr.group(3), "new_name": mr.group(4).strip(), "parts": [{"type": mr.group(1), "name": mr.group(2).strip(), "qual": None, "kind": "whole"}], "rename": True, "raw": c})
            continue
        m = NEW.search(c)
        if not m:
            res["clauses"].append({"k": int(k), "unparsed": c}); continue
        ntype = m.group(2) or m.group(1); nname = m.group(3).strip()
        if re.match(r"^Phường\s+\d", nname): nname = nname.split(None, 1)[1]
        src = c[:m.start()]
        src = re.sub(r"^Sắp xếp\s*", "", src)
        pieces = MARK.split(src)
        parts = []
        kind = None
        for idx, p in enumerate(pieces):
            if idx % 2 == 1: kind = mark_kind(p); continue      # re.split with one capture group: odd items are markers
            if kind is None: continue
            parts.extend(items(p, kind))
        res["clauses"].append({"k": int(k), "new_type": ntype, "new_name": nname, "parts": parts, "raw": c})
    return res


def _load_appendix(path):
    t = unicodedata.normalize("NFC", open(path, encoding="utf-8").read())
    t = re.sub(r"\n\s*\d+\s*\n", "\n", t)               # page numbers
    t = re.sub(r"Cơ quan phát hành:.*\n|Số: \d+/\d+/NĐ-CP\s*\n|Thời gian ký:.*\n", "", t)
    i = t.find("1. Thành phố Hà Nội"); t = t[i:]
    t = re.sub(r"\s+", " ", t)
    return fix(t)

def parse_appendix(path):
    t = _load_appendix(path)
    provs = re.split(r"\s(?=\d{1,2}\. (?:Thành phố|Tỉnh|Thủ đô) )", " " + t)
    out = []
    for block in provs:
        block = block.strip()
        if not block: continue
        m = re.match(r"(\d{1,2})\. ((?:Thành phố|Tỉnh|Thủ đô) [^-]+?)\s*-\s*(Vùng.*)$", block)
        if not m: raise ValueError("cannot parse province block: " + block[:120])
        num, prov, rest = m.group(1), m.group(2).strip(), m.group(3)
        regions = []
        for part in re.split(r"\s*-\s*(?=Vùng (?:I|II|III|IV),)", rest):
            mr = re.match(r"Vùng (I|II|III|IV), gồm (.+?)\.?\s*$", part.strip())
            if not mr: raise ValueError("cannot parse region in " + prov + ": " + part[:120])
            reg, body = mr.group(1), mr.group(2).strip()
            if re.fullmatch(r"(?:các )?(?:xã, phường|phường, xã|xã, phường, đặc khu|xã, đặc khu, phường|xã, phường và đặc khu)(?: còn lại)?(?: còn lại)?", body) or body.endswith("còn lại"):
                regions.append({"region": reg, "rest": True, "items": []}); continue
            regions.append({"region": reg, "rest": False, "items": _items(body)})
        out.append({"num": int(num), "province": prov, "regions": regions})
    return out

