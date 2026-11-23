import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from '../src/server.mjs';
import { createStore } from '../src/store.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'agent-command-center-test-'));
  const publicRoot = join(directory, 'public');
  await mkdir(publicRoot);
  await writeFile(join(publicRoot, 'index.html'), '<!doctype html><title>Demo fixture</title>');
  await writeFile(join(publicRoot, 'styles.css'), 'body { color: #111; }');
  await writeFile(join(directory, 'private.txt'), 'private fixture');
  await symlink(join(directory, 'private.txt'), join(publicRoot, 'escape.txt'));
  const server = createServer({ publicRoot, store: createStore() });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const post = (path, input = {}, extraHeaders = {}) => fetch(`${origin}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...extraHeaders }, body: JSON.stringify(input),
  });
  return { origin, port, post };
}

function rawGet(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path, headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    request.on('error', reject);
  });
}

test('health and state endpoints disclose simulation mode without credentials', async t => {
  const { origin } = await fixture(t);
  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', mode: 'demo' });
  const response = await fetch(`${origin}/api/state`);
  const state = await response.json();
  assert.equal(state.mode, 'demo');
  assert.equal(state.sessions.length, 5);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('the served dashboard assets have suitable content types and HEAD behavior', async t => {
  const { origin } = await fixture(t);
  const html = await fetch(origin);
  assert.match(html.headers.get('content-type'), /^text\/html/u);
  assert.match(await html.text(), /Demo fixture/u);
  assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/u);
  const css = await fetch(`${origin}/styles.css`);
  assert.match(css.headers.get('content-type'), /^text\/css/u);
  const head = await fetch(origin, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('HTTP task and approval routes perform the human-gated demo lifecycle', async t => {
  const { post, origin } = await fixture(t);
  const created = await post('/api/tasks', { title: 'Verify an example form', repository: 'demo/app' });
  assert.equal(created.status, 201);
  const { session } = await created.json();
  const early = await post(`/api/sessions/${session.id}/approve`);
  assert.equal(early.status, 409);
  for (let step = 0; step < 4; step++) {
    const advanced = await post(`/api/sessions/${session.id}/advance`);
    assert.equal(advanced.status, 200);
  }
  const approved = await post(`/api/sessions/${session.id}/approve`);
  const completed = (await approved.json()).session;
  assert.equal(completed.status, 'completed');
  assert.equal(completed.prUrl, null);
  const state = await (await fetch(`${origin}/api/state`)).json();
  assert.equal(state.sessions.length, 6);
  const reset = await post('/api/reset');
  assert.equal((await reset.json()).state.sessions.length, 5);
});

test('cross-origin and cross-site mutations are rejected without changing state', async t => {
  const { post, origin } = await fixture(t);
  const hostile = await post('/api/reset', {}, { Origin: 'https://unrelated.example' });
  assert.equal(hostile.status, 403);
  assert.equal((await hostile.json()).code, 'INVALID_ORIGIN');
  const crossSite = await post('/api/tasks', { title: 'Cross-site task', repository: 'demo/app' }, { 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(crossSite.status, 403);
  const state = await (await fetch(`${origin}/api/state`)).json();
  assert.equal(state.sessions.length, 5);
});

test('unexpected Host headers are rejected to reduce DNS rebinding exposure', async t => {
  const { port } = await fixture(t);
  const hostileHost = await rawGet(port, '/api/state', { Host: `unrelated.example:${port}` });
  assert.equal(hostileHost.status, 403);
  assert.equal(JSON.parse(hostileHost.body).code, 'INVALID_HOST');
  const wrongPort = await rawGet(port, '/api/state', { Host: 'localhost:1' });
  assert.equal(wrongPort.status, 403);
  const absoluteOtherOrigin = await rawGet(port, 'http://unrelated.example/api/state');
  assert.equal(absoluteOtherOrigin.status, 403);
});

test('mutations require a bounded valid JSON object', async t => {
  const { origin, post } = await fixture(t);
  const text = await fetch(`${origin}/api/reset`, { method: 'POST', body: '{}' });
  assert.equal(text.status, 415);
  for (const input of ['{', 'null', '[]']) {
    const response = await fetch(`${origin}/api/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: input });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_JSON');
  }
  const oversized = await post('/api/tasks', { title: 'x'.repeat(17 * 1024), repository: 'demo/app' });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).code, 'BODY_TOO_LARGE');
  const invalid = await post('/api/tasks', { title: 'x', repository: 'demo/app' });
  assert.equal(invalid.status, 400);
});

test('encoded traversal, dotfiles, and symlinks cannot expose files outside public', async t => {
  const { port, origin } = await fixture(t);
  for (const path of ['/..%2fprivate.txt', '/%2e%2e%2fprivate.txt', '/.env', '/%00.txt', '/%5c..%5cprivate.txt']) {
    const response = await rawGet(port, path);
    assert.equal(response.status, 403, path);
    assert.doesNotMatch(response.body, /private fixture/u);
  }
  const symlinkResponse = await fetch(`${origin}/escape.txt`);
  assert.equal(symlinkResponse.status, 403);
  const missing = await fetch(`${origin}/src/store.mjs`);
  assert.equal(missing.status, 404);
});

test('unknown routes, session IDs, and unsupported methods return explicit errors', async t => {
  const { post, origin } = await fixture(t);
  assert.equal((await fetch(`${origin}/api/unknown`)).status, 404);
  assert.equal((await post('/api/unknown')).status, 404);
  assert.equal((await post('/api/sessions/UNKNOWN/advance')).status, 404);
  const response = await fetch(`${origin}/api/state`, { method: 'DELETE' });
  assert.equal(response.status, 405);
  assert.equal((await response.json()).code, 'METHOD_NOT_ALLOWED');
});
