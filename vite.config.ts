import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import http from 'node:http';
import https from 'node:https';

/**
 * Dev-only proxy: GET /__gateway?url=<gateway URL> forwards the request (with its
 * Authorization header) to the gateway, so the browser isn't blocked by CORS.
 * Mirrors the working curl call: `curl -k`, the FastEasy User-Agent, GET with --data '{}'.
 * GATEWAY_USER_AGENT overrides the User-Agent; GATEWAY_STRICT_TLS=1 turns certificate checks back on.
 */
const DEFAULT_UA = 'Android/15.1.0;FastEasy/3.99.0/10999';
function gatewayProxy(): Plugin {
  return {
    name: 'gateway-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__gateway', (req, res) => {
        const target = new URL(req.url ?? '/', 'http://local').searchParams.get('url') ?? '';
        let u: URL;
        try { u = new URL(target); } catch { res.statusCode = 400; res.end('Missing or invalid url'); return; }
        if (req.method !== 'GET' || !/^https?:$/.test(u.protocol)) { res.statusCode = 400; res.end('Only GET to http(s) URLs'); return; }
        const headers: Record<string, string> = {};
        for (const h of ['authorization', 'content-type', 'accept'] as const) {
          const v = req.headers[h];
          if (typeof v === 'string') headers[h] = v;
        }
        // Same as the working curl call: GET with --data '{}'
        const body = headers['content-type']?.includes('json') ? '{}' : '';
        if (body) headers['content-length'] = String(Buffer.byteLength(body));
        headers['user-agent'] = process.env.GATEWAY_USER_AGENT || DEFAULT_UA;
        const opts = { method: 'GET', headers, rejectUnauthorized: process.env.GATEWAY_STRICT_TLS === '1' };
        const up = (u.protocol === 'https:' ? https : http).request(u, opts, (r) => {
          res.statusCode = r.statusCode ?? 502;
          if (r.headers['content-type']) res.setHeader('content-type', r.headers['content-type']);
          r.pipe(res);
        });
        up.on('error', (e) => {
          res.statusCode = 502;
          res.end(`Request to the gateway failed: ${e.message}`);
        });
        up.end(body);
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), viteSingleFile(), gatewayProxy()],
  worker: { format: 'iife' },
  test: { environment: 'node' },
} as any);
