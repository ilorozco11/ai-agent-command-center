import { randomUUID } from 'node:crypto';

export class DemoError extends Error {
  constructor(message, code = 'INVALID_REQUEST', statusCode = 400) {
    super(message);
    this.name = 'DemoError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const DEFAULT_SETTINGS = Object.freeze({ sessionBudgetAcu: 5, maxConcurrent: 2 });
const CHECK_NAMES = ['Code review', 'Unit tests', 'Human review'];
const MAX_SESSIONS = 50;
const MAX_EVENTS = 100;

function validateTask(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DemoError('Provide a task title and repository.');
  }
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const repository = typeof input.repository === 'string' ? input.repository.trim() : '';
  if (title.length < 3 || title.length > 160 || /[\u0000-\u001f\u007f]/u.test(title)) {
    throw new DemoError('Task titles must contain 3–160 characters and no control characters.');
  }
  if (repository.length > 160 || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/u.test(repository)) {
    throw new DemoError('Use a repository in owner/name format, for example demo/example-app.');
  }
  return { title, repository };
}

/** In-memory simulation only. No provider client, network calls, or actual ACU use. */
export function createStore({ clock = () => new Date(), idFactory = () => `RUN-${randomUUID().slice(0, 8)}`, seed = true } = {}) {
  const settings = { ...DEFAULT_SETTINGS };
  let sessions = [];
  let updatedAt;
  const timestamp = () => new Date(clock()).toISOString();

  function event(session, type, message) {
    const at = timestamp();
    session.updatedAt = at;
    updatedAt = at;
    session.events.push({ id: randomUUID(), at, type, message });
    if (session.events.length > MAX_EVENTS) session.events.shift();
  }

  function makeSession({ id = idFactory(), title, repository = 'demo/example-app', role = 'Developer', status = 'queued', progress = 0, acuUsed = 0, approval = null }) {
    const now = timestamp();
    return {
      id, title, repository, role, status, progress, acuUsed,
      branch: `demo/${id.toLowerCase()}`,
      acuLimit: settings.sessionBudgetAcu,
      createdAt: now,
      updatedAt: now,
      prUrl: null,
      events: [],
      checks: CHECK_NAMES.map(name => ({ name, status: 'pending' })),
      approval: { status: approval },
    };
  }

  function seedSessions() {
    const current = [
      makeSession({ id: 'RUN-1042', title: 'Add pagination to the activity feed', status: 'running', progress: 40, acuUsed: 1 }),
      makeSession({ id: 'RUN-1041', title: 'Review validation on the task form', role: 'Reviewer', status: 'awaiting_approval', progress: 100, acuUsed: 3, approval: 'pending' }),
      makeSession({ id: 'RUN-1040', title: 'Add coverage for empty search results', role: 'QA', status: 'queued' }),
      makeSession({ id: 'RUN-1039', title: 'Fix keyboard focus in the session drawer', status: 'completed', progress: 100, acuUsed: 3, approval: 'approved' }),
      makeSession({ id: 'RUN-1038', title: 'Investigate an intermittent demo test failure', role: 'QA', status: 'blocked', progress: 70, acuUsed: 5 }),
    ];
    for (const session of current) {
      event(session, 'created', 'Synthetic example loaded. No provider session or repository access was created.');
      if (session.progress >= 40) session.checks[0].status = 'passed';
      if (session.progress >= 100) session.checks[1].status = 'passed';
      if (session.status === 'running') {
        session.checks[1].status = 'running';
        event(session, 'progress', 'Demo implementation step complete. Simulated checks are in progress.');
      }
      if (session.status === 'awaiting_approval') {
        event(session, 'approval_requested', 'Simulated checks passed. Waiting for a human decision; no real pull request exists.');
      }
      if (session.status === 'completed') {
        session.checks[2].status = 'passed';
        event(session, 'approved', 'Demo result approved. No commit was merged.');
      }
      if (session.status === 'blocked') {
        event(session, 'budget_blocked', 'Illustrative 5 ACU budget reached. This demo cannot increase a budget or spend real credits.');
      }
    }
    return current;
  }

  function snapshot() {
    return structuredClone({ mode: 'demo', updatedAt, settings, sessions });
  }

  function find(id) {
    const session = sessions.find(item => item.id === id);
    if (!session) throw new DemoError('The demo session was not found.', 'NOT_FOUND', 404);
    return session;
  }

  function assertApprovalReady(session) {
    if (session.status !== 'awaiting_approval' || session.approval.status !== 'pending') {
      throw new DemoError('Only a session waiting for human review can receive this decision.', 'INVALID_TRANSITION', 409);
    }
    if (session.checks.slice(0, 2).some(check => check.status !== 'passed')) {
      throw new DemoError('Simulated code and test checks must pass before human review.', 'CHECKS_REQUIRED', 409);
    }
  }

  function result(session) {
    return { state: snapshot(), session: structuredClone(session) };
  }

  function reset() {
    sessions = seed ? seedSessions() : [];
    updatedAt = timestamp();
    return { state: snapshot() };
  }

  reset();

  return {
    snapshot,
    reset,
    createTask(input) {
      const fields = validateTask(input);
      if (sessions.length >= MAX_SESSIONS) {
        throw new DemoError('The demo supports up to 50 sessions. Reset it to start again.', 'DEMO_CAPACITY', 429);
      }
      const session = makeSession(fields);
      if (sessions.some(item => item.id === session.id)) {
        throw new DemoError('Could not allocate a unique session. Please try again.', 'ID_COLLISION', 409);
      }
      event(session, 'created', 'Demo task queued. The repository name is a label; no repository was accessed.');
      sessions.unshift(session);
      return result(session);
    },
    advance(id) {
      const session = find(id);
      if (!['queued', 'running'].includes(session.status)) {
        throw new DemoError('Only queued or running demo sessions can advance.', 'INVALID_TRANSITION', 409);
      }
      if (session.acuUsed >= session.acuLimit) {
        session.status = 'blocked';
        event(session, 'budget_blocked', 'Illustrative ACU limit reached. No additional simulated work is allowed.');
        return result(session);
      }
      if (session.status === 'queued') {
        const running = sessions.filter(item => item.status === 'running').length;
        if (running >= settings.maxConcurrent) {
          throw new DemoError('Both demo execution slots are busy. Advance an active session until it reaches review.', 'CONCURRENCY_LIMIT', 409);
        }
        session.status = 'running';
        session.progress = Math.max(10, session.progress);
        event(session, 'started', 'Simulated execution started. No Devin API call was made.');
        return result(session);
      }
      const nextCost = 1;
      if (session.acuUsed + nextCost > session.acuLimit) {
        session.status = 'blocked';
        event(session, 'budget_blocked', 'The next demo step would exceed the illustrative ACU limit.');
        return result(session);
      }
      session.acuUsed = Math.round((session.acuUsed + nextCost) * 100) / 100;
      session.progress = Math.min(100, session.progress + 30);
      if (session.progress >= 40) session.checks[0].status = 'passed';
      if (session.progress < 100) {
        session.checks[1].status = 'running';
        event(session, 'progress', `Simulated work advanced to ${session.progress}%. Added 1 illustrative ACU; this is not a billing estimate.`);
      } else {
        session.checks[1].status = 'passed';
        session.checks[2].status = 'pending';
        session.status = 'awaiting_approval';
        session.approval.status = 'pending';
        event(session, 'approval_requested', 'Simulated checks passed. Human review is required before marking this demo result complete.');
      }
      return result(session);
    },
    approve(id) {
      const session = find(id);
      assertApprovalReady(session);
      session.status = 'completed';
      session.approval.status = 'approved';
      session.checks[2].status = 'passed';
      event(session, 'approved', 'Human approved the demo result. No real pull request was merged or repository changed.');
      return result(session);
    },
    requestChanges(id) {
      const session = find(id);
      assertApprovalReady(session);
      session.status = 'queued';
      session.progress = 40;
      session.approval.status = 'changes_requested';
      session.checks[1].status = 'pending';
      session.checks[2].status = 'pending';
      event(session, 'changes_requested', 'Human requested changes. Rework queued within the same illustrative session budget.');
      return result(session);
    },
  };
}
