import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy configuration
const proxyOptions = {
  target: 'https://productmgmtaemaebeta.my.workfront.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/attask/api/v15.0'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add API key to all requests
    const url = new URL(proxyReq.path, 'https://productmgmtaemaebeta.my.workfront.com');
    url.searchParams.set('apiKey', 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0');
    proxyReq.path = url.pathname + url.search;
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to the response
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
  }
};

// Apply proxy middleware
app.use('/api', createProxyMiddleware(proxyOptions));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
}); 