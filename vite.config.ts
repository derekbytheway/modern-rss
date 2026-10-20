import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function localRssProxy(): Plugin {
  return {
    name: 'local-rss-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          const host = req.headers.host || 'localhost:5173';
          const incomingUrl = new URL(req.url || '', `http://${host}`);
          const targetUrl = incomingUrl.searchParams.get('url');

          console.log(`[RSS Proxy] Incoming request for: ${targetUrl}`);

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing "url" query parameter');
            return;
          }

          const upstreamRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
              'Accept': '*/*',
            },
          });

          console.log(`[RSS Proxy] Upstream status: ${upstreamRes.status}`);

          if (!upstreamRes.ok) {
            res.statusCode = upstreamRes.status;
            res.end(`Upstream server returned ${upstreamRes.status}`);
            return;
          }

          const text = await upstreamRes.text();
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.statusCode = 200;
          res.end(text);
        } catch (err: unknown) {
          console.error('[RSS Proxy Error]:', err);
          res.statusCode = 500;
          res.end(err instanceof Error ? err.message : 'Proxy fetch failed');
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    localRssProxy(),
  ],
})