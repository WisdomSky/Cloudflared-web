export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ✅ 根目錄首頁
    if (url.pathname === "/") {
      return new Response("✅ Cloudflare Worker 正常運作！\n歡迎使用 workerdanver1.haveanewlife.workers.dev", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // ✅ 健康檢查
    if (url.pathname === "/healthcheck") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ favicon.ico 避免 404
    if (url.pathname === "/favicon.ico") {
      return new Response("", { status: 204 });
    }

    // ✅ API 控制路徑（預留擴充）
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ message: "API Endpoint hit!", path: url.pathname }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Proxy 服務：Home Assistant
    if (url.pathname.startsWith("/ha")) {
      return proxyRequest(url, request, "mingleedan.org", "8123", "/ha");
    }

    // ✅ Proxy 服務：Media Server
    if (url.pathname.startsWith("/media")) {
      return proxyRequest(url, request, "mingleedan.org", "8096", "/media");
    }

    // ✅ Placeholder：NAS
    if (url.pathname.startsWith("/nas")) {
      return new Response("🚧 NAS 服務尚未啟用。如需啟用請重新安裝 NAS 並確認服務已啟動。", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // ✅ 其他未匹配路徑
    return new Response("❌ 404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

// 📦 通用 Proxy 處理函式
async function proxyRequest(url, request, targetHost, targetPort, basePath) {
  // 重建 URL
  const targetUrl = new URL(request.url);
  targetUrl.hostname = targetHost;
  targetUrl.port = targetPort;
  targetUrl.pathname = targetUrl.pathname.replace(basePath, "") || "/";

  const modifiedRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
    redirect: "follow",
  });

  try {
    const response = await fetch(modifiedRequest);

    // 安全與 CORS 頭部強化
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    newHeaders.set("Permissions-Policy", "accelerometer=(), camera=(), microphone=()");
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // 處理 OPTIONS 預檢請求（CORS）
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: newHeaders });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Tunnel error: ${error.message}`, { status: 502 });
  }
}
