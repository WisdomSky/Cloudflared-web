export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🎯 根目錄 - 主頁回應
    if (url.pathname === "/") {
      return new Response("✅ SkyRoute-Enterprise 正常運作！\n歡迎使用 workerdanver1.haveanewlife.workers.dev", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 🎯 健康檢查路徑
    if (url.pathname === "/healthcheck") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🎯 favicon.ico 請求避免 404
    if (url.pathname === "/favicon.ico") {
      return new Response("", { status: 204 });
    }

    // 🎯 API 動態控制
    if (url.pathname.startsWith("/api/")) {
      const action = url.searchParams.get("action");
      if (!action) {
        return new Response("請指定 action 參數。\n範例：/api/?action=listTunnels", { status: 400 });
      }

      const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const options = {
          method,
          headers: {
            'Authorization': `Bearer ${env.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
      };

      try {
        let result;
        switch (action) {
          case 'verifyToken':
            result = await apiRequest('/user/tokens/verify');
            break;
          case 'listTunnels':
            result = await apiRequest(`/accounts/${env.CF_ACCOUNT_ID}/cfd_tunnel`);
            break;
          case 'listCertificates':
            result = await apiRequest(`/accounts/${env.CF_ACCOUNT_ID}/access/certificates`);
            break;
          case 'listAccessApps':
            result = await apiRequest(`/accounts/${env.CF_ACCOUNT_ID}/access/apps`);
            break;
          default:
            return new Response("無效的 action。請使用：verifyToken, listTunnels, listCertificates, listAccessApps", { status: 400 });
        }

        return new Response(JSON.stringify(result.data, null, 2), {
          status: result.status,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(`API 錯誤：${error.message}`, { status: 500 });
      }
    }

    // 🎯 Proxy 服務：Home Assistant
    if (url.pathname.startsWith("/ha")) {
      return proxyRequest(url, request, "mingleedan.org", "8123", "/ha");
    }

    // 🎯 Proxy 服務：Media Server
    if (url.pathname.startsWith("/media")) {
      return proxyRequest(url, request, "mingleedan.org", "8096", "/media");
    }

    // 🎯 NAS Placeholder
    if (url.pathname.startsWith("/nas")) {
      return new Response("🚧 NAS 服務尚未啟用。如需啟用請重新安裝 NAS 並確認服務已啟動。", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 🎯 其他路徑：統一回應 404 Not Found
    return new Response("❌ 404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

// 📦 通用 Proxy 處理函式
async function proxyRequest(url, request, targetHost, targetPort, basePath) {
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

    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    newHeaders.set("Permissions-Policy", "accelerometer=(), camera=(), microphone=()");
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
    return new Response(`Tunnel error: ${error.message}`, { status: 502 });
  }
}
