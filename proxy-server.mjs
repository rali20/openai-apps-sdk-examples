#!/usr/bin/env node
/**
 * Simple reverse proxy to combine multiple local services into one endpoint
 * Routes:
 * - /asset/* → http://localhost:4444 (Frontend assets, prefix stripped)
 * - /* → http://localhost:8000 (Node.js or Python MCP server)
 * 
 * Note: To bypass ngrok browser warning, clients should send:
 * Header: ngrok-skip-browser-warning: true
 */

import http from 'http';
import httpProxy from 'http-proxy';

const PORT = 3000; // Proxy server port (point ngrok to this)
const FRONTEND_PORT = 4444;
const MCP_SERVER_PORT = 8000;

const proxy = httpProxy.createProxyServer({});

// Error handling
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  
  console.log(`${req.method} ${url}`);

  // Route asset requests (anything starting with /asset)
  if (url.startsWith('/asset')) {
    console.log(`  → Routing to assets (localhost:${FRONTEND_PORT})`);
    // Strip /asset prefix before forwarding
    const rewrittenUrl = url.replace(/^\/asset/, '');
    req.url = rewrittenUrl || '/';
    proxy.web(req, res, {
      target: `http://localhost:${FRONTEND_PORT}`,
      changeOrigin: true,
    });
  }
  // Everything else goes to MCP server
  else {
    console.log(`  → Routing to MCP server (localhost:${MCP_SERVER_PORT})`);
    proxy.web(req, res, {
      target: `http://localhost:${MCP_SERVER_PORT}`,
      changeOrigin: true,
    });
  }
});

server.listen(PORT, () => {
  console.log(`\n🔄 Reverse Proxy Server running on http://localhost:${PORT}`);
  console.log(`\nRouting rules:`);
  console.log(`  /asset/*  → http://localhost:${FRONTEND_PORT} (Frontend Assets, prefix stripped)`);
  console.log(`  /*        → http://localhost:${MCP_SERVER_PORT} (MCP Server)`);
  console.log(`\nPoint ngrok to this proxy:\n  ngrok http ${PORT} --domain=veritably-nonliquefiable-galina.ngrok-free.dev\n`);
});

