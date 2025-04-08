export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // 🎯 根目錄 - 主頁回應
    if (url.pathname === "/") {
      return new Response("✅ Cloudflare Worker 正常運作！\n歡迎使用 workerdanver1.haveanewlife.workers.dev", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    // 🎯 健康檢查路徑
    if (url.pathname === "/healthcheck") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 🎯 favicon.ico 請求避免 404
    if (url.pathname === "/favicon.ico") {
      return new Response("", { status: 204 })
    }

    // 🎯 API 路徑示範
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ message: "API Endpoint hit!", path: url.pathname }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 🎯 其他路徑：統一回應 404 Not Found
    return new Response("❌ 404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  },
}
