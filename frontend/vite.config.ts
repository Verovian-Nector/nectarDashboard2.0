import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    // Allow serving on any subdomain
    strictPort: false,
    // Configure for subdomain access
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    // Proxy API calls to the appropriate backend
    proxy: {
      '/api': {
        target: 'http://localhost:8002', // Child backend for tenant-specific data
        changeOrigin: true,
        secure: false,
        // Pass subdomain as query parameter for tenant context
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Extract subdomain from referer header or query params
            const referer = req.headers.referer;
            let subdomain = 'localhost';
            
            if (referer) {
              const url = new URL(referer);
              subdomain = url.searchParams.get('subdomain') || 'localhost';
            }
            
            // Add subdomain to the query string
            const separator = proxyReq.path.includes('?') ? '&' : '?';
            proxyReq.path = `${proxyReq.path}${separator}subdomain=${subdomain}`;
          });
        }
      }
    }
  },
  // Ensure the app can handle dynamic subdomains
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  // Configure for wildcard subdomain handling
  base: '/',
})
