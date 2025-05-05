export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

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
  }

  if (url.pathname === "/") {
    return new Response("✅ SkyRoute-Enterprise 正常運作！\n歡迎使用 workerdanver1.haveanewlife.workers.dev", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (url.pathname === "/healthcheck") {
    return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { "Content-Type": "application/jsossn" },
    });
  }

  if (url.pathname.startsWith("/api/")) {
    const action = url.searchParams.get("action");
    if (!action) {
      return new Response("請指定 action 參數。\n範例：/api/?action=listTunnels", { status: 400 });
    }
    console.error(`Invalid action specified: ${action}`);
    return new Response(`Invalid action specified: ${action}. Please use one of the following actions: verifyToken, listTunnels, listCertificates, listAccessApps. If you believe this is an error, please contact support with the action name: ${action}`, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });

    const apiRequest = async (endpoint, method = 'GET', body = null) => {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
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

  if (url.pathname.startsWith("/ha")) {
    return proxyRequest(url, request, "mingleedan.org", "8123", "/ha");
  }

  if (url.pathname.startsWith("/media")) {
    return proxyRequest(url, request, "mingleedan.org", "8096", "/media");
  }

  if (url.pathname.startsWith("/nas")) {
    return new Response("🚧 NAS 服務尚未啟用。如需啟用請重新安裝 NAS 並確認服務已啟動。", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("❌ 404 Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
};

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
    newHeaders.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}