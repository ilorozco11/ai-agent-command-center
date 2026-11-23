import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, DemoError } from '../src/store.mjs';

function emptyStore() {
  let sequence = 1;
  return createStore({ seed: false, clock: () => '2026-01-01T10:00:00.000Z', idFactory: () => `TEST-${sequence++}` });
}

function task(store, title = 'Add keyboard navigation') {
  return store.createTask({ title, repository: 'demo/example-app' }).session.id;
}

function reachReview(store, id) {
  store.advance(id);
  store.advance(id);
  store.advance(id);
  return store.advance(id).session;
}

test('seed data is explicitly simulated and never contains live pull-request links', () => {
  const state = createStore().snapshot();
  assert.equal(state.mode, 'demo');
  assert.deepEqual(state.settings, { sessionBudgetAcu: 5, maxConcurrent: 2 });
  assert.deepEqual(new Set(state.sessions.map(session => session.status)), new Set(['running', 'queued', 'awaiting_approval', 'completed', 'blocked']));
  assert.ok(state.sessions.every(session => session.repository === 'demo/example-app' && session.prUrl === null));
});

test('a task cannot complete until checks pass and a human approves', () => {
  const store = emptyStore();
  const id = task(store);
  assert.throws(() => store.approve(id), { code: 'INVALID_TRANSITION', statusCode: 409 });
  assert.equal(store.snapshot().sessions[0].status, 'queued');
  const review = reachReview(store, id);
  assert.equal(review.status, 'awaiting_approval');
  assert.equal(review.approval.status, 'pending');
  assert.equal(review.acuUsed, 3);
  assert.deepEqual(review.checks.map(check => check.status), ['passed', 'passed', 'pending']);
  assert.throws(() => store.advance(id), { code: 'INVALID_TRANSITION' });
  const completed = store.approve(id).session;
  assert.equal(completed.status, 'completed');
  assert.equal(completed.approval.status, 'approved');
  assert.ok(completed.checks.every(check => check.status === 'passed'));
  assert.equal(completed.prUrl, null);
  assert.match(completed.events.at(-1).message, /No real pull request was merged/u);
  assert.throws(() => store.approve(id), { code: 'INVALID_TRANSITION' });
});

test('requesting changes queues rework and preserves its existing budget usage', () => {
  const store = emptyStore();
  const id = task(store);
  reachReview(store, id);
  const rework = store.requestChanges(id).session;
  assert.equal(rework.status, 'queued');
  assert.equal(rework.progress, 40);
  assert.equal(rework.approval.status, 'changes_requested');
  assert.equal(rework.acuUsed, 3);
  assert.deepEqual(rework.checks.map(check => check.status), ['passed', 'pending', 'pending']);
  store.advance(id);
  store.advance(id);
  const ready = store.advance(id).session;
  assert.equal(ready.status, 'awaiting_approval');
  assert.equal(ready.acuUsed, 5);
  assert.equal(store.approve(id).session.status, 'completed');
});

test('the illustrative credit limit blocks more work without overspending', () => {
  const store = emptyStore();
  const id = task(store);
  reachReview(store, id);
  store.requestChanges(id);
  store.advance(id);
  store.advance(id);
  store.advance(id);
  store.requestChanges(id);
  const blocked = store.advance(id).session;
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.acuUsed, 5);
  assert.equal(blocked.progress, 40);
  assert.equal(blocked.events.at(-1).type, 'budget_blocked');
  assert.throws(() => store.advance(id), { code: 'INVALID_TRANSITION' });
  assert.throws(() => store.approve(id), { code: 'INVALID_TRANSITION' });
});

test('only two sessions execute concurrently; waiting for review frees a slot', () => {
  const store = emptyStore();
  const first = task(store, 'First example task');
  const second = task(store, 'Second example task');
  const third = task(store, 'Third example task');
  store.advance(first);
  store.advance(second);
  assert.throws(() => store.advance(third), { code: 'CONCURRENCY_LIMIT', statusCode: 409 });
  assert.equal(store.snapshot().sessions.find(session => session.id === third).status, 'queued');
  store.advance(first);
  store.advance(first);
  store.advance(first);
  assert.equal(store.advance(third).session.status, 'running');
  assert.equal(store.snapshot().sessions.filter(session => session.status === 'running').length, 2);
});

test('invalid task input does not create a session', () => {
  const store = emptyStore();
  for (const invalid of [
    null, [], {}, { title: 'Hi', repository: 'demo/app' },
    { title: 'x'.repeat(161), repository: 'demo/app' },
    { title: 'Bad\nTitle', repository: 'demo/app' },
    { title: 'Valid title', repository: 'https://github.com/demo/app' },
    { title: 'Valid title', repository: '../.env' },
    { title: 'Valid title', repository: 'demo/app/another' },
    { title: 'Valid title', repository: { owner: 'demo', name: 'app' } },
  ]) assert.throws(() => store.createTask(invalid), DemoError);
  assert.equal(store.snapshot().sessions.length, 0);
  const session = store.createTask({ title: '  Add useful validation  ', repository: ' demo/example-app ' }).session;
  assert.equal(session.title, 'Add useful validation');
  assert.equal(session.repository, 'demo/example-app');
});

test('unknown session IDs fail consistently across commands', () => {
  const store = emptyStore();
  for (const operation of ['advance', 'approve', 'requestChanges']) {
    assert.throws(() => store[operation]('MISSING'), { code: 'NOT_FOUND', statusCode: 404 });
  }
});

test('snapshot and mutation results do not expose mutable internal state', () => {
  const store = emptyStore();
  const created = store.createTask({ title: 'Protect state snapshots', repository: 'demo/app' });
  created.state.settings.maxConcurrent = 100;
  created.state.sessions[0].status = 'completed';
  created.session.acuUsed = 999;
  const state = store.snapshot();
  state.sessions[0].events.length = 0;
  assert.equal(store.snapshot().settings.maxConcurrent, 2);
  assert.equal(store.snapshot().sessions[0].status, 'queued');
  assert.equal(store.snapshot().sessions[0].acuUsed, 0);
  assert.equal(store.snapshot().sessions[0].events.length, 1);
});

test('the demo has a bounded session count and reset restores its examples', () => {
  const store = createStore();
  const initial = store.snapshot().sessions.length;
  for (let index = initial; index < 50; index++) task(store, `Example task ${index}`);
  assert.throws(() => task(store, 'One task too many'), { code: 'DEMO_CAPACITY', statusCode: 429 });
  assert.equal(store.reset().state.sessions.length, initial);
  assert.equal(store.snapshot().sessions.find(session => session.id === 'RUN-1041').approval.status, 'pending');
});
