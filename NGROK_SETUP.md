# Ngrok Setup - Single External Endpoint for Multiple Services

This guide explains how to serve both the frontend (port 4444) and the MCP server (port 8000) through a single ngrok endpoint.

## Architecture

```
External URL: https://veritably-nonliquefiable-galina.ngrok-free.dev
        ↓
    Ngrok Tunnel
        ↓
Local Proxy: http://localhost:3000
        ↓
        ├─── /asset/*  → http://localhost:4444 (Frontend Assets, prefix stripped)
        └─── /*        → http://localhost:8000 (Node.js MCP Server)
```

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

This will install the `http-proxy` package needed for the proxy server.

### 2. Start Your Services

You'll need **3 terminal windows**:

#### Terminal 1: Frontend Assets Server
```bash
pnpm run serve
```
This serves the built frontend on `http://localhost:4444`

#### Terminal 2: Node.js MCP Server
```bash
cd pizzaz_server_node
pnpm install  # First time only
pnpm start
```
This runs the Node.js MCP server on `http://localhost:8000`

**Alternative: Python MCP Server**
```bash
cd pizzaz_server_python
pip install -r requirements.txt  # First time only
python main.py
```

#### Terminal 3: Reverse Proxy
```bash
pnpm run proxy
```
This runs the reverse proxy on `http://localhost:3000`

### 3. Start Ngrok Tunnel

In a **4th terminal**:

```bash
ngrok http 3000 --domain=veritably-nonliquefiable-galina.ngrok-free.dev
```

## Features

- ✅ Routes `/asset/*` requests to frontend assets server (prefix stripped)
- ✅ Routes all other requests to MCP server
- ✅ Full CORS support

## Testing

Once all services are running:

- **Frontend Assets**: `https://veritably-nonliquefiable-galina.ngrok-free.dev/asset/*`
- **MCP Server**: `https://veritably-nonliquefiable-galina.ngrok-free.dev/*` (all other routes)

### Test Commands

**Important:** To bypass the ngrok browser warning, add the header `-H "ngrok-skip-browser-warning: true"` to your requests:

```bash
# Test frontend assets
curl -H "ngrok-skip-browser-warning: true" \
  https://veritably-nonliquefiable-galina.ngrok-free.dev/asset/

# Test a specific asset
curl -H "ngrok-skip-browser-warning: true" \
  https://veritably-nonliquefiable-galina.ngrok-free.dev/asset/pizzaz-2d2b.html

# Test MCP server SSE endpoint
curl -H "ngrok-skip-browser-warning: true" \
  https://veritably-nonliquefiable-galina.ngrok-free.dev/mcp

# Test MCP messages endpoint
curl -X POST \
  -H "ngrok-skip-browser-warning: true" \
  -H "Content-Type: application/json" \
  https://veritably-nonliquefiable-galina.ngrok-free.dev/mcp/messages?sessionId=test
```

## Customizing Routes

Edit `proxy-server.mjs` to change routing rules:

```javascript
// Example: Add more route patterns (check most specific first)
if (url.startsWith('/asset')) {
  // Strip /asset prefix before forwarding
  req.url = url.replace(/^\/asset/, '') || '/';
  proxy.web(req, res, { target: 'http://localhost:4444' });
}
else if (url.startsWith('/api')) {
  // Route to another service
  proxy.web(req, res, { target: 'http://localhost:5000' });
}
else {
  // Everything else goes to MCP server
  proxy.web(req, res, { target: 'http://localhost:8000' });
}
```

## Alternative Approaches

### Option 2: Nginx Reverse Proxy

If you prefer nginx, create an `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 3000;

        location /mcp {
            proxy_pass http://localhost:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }

        location / {
            proxy_pass http://localhost:4444;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

Then run: `nginx -c $(pwd)/nginx.conf`

### Option 3: Ngrok Traffic Policies (Paid Feature)

With an ngrok paid plan, you can use traffic policies for path-based routing without a local proxy:

```yaml
# traffic-policy.yml
on_http_request:
  - expressions:
      - "req.url.path.startsWith('/mcp')"
    actions:
      - type: "forward-internal"
        config:
          url: "http://localhost:8000"
  - actions:
      - type: "forward-internal"
        config:
          url: "http://localhost:4444"
```

Then: `ngrok http --domain=your-domain.ngrok.app --traffic-policy-file=traffic-policy.yml`

### Option 4: Wildcard Subdomains (Paid Feature)

Use subdomains instead of paths:
- `mcp.veritably-nonliquefiable-galina.ngrok-free.dev` → port 8000
- `assets.veritably-nonliquefiable-galina.ngrok-free.dev` → port 4444

## Bypassing Ngrok Browser Warning

Ngrok shows a browser warning page on the free plan. Here are ways to bypass it:

### Method 1: Add Header to Requests (Recommended for APIs)

Send the `ngrok-skip-browser-warning` header with any value:

```bash
# Using curl
curl -H "ngrok-skip-browser-warning: true" https://your-domain.ngrok-free.dev/

# Using fetch in JavaScript
fetch('https://your-domain.ngrok-free.dev/', {
  headers: { 'ngrok-skip-browser-warning': 'true' }
})

# Using axios
axios.get('https://your-domain.ngrok-free.dev/', {
  headers: { 'ngrok-skip-browser-warning': 'true' }
})
```

### Method 2: Configure Ngrok (Recommended for Browser Access)

Add to your ngrok config file (`~/.ngrok2/ngrok.yml`):

```yaml
tunnels:
  myapp:
    proto: http
    addr: 3000
    domain: veritably-nonliquefiable-galina.ngrok-free.dev
    inspect: false
```

Then start with: `ngrok start myapp`

### Method 3: Use Helper HTML Page (Easiest for Testing)

Open `ngrok-bypass.html` in your browser to test endpoints with proper headers:

```bash
# Serve the helper page
open ngrok-bypass.html
# or
python3 -m http.server 8080
# Then open http://localhost:8080/ngrok-bypass.html
```

The page includes test buttons that automatically add the bypass header.

### Method 4: Browser Extension (Best for Regular Use)

Install a browser extension to automatically add custom headers:
- **Chrome/Edge:** [ModHeader](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj)
- **Firefox:** [ModHeader](https://addons.mozilla.org/en-US/firefox/addon/modheader-firefox/)

Add this header in the extension:
- **Name:** `ngrok-skip-browser-warning`
- **Value:** `true`

### Method 5: Custom User-Agent

Use a User-Agent switcher extension and set it to any non-browser value:
```
MyApp/1.0.0
```

### Method 6: Upgrade to Ngrok Paid Plan

Paid plans can disable the interstitial warning completely.

## Troubleshooting

### Port Already in Use

If port 3000 is in use, edit `proxy-server.mjs` and change the `PORT` constant.

### CORS Issues

The proxy automatically forwards CORS headers, but if you encounter issues, check:
1. The MCP server has CORS middleware enabled (both Node.js and Python servers have this by default)
2. The frontend server is running with `--cors` flag (already set in npm script)

### Connection Refused

Make sure all services are running:
```bash
# Check what's running on each port
lsof -i :3000  # Proxy
lsof -i :4444  # Frontend
lsof -i :8000  # MCP Server
```

### SSE Connection Issues

The Node.js MCP server uses Server-Sent Events (SSE). Make sure:
1. Your proxy supports long-lived connections (the provided proxy-server.mjs does)
2. Ngrok is properly forwarding SSE events (it does by default)
