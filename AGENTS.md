# Working in this repository

## Project intent

AI Agent Command Center is an independent local prototype for a proposed Devin pilot. The current application simulates sessions and human review. Keep implemented behavior distinct from proposed integrations in code, UI, and documentation.

## Structure

- `src/store.mjs`: demo session state and transitions.
- `src/server.mjs`: localhost HTTP API and static files.
- `public/`: framework-free dashboard.
- `test/`: Node test runner tests for behavior and HTTP boundaries.
- `docs/`: architecture, pilot plan, evaluation method, and integration research.

## Commands

Use Node 22 or newer; `.nvmrc` selects Node 24.

```sh
npm start
npm test
node --check public/app.js
```

The demo has no package dependencies and requires no API keys. Avoid adding dependencies without explaining what problem they solve.

## Implementation expectations

Preserve explicit demo labels and server-side transition validation. All totals shown after filtering must describe the same filtered population. Missing provider measurements are unknown, not zero.

Keep browser code same-origin and credentials out of the browser. Provider access, repository writes, real test execution, live billing, durable authentication, and multi-agent orchestration are not implemented in this starter. Review the integration and architecture documents before adding them.

Use meaningful behavioral tests for state changes and API boundaries. Check UI changes in a browser when available, including keyboard navigation and a narrow viewport. State which checks actually ran.

Do not claim a real Devin session, pull request, benchmark, or live integration exists without verifiable evidence. Follow the user's requested scope for any remote action.
