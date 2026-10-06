import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'google-maps-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/geocode')) {
              try {
                const url = new URL(req.url, 'http://localhost:3000');
                const address = url.searchParams.get('address');
                const lat = url.searchParams.get('lat');
                const lng = url.searchParams.get('lng');
                const apiKey =
                  process.env.VITE_GOOGLE_MAPS_API_KEY ||
                  'AIzaSyDNs6astjWNHiw7vOHVuDtlXhH5jAVhfkA';

                let targetUrl = '';
                if (lat && lng) {
                  targetUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
                } else if (address) {
                  targetUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                    address
                  )}&key=${apiKey}`;
                }

                if (!targetUrl) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing address or lat/lng' }));
                  return;
                }

                const response = await fetch(targetUrl);
                const data = await response.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return;
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: String(err) }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
