export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const token = env.CF_API_TOKEN;
        const accountId = env.CF_ACCOUNT_ID;

        // 🔍 1. API 控制功能：如果請求有 action，進入控制流程
        if (url.searchParams.has("action")) {
            // ... (API control logic as before) ...
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
                 // Consider using the more specific error handling suggested previously
                let errorMessage = `API Error: ${error.toString()}`;
                if (error instanceof TypeError) {
                  errorMessage = `API Type Error: ${error.message}`;
                } // Add other checks if needed
                return new Response(errorMessage, { status: 500 });
            }
        } // End of API control block

        // 🚀 2. 反向代理功能：處理 HA / Media / NAS 流量轉發
        if (url.pathname.startsWith("/ha") || url.pathname.startsWith("/media") || url.pathname.startsWith("/nas")) {
            if (!token || !accountId) {
                return new Response("Missing environment variables for proxy. Please check CF_API_TOKEN and CF_ACCOUNT_ID.", { status: 500 });
            }

            // 設定不同服務的端口與目標
            const originalPathname = url.pathname; // Store original pathname
            if (originalPathname.startsWith("/ha")) {
                url.hostname = "mingleedan.org";
                url.port = "8123";
                url.pathname = originalPathname.replace("/ha", "");
            } else if (originalPathname.startsWith("/media")) {
                url.hostname = "mingleedan.org";
                url.port = "8096";
                url.pathname = originalPathname.replace("/media", "");
            } else if (originalPathname.startsWith("/nas")) {
                url.hostname = "mingleedan.org";
                url.port = "5000";
                url.pathname = originalPathname.replace("/nas", "");
            }
            // Ensure pathname starts with '/' if not empty after replacement
             if (url.pathname === "") {
                url.pathname = "/";
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

            // Clone headers to make them mutable
            const newHeaders = new Headers(response.headers);
            // Set security and CORS headers
            newHeaders.set("X-Frame-Options", "DENY");
            newHeaders.set("X-Content-Type-Options", "nosniff");
            newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
            newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
            newHeaders.set("Permissions-Policy", "accelerometer=(), camera=(), microphone=()");
            // Adjust CORS headers as needed for your specific frontend origin(s)
            newHeaders.set("Access-Control-Allow-Origin", "*"); // Be more specific if possible, e.g., "https://your-frontend.com"
            newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Add any other headers your frontend sends

            // Handle OPTIONS preflight requests for CORS
            if (request.method === "OPTIONS") {
                // Return 204 No Content with the CORS and security headers
                return new Response(null, {
                    status: 204,
                    headers: newHeaders // <-- *** FIX 1: Use the headers object ***
                }); // <-- *** FIX 2: Close the Response constructor ***
            } // <-- *** FIX 3: Close the if block ***

            // For other methods (GET, POST, etc.), return the actual response from the proxied service
            // with the modified headers
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders // Use the modified headers
            });

        } // End of reverse proxy block

        // 🚪 3. Default response if no action and no matching proxy path
        return new Response("Not Found. Use ?action=... or access /ha, /media, /nas paths.", { status: 404 });

    } // <-- *** FIX 4: Close the async fetch function ***
}; // <-- *** FIX 5: Close the export default object ***
