export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = env.CF_API_TOKEN;
    const accountId = env.CF_ACCOUNT_ID;

    // 🔍 1. API 控制功能：如果請求有 action，進入控制流程
    if (url.searchParams.has("action")) {
      const action = url.searchParams.get("action");

      const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const options = {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
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
            result = await apiRequest(`/accounts/${accountId}/cfd_tunnel`);
            break;

          case 'listCertificates':
            result = await apiRequest(`/accounts/${accountId}/access/certificates`);
            break;

          case 'listAccessApps':
            result = await apiRequest(`/accounts/${accountId}/access/apps`);
            break;

          default:
            return new Response("Invalid action. Use ?action=verifyToken, listTunnels, listCertificates, listAccessApps", { status: 400 });
        }

        return new Response(JSON.stringify(result.data, null, 2), { status: result.status });
      } catch (error) {
        return new Response(`Error: ${error.toString()}`, { status: 500 });
      }
    }

    // 🚀 2. 反向代理功能：處理 HA / Media / NAS 流量轉發
    if (url.pathname.startsWith("/ha") || url.pathname.startsWith("/media") || url.pathname.startsWith("/nas")) {
      if (!token || !accountId) {
        return new Response("Missing environment variables for proxy. Please check CF_API_TOKEN and CF_ACCOUNT_ID.", { status: 500 });
      }

      // 設定不同服務的端口與目標
      if (url.pathname.startsWith("/ha")) {
        url.hostname = "mingleedan.org";
        url.port = "8123";
        url.pathname = url.pathname.replace("/ha", "");
      } else if (url.pathname.startsWith("/media")) {
        url.hostname = "mingleedan.org";
        url.port = "8096";
        url.pathname = url.pathname.replace("/media", "");
      } else if (url.pathname.startsWith("/nas")) {
        url.hostname = "mingleedan.org";
        url.port = "5000";
        url.pathname = url.pathname.replace("/nas", "");
      }

      const modifiedRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: 'follow'
      });

      let response;
      try {
        response = await fetch(modifiedRequest);
      } catch (error) {
        return new Response("Tunnel error: " + error.message, { status: 502 });
      }

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
        return new Response(null, { status: 204, headers:
