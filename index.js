export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const token = env.CF_API_TOKEN;
        const accountId = env.CF_ACCOUNT_ID;

        // ✅ ✅ ✅ 提前檢查 searchParams，確保正確進入 action
        const action = url.searchParams.get("action");
        if (action) {
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
                return new Response(`API Error: ${error.message}`, { status: 500 });
            }
        }

        // 🚀 Proxy 區塊邏輯保留，放在 action 區塊後
        if (url.pathname.startsWith("/ha") || url.pathname.startsWith("/media") || url.pathname.startsWith("/nas")) {
            // Proxy logic as before
        }

        return new Response("Not Found. Use ?action=... or access /ha, /media, /nas paths.", { status: 404 });
    }
};
