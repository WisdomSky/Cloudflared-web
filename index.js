export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🎯 Specific non-proxy paths first
    if (url.pathname === "/") { /* ... root response ... */ }
    if (url.pathname === "/healthcheck") { /* ... healthcheck response ... */ }
    if (url.pathname === "/favicon.ico") { /* ... favicon response ... */ }
    if (url.pathname.startsWith("/api/")) { /* ... API handler ... */ }
    // Maybe keep /media and /nas if still relevant? Or remove them? Assume remove for now.
    // if (url.pathname.startsWith("/media")) { /* ... media proxy ... */ }
    // if (url.pathname.startsWith("/nas")) { /* ... nas placeholder ... */ }


    // 🎯 Default Action: Proxy ALL other requests to Home Assistant
    // Assuming the target is mingleedan.org:8123
    // basePath should likely be "/" or "" if we want ha.mingleedan.org/xyz -> mingleedan.org:8123/xyz
    const targetHost = "mingleedan.org"; // Or internal IP if tunnel setup changes? Needs confirmation.
    const targetPort = "8123";
    const basePath = "/"; // Remove nothing from the path

    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHost;
    targetUrl.port = targetPort;
    // No base path replacement needed if basePath is "/"
    // targetUrl.pathname = targetUrl.pathname.replace(basePath, "") || "/"; // Keep original path

    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "follow",
    });

    try {
      const response = await fetch(modifiedRequest);
      // ... (rest of proxyRequest logic for headers, CORS etc.) ...
      const newHeaders = new Headers(response.headers);
      // Add/Set security/CORS headers
      newHeaders.set("X-Frame-Options", "DENY"); // Example, keep relevant ones
      // ... other headers ...
      newHeaders.set("Access-Control-Allow-Origin", "*"); // Keep CORS if needed
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
  },
};

// Remove the separate proxyRequest function if logic is inlined, or keep it if preferred.
// If keeping it, call it like:
// return proxyRequest(url, request, targetHost, targetPort, basePath);
