// Bộ đếm lượt xem công khai cho tinhgium.vn và tietkiemdau.vn (Cloudflare Worker + Durable Object, gói miễn phí).
//
//   GET /c?site=tinhgium&p=/tinh-luong-gross-net/&hit=1  -> {"page": 123, "total": 4567}
//     hit=1: cộng thêm một lượt rồi trả số mới; hit=0: chỉ đọc.
//
// Chỉ lưu con số theo đường dẫn trang; không lưu IP, cookie hay bất kỳ thông tin nào về người xem.
const SITES = ["tinhgium", "tietkiemdau"];
const ORIGINS = [/^https:\/\/(www\.)?tinhgium\.vn$/, /^https:\/\/(www\.)?tietkiemdau\.vn$/, /^https:\/\/lamvutran2003\.github\.io$/, /^http:\/\/localhost(:\d+)?$/];

function cors(origin) {
  const ok = origin && ORIGINS.some(re => re.test(origin));
  return { "Access-Control-Allow-Origin": ok ? origin : "https://tinhgium.vn", "Vary": "Origin", "Cache-Control": "no-store" };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), headers = cors(request.headers.get("Origin"));
    if (request.method === "OPTIONS") return new Response(null, { headers: { ...headers, "Access-Control-Allow-Methods": "GET" } });
    if (url.pathname !== "/c") return new Response("Tính Giùm counter", { headers });
    const site = url.searchParams.get("site"), path = (url.searchParams.get("p") || "/").slice(0, 120);
    // Chỉ nhận đường dẫn gọn (chữ thường, số, gạch nối, gạch chéo) để không ai làm đầy kho bằng khoá rác
    if (!SITES.includes(site) || !/^\/[a-z0-9\-\/]*$/.test(path)) return Response.json({ error: "bad request" }, { status: 400, headers });
    const stub = env.COUNTER.get(env.COUNTER.idFromName(site));
    const res = await stub.fetch(`https://do/?p=${encodeURIComponent(path)}&hit=${url.searchParams.get("hit") === "1" ? 1 : 0}`);
    return new Response(res.body, { headers: { ...headers, "Content-Type": "application/json" } });
  }
};

// Một Durable Object cho mỗi trang web; lưu {đường dẫn: số lượt} và tổng.
export class Counter {
  constructor(state) { this.storage = state.storage; }
  async fetch(request) {
    const url = new URL(request.url), path = url.searchParams.get("p"), hit = url.searchParams.get("hit") === "1";
    let page = (await this.storage.get("p:" + path)) || 0, total = (await this.storage.get("total")) || 0;
    if (hit) { page++; total++; await this.storage.put({ ["p:" + path]: page, total }); }
    return Response.json({ page, total });
  }
}
