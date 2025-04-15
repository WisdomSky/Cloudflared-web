export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === "/") {
      return new Response("✅ Cloudflare Worker 正常運作！\n歡迎使用 workerdanver1.haveanewlife.workers.dev", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    if (url.pathname === "/healthcheck") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (url.pathname === "/favicon.ico") {
      return new Response("", { status: 204 })
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ message: "API Endpoint hit!", path: url.pathname }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response("❌ 404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  },
}

// ✅ 新增：Cron Trigger 的 scheduled handler
export const scheduled = async (event, env, ctx) => {
  console.log("⏰ Cron job triggered at", new Date().toISOString())
}
