export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 根據路徑轉發不同服務
    if (url.pathname.startsWith("/ha")) {
      url.hostname = "mingleedan.org";
      url.port = "8123"; // Home Assistant 預設
      url.pathname = url.pathname.replace("/ha", "");
    } else if (url.pathname.startsWith("/media")) {
      url.hostname = "mingleedan.org";
      url.port = "8096"; // 媒體伺服器（假設 Jellyfin）
      url.pathname = url.pathname.replace("/media", "");
    } else if (url.pathname.startsWith("/nas")) {
      url.hostname = "mingleedan.org";
      url.port = "5000"; // NAS 服務（假設 OpenMediaVault）
      url.pathname = url.pathname.replace("/nas", "");
    } else {
      return new Response("Service not found", { status: 404 });
    }

    // 重建請求
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
      return new Response(null, { status: 204, headers: newHeaders });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};
