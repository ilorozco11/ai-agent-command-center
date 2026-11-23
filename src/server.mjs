import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, DemoError } from './store.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const BODY_LIMIT = 16 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function requestAuthority(request) {
  const host = request.headers.host;
  if (!host || !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/u.test(host)) {
    throw new DemoError('This prototype accepts localhost requests only.', 'INVALID_HOST', 403);
  }
  const address = new URL(`http://${host}`);
  const targetPort = Number(address.port || 80);
  const serverPort = request.socket.localPort;
  if (!LOOPBACK_HOSTS.has(address.hostname) || targetPort !== serverPort) {
    throw new DemoError('The request host does not match this local server.', 'INVALID_HOST', 403);
  }
  return address.origin;
}

function checkMutation(request, origin) {
  if (request.headers.origin && request.headers.origin !== origin) {
    throw new DemoError('Only requests from this demo page may change demo state.', 'INVALID_ORIGIN', 403);
  }
  if (request.headers['sec-fetch-site'] === 'cross-site') {
    throw new DemoError('Cross-site mutation requests are not accepted.', 'INVALID_ORIGIN', 403);
  }
  if (request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new DemoError('Send an application/json request body.', 'INVALID_CONTENT_TYPE', 415);
  }
}

function body(request) {
  return new Promise((resolveBody, rejectBody) => {
    let chunks = [];
    let bytes = 0;
    let settled = false;
    request.on('data', chunk => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > BODY_LIMIT) {
        settled = true;
        chunks = [];
        rejectBody(new DemoError('The request body must not exceed 16 KiB.', 'BODY_TOO_LARGE', 413));
        return;
      }
      chunks.push(chunk);
    });
    request.on('error', error => {
      if (!settled) { settled = true; rejectBody(error); }
    });
    request.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
        resolveBody(parsed);
      } catch {
        rejectBody(new DemoError('Send a valid JSON object.', 'INVALID_JSON', 400));
      }
    });
  });
}

function within(root, target) {
  const path = relative(root, target);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

async function staticFile(request, response, pathname, publicRoot) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch {
    throw new DemoError('The request path is not valid.', 'INVALID_PATH', 400);
  }
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(part => part.startsWith('.'))) {
    throw new DemoError('This file is not available.', 'FORBIDDEN_PATH', 403);
  }
  const target = resolve(publicRoot, `.${decoded === '/' ? '/index.html' : decoded}`);
  if (!within(publicRoot, target)) throw new DemoError('This file is not available.', 'FORBIDDEN_PATH', 403);
  try {
    const [canonicalRoot, canonicalTarget] = await Promise.all([realpath(publicRoot), realpath(target)]);
    if (!within(canonicalRoot, canonicalTarget)) throw new DemoError('This file is not available.', 'FORBIDDEN_PATH', 403);
    const fileStat = await stat(canonicalTarget);
    if (!fileStat.isFile()) throw new DemoError('The file was not found.', 'NOT_FOUND', 404);
    const bytes = await readFile(canonicalTarget);
    response.writeHead(200, {
      'Content-Type': MIME[extname(canonicalTarget).toLowerCase()] || 'application/octet-stream',
      'Content-Length': bytes.length,
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    if (error instanceof DemoError) throw error;
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) throw new DemoError('The file was not found.', 'NOT_FOUND', 404);
    throw error;
  }
}

/** Creates a localhost demo server. Call .listen yourself when embedding or testing. */
export function createServer({ store = createStore(), publicRoot = resolve(ROOT, 'public') } = {}) {
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const origin = requestAuthority(request);
      const url = new URL(request.url, origin);
      if (url.origin !== origin) throw new DemoError('The request URL must target this local server.', 'INVALID_HOST', 403);
      const pathname = url.pathname;
      if (request.method === 'GET' && pathname === '/health') {
        return json(response, 200, { status: 'ok', mode: 'demo' });
      }
      if (request.method === 'GET' && pathname === '/api/state') {
        return json(response, 200, store.snapshot());
      }
      if (request.method === 'POST' && pathname.startsWith('/api/')) {
        checkMutation(request, origin);
        const input = await body(request);
        if (pathname === '/api/tasks') return json(response, 201, store.createTask(input));
        if (pathname === '/api/reset') return json(response, 200, store.reset());
        const match = /^\/api\/sessions\/([a-zA-Z0-9-]+)\/(advance|approve|request-changes)$/u.exec(pathname);
        if (match) {
          const [, id, action] = match;
          const method = { advance: 'advance', approve: 'approve', 'request-changes': 'requestChanges' }[action];
          return json(response, 200, store[method](id));
        }
        throw new DemoError('The endpoint was not found.', 'NOT_FOUND', 404);
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD, POST');
        throw new DemoError('This method is not supported.', 'METHOD_NOT_ALLOWED', 405);
      }
      if (pathname.startsWith('/api/')) throw new DemoError('The endpoint was not found.', 'NOT_FOUND', 404);
      await staticFile(request, response, pathname, publicRoot);
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      if (error instanceof DemoError) return json(response, error.statusCode, { error: error.message, code: error.code });
      console.error('Demo request failed:', error.message);
      json(response, 500, { error: 'The local demo could not complete this request.', code: 'INTERNAL_ERROR' });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 1_000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3000);
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    console.error('HOST must be a loopback address. This unauthenticated prototype is for local use only.');
    process.exit(1);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer from 1 to 65535.');
    process.exit(1);
  }
  const server = createServer();
  server.on('error', error => { console.error(`Could not start demo: ${error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => {
    console.log(`AI Agent Command Center — DEMO ONLY\nOpen http://${host === '::1' ? '[::1]' : host}:${port}\nAll sessions, checks, and ACU figures are simulated. No API credentials are needed.`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => { process.exitCode = 0; }));
  }
}
