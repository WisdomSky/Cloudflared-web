export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🎯 特定路徑處理
        if (hostname === 'home.mingleedan.org') {
      const tunnelUrl = env.TUNNEL_HOME_URL; // 從環境變數讀取 Tunnel URL

      if (!tunnelUrl) {
        // 如果沒有設定 Tunnel URL，回傳錯誤
        return new Response('Backend tunnel URL not configured for home.mingleedan.org', { status: 503 });
      }

      // 建立要轉發到的完整 URL (Tunnel URL + 原始路徑和查詢參數)
      const targetUrl = tunnelUrl + url.pathname + url.search;

      console.log(`Forwarding request for ${hostname} to ${targetUrl}`);

      // 使用 fetch 將原始請求轉發到 Tunnel
      // Cloudflare 會在內部處理到 .cfargotunnel.com 的路由
      // 直接傳遞原始 request 物件可以保留大部分的 headers, method, body 等
      try {
        return await fetch(targetUrl, request);
      } catch (error) {
        console.error(`Error forwarding request to tunnel: ${error}`);
        return new Response('Failed to connect to backend service', { status: 502 });
      }

    } else if (hostname === 'admin.mingleedan.org') {
      // ... admin 邏輯 ...
      return new Response('Admin route');
    } else {
      return new Response('Not Found', { status: 404 });
    }
  },
};
    if (url.pathname === "/") {
      return new Response("✅ Cloudflare Worker 正常運作！\n歡迎使用 workerdanver1.haveanewlife.workers.dev", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/healthcheck") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/favicon.ico") {
      return new Response("", { status: 204 });
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ message: "API Endpoint hit!", path: url.pathname }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🎯 預設行為：反向代理至 Home Assistant
    const targetHost = "mingleedan.org"; // 或 Cloudflare Tunnel 對外網址
    const targetPort = "8123";
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHost;
    targetUrl.port = targetPort;

    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "follow",
    });

    try {
      const response = await fetch(modifiedRequest);
      const newHeaders = new Headers(response.headers);

      // 加入 CORS 與安全性標頭（依需求調整）
      newHeaders.set("X-Frame-Options", "DENY");
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: newHeaders });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      return new Response(`Proxy error to Home Assistant: ${error.message}`, { status: 502 });
    }
};

 // ✅ Cron handler：每 30 分鐘觸發一次，可自訂邏輯
export const scheduled = async (event, env, ctx) => {
  console.log("⏰ Cron job triggered at", new Date().toISOString());

  // 範例：打一下 API 或執行健康檢查
  // await fetch("https://home.mingleedan.org/healthcheck");
};
