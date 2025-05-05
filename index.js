export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const action = url.searchParams.get("action");
      if (!action) {
        return new Response(
          "Please specify an action parameter. Example: /api/?action=listTunnels",
          { status: 400 }
        );
      }

      const apiRequest = async (endpoint, method = "GET", body = null) => {
        const options = {
          method,
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(
          `https://api.cloudflare.com/client/v4${endpoint}`,
          options
        );
        const data = await response.json();
        return { status: response.status, data };
      };

      try {
        let result;
        switch (action) {
          case "verifyToken":
            result = await apiRequest("/user/tokens/verify");
            break;
          case "listTunnels":
            result = await apiRequest(
              `/accounts/${env.CF_ACCOUNT_ID}/cfd_tunnel`
            );
            break;
          case "listCertificates":
            result = await apiRequest(
              `/accounts/${env.CF_ACCOUNT_ID}/access/certificates`
            );
            break;
          case "listAccessApps":
            result = await apiRequest(
              `/accounts/${env.CF_ACCOUNT_ID}/access/apps`
            );
            break;
          default:
            return new Response(
              "Invalid action. Use: verifyToken, listTunnels, listCertificates, listAccessApps",
              { status: 400 }
            );
        }

        return new Response(JSON.stringify(result.data, null, 2), {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(`API Error: ${error.message}`, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/ha")) {
      return proxyRequest(url, request, "mingleedan.org", "8123", "/ha");
    }

    if (url.pathname.startsWith("/media")) {
      return proxyRequest(url, request, "mingleedan.org", "8096", "/media");
    }

    if (url.pathname.startsWith("/nas")) {
      return new Response(
        "🚧 NAS service is not enabled. Please reinstall NAS and ensure the service is running.",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    return new Response("❌ 404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
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

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}
