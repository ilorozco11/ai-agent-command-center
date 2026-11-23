# Roadmap

## Starting point

The repository contains a runnable demo, design documentation, and a pilot plan. Live Devin execution, GitHub synchronization, durable storage, authentication, and provider accounting are not implemented. No measured productivity result is available.

The schedule below is a proposed **30-day pilot beginning when suitable access is available**. If a prerequisite is blocked, publish the limitation and revise scope rather than marking the milestone complete.

## Week 1 — Prove the smallest integration

**Goal:** show that one authorized task can create and observe one real session under an agreed usage boundary.

- Confirm account eligibility, service-user permissions, billing units, and access duration with the provider.
- Select one public sandbox repository and prepare a small set of issues with explicit acceptance criteria.
- Implement a server-side adapter and keep demo and live modes unmistakable.
- Record one real session ID, provider status, timestamp, and usage observation.
- Verify credential handling and a stop/cancel path before broader execution.

**Acceptance criteria:** a maintainer can inspect a reproducible record of the first session; credentials stay off the client; unavailable fields appear as unknown; the agreed usage boundary and its limitations are documented.

**If blocked:** retain the demo, publish which permission or capability is missing, and avoid claiming live integration.

## Week 2 — Complete a task-to-review flow

**Goal:** connect an approved issue, a session, a proposed change, and a human decision.

- Persist task and session associations so a restart does not lose work.
- Read actual pull request and CI evidence for the relevant commit.
- Present proposed changes and blockers in the dashboard.
- Record human acceptance or requested changes without automatically merging.
- Make one incomplete or failed outcome inspectable alongside a successful outcome.

**Acceptance criteria:** the full flow works on the sandbox repository; a failed required check prevents acceptance; a new commit invalidates evidence tied to the old commit; reconnecting does not silently create a duplicate paid session.

## Week 3 — Make failure and cost visible

**Goal:** recover predictably when the workflow encounters ordinary integration failures.

- Add reconciliation for uncertain dispatch outcomes and idempotency at the application boundary.
- Exercise throttling, timeouts, stale observations, expired permissions, and interrupted sessions.
- Display usage in the account's actual units and link it to task attempts.
- Start sequentially; permit bounded concurrency only after the single-session path passes.
- Limit retries and require an operator decision when work exceeds its agreed boundary.

**Acceptance criteria:** failure scenarios produce useful operator actions and retained evidence; duplicate submissions do not multiply work; usage gaps remain visible; parallel work cannot bypass configured dispatch limits.

## Week 4 — Evaluate and publish

**Goal:** produce a small, reproducible account of what worked, failed, and remains uncertain.

- Evaluate the predefined task set using the [protocol](EVALUATION.md).
- Publish task-level outcomes, human effort, check results, and resource usage where available.
- Record a working demo, setup instructions, architecture decisions, and provider feedback.
- Report missing data, retries, excluded tasks, and limitations.
- Decide whether further access is justified by actual evidence.

**Acceptance criteria:** a reader can trace each reported outcome to an issue, session, pull request or failure record, and evaluation criterion. Demo fixtures are excluded from measured results.

## Stretch work after the core pilot

| Experiment | Prerequisite |
| --- | --- |
| Independent review or QA session | Reliable task correlation, evidence model, and an agreed extra usage budget |
| GitLab support | The GitHub flow has been evaluated and provider/account permissions are confirmed |
| Microsoft Teams notifications or task intake | Explicit workspace authorization and a clear recipient/thread model |
| Push updates to dashboard clients | A useful polling workflow and a durable event store |
| Broader orchestration | Evidence that additional sessions improve the outcome enough to justify their cost |

These items are intentionally outside the initial commitment. No feature implies automatic merge, deployment, messaging, or access to private repositories.
