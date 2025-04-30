/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Export the main fetch handler and the scheduled handler
export default {
  /**
   * Handles incoming HTTP requests.
   * Routes requests based on the hostname to different backend services,
   * primarily forwarding to Cloudflare Tunnels or local IPs.
   * @param {Request} request - The incoming request object.
   * @param {Env} env - Environment variables and secrets.
   * @param {ExecutionContext} ctx - Execution context.
   * @returns {Promise<Response>} - The response to send back to the client.
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    console.log(`Received request for: ${hostname}${url.pathname}`);

    // --- Hostname Routing ---

    // Route requests for home.mingleedan.org to the Home Assistant Tunnel
    if (hostname === 'home.mingleedan.org') {
      // Get the Tunnel URL from the environment variable/secret
      // IMPORTANT: You MUST set TUNNEL_HOME_URL as a variable or secret in your Worker settings!
      // It should be the public .cfargotunnel.com address for your Home Assistant tunnel.
      const tunnelUrl = env.TUNNEL_HOME_URL;

      if (!tunnelUrl) {
        console.error('Error: TUNNEL_HOME_URL environment variable is not set.');
        return new Response('Backend tunnel URL not configured for home.mingleedan.org', { status: 503 });
      }

      // Construct the target URL (Tunnel URL + original path and query)
      const targetUrl = tunnelUrl + url.pathname + url.search;
      console.log(`Forwarding request for ${hostname} to Home Assistant Tunnel: ${targetUrl}`);

      try {
        // Forward the original request to the Tunnel
        // Cloudflare handles the internal routing to your cloudflared instance
        return await fetch(targetUrl, request);
      } catch (error) {
        console.error(`Error forwarding request to Home Assistant tunnel: ${error}`);
        return new Response('Failed to connect to Home Assistant service', { status: 502 });
      }
    }

    // Route requests for nas.mingleedan.org to the OMV local service (via Tunnel)
    else if (hostname === 'nas.mingleedan.org') {
      // IMPORTANT: Replace with your OMV's actual local IP and port!
      // This assumes your cloudflared tunnel can reach this local address.
      const omvLocalUrl = 'http://192.168.31.173:80'; // Example: Use HTTP for OMV Web UI on port 80

      // Construct the target URL (OMV Local URL + original path and query)
      const targetUrl = omvLocalUrl + url.pathname + url.search;
      console.log(`Forwarding request for ${hostname} to OMV: ${targetUrl}`);

      try {
        // Forward the original request directly to the local service URL.
        // Cloudflare Tunnel needs a Public Hostname rule pointing to this service
        // OR this Worker needs to route through another tunnel CNAME.
        // For simplicity assuming a direct fetch via tunnel public hostname is setup elsewhere
        // or the worker itself routes through a tunnel CNAME defined in env vars.
        // If OMV is HTTPS locally AND uses a self-signed cert, fetch might need { cf: { resolveOverride: '...', tlsVerify: false } }
        // However, the simplest setup is often HTTP locally.
        return await fetch(targetUrl, request);
      } catch (error) {
        console.error(`Error forwarding request to OMV via tunnel: ${error}`);
        return new Response('Failed to connect to NAS service', { status: 502 });
      }
    }

    // Route requests for admin.mingleedan.org (placeholder)
    else if (hostname === 'admin.mingleedan.org') {
      // Add logic here to handle requests for the admin interface
      // e.g., forward to another service/tunnel or return an admin page
      console.log(`Handling request for ${hostname}`);
      return new Response('Admin route - Not implemented yet', { status: 501 });
    }

    // Route requests for api.mingleedan.org (placeholder)
     else if (hostname === 'api.mingleedan.org') {
       // Add logic here to handle API requests
       // e.g., forward to a backend API service or handle directly
       console.log(`Handling request for ${hostname}`);
       return new Response(JSON.stringify({ message: "API Endpoint hit!", path: url.pathname }), {
         status: 200,
         headers: { "Content-Type": "application/json" },
       });
     }

    // Route requests for webhook.mingleedan.org (placeholder)
     else if (hostname === 'webhook.mingleedan.org') {
       // Add logic here to handle webhook requests
       console.log(`Handling request for ${hostname}`);
       return new Response('Webhook received', { status: 200 });
     }

    // Route requests for skyroute-enterprise.mingleedan.org (or the worker's .workers.dev URL)
    else if (hostname === 'skyroute-enterprise.mingleedan.org' || hostname.endsWith('.workers.dev')) {
        // Handle specific paths for the worker itself
        if (url.pathname === "/") {
          return new Response("✅ Cloudflare Worker 'skyroute-enterprise' is running!", {
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
          // Often requested by browsers, return empty response
          return new Response("", { status: 204 });
        }

        // Fallback for other paths on the worker's domain
         return new Response('Worker endpoint not found', { status: 404 });
    }


    // --- Fallback ---
    // If the hostname doesn't match any of the above specific routes
    else {
      console.log(`No specific route found for hostname: ${hostname}. Returning 404.`);
      return new Response('Not Found - Hostname not configured in Worker', { status: 404 });
    }
  },

  /**
   * Handles scheduled events (Cron Triggers).
   * @param {ScheduledEvent} event - The scheduled event object.
   * @param {Env} env - Environment variables and secrets.
   * @param {ExecutionContext} ctx - Execution context.
   */
  async scheduled(event, env, ctx) {
    // This function is triggered by the Cron setting in wrangler.toml ("*/30 * * * *")
    console.log(`⏰ Cron job triggered at: ${new Date(event.scheduledTime).toISOString()}`);
    console.log(`Cron details: ${event.cron}`);

    // Add your scheduled tasks here, for example:
    // - Call an API endpoint
    // - Perform cleanup tasks
    // - Send status reports

    // Example: Log the trigger time
    // await env.YOUR_KV_NAMESPACE.put(`last_cron_run:${event.cron}`, new Date(event.scheduledTime).toISOString());

    console.log("Cron job finished.");
    // Note: Scheduled events don't return a Response object in the same way fetch events do.
    // Use ctx.waitUntil() for async tasks that need to complete after the handler returns.
    // ctx.waitUntil(someAsyncTask());
  },
};

// --- Removed invalid code ---
// - Removed duplicate/misplaced fetch handler logic
// - Removed YAML code (jobs: deploy: ...)
// - Removed unused example() function
