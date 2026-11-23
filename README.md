# AI Agent Command Center

**A visible, reviewable workflow for AI engineering work.**

An independent, open-source prototype for tracking coding sessions, inspecting evidence, and deciding what needs human attention. The initial live pilot is designed around one bounded workflow: a GitHub task becomes a Devin session, produces a proposed change, and reaches a human review checkpoint.

**Current release: interactive local demo.** All sessions, activity, checks, and usage figures are simulated. No Devin account, API key, GitHub token, or paid service is required to run it. No live Devin integration has been implemented.

The [dashboard source](public/index.html) is included in the repository. Run the local server below to interact with its session queue and review panel.

## Why this project

Delegating a task is only the beginning. A developer also needs to know which session is blocked, what evidence supports completion, how much work has been consumed, and when to intervene. This project explores a focused command center for those decisions.

The first milestone is deliberately small: make one task-to-review workflow observable and measurable. Coordinating separate developer, reviewer, and QA sessions is a later experiment, after the basic integration is reliable.

## What works today

| Capability | Current status |
| --- | --- |
| Responsive monochrome dashboard | Implemented for the local demo |
| Session queue, search, status filters, and detail panel | Implemented with sample data |
| Task creation and step-by-step session progression | Simulated locally |
| Activity, check results, review decisions, and usage counters | Simulated locally |
| Human review checkpoint | Enforced by the demo state machine; approval does not merge code |
| Session concurrency and budget boundaries | Demonstrated with local rules; not provider billing controls |
| Devin API session creation and monitoring | Planned; requires authorized API access |
| GitHub pull request evidence and review status | Planned; no repository changes are made by the demo |
| GitLab, Microsoft Teams, and multi-session collaboration | Future or stretch work |
| Productivity and cost benchmarks | Not measured; evaluation protocol is included |

## Run the demo

Requirements: **Node.js 22 or later** and npm. The application uses Node's standard library and browser APIs; it has no runtime package dependencies.

```bash
git clone https://github.com/ilorozco11/ai-agent-command-center.git
cd ai-agent-command-center
npm start
```

Open **http://localhost:3000**. No installation step or API credentials are needed.

If you downloaded a source ZIP, extract it, open a terminal in the extracted project directory, and run `npm start`.

```bash
npm test
```

Demo state lives in the server process. Resetting the demo or restarting the server restores sample sessions. Treat it as a local prototype, not a hosted team service.

### A two-minute walkthrough

1. Find a session awaiting approval and inspect its activity and simulated checks.
2. Try a search or status filter to narrow the queue; summary values follow the visible sessions.
3. Create a demo task using a short title and an `owner/repository` label.
4. Advance its lifecycle, inspect the updated evidence, and approve it or request changes when it reaches review.
5. Reset the demo to return to the starting data.

Repository labels in the task form are sample metadata: entering one does not grant access or contact GitHub. The **ACU** figures illustrate a usage interface and do not represent a bill, a quote, or an available allowance.

## The proposed 30-day pilot

**Request:** time-limited Devin access with the API permissions and capped usage needed to test a small set of approved GitHub tasks. The exact allocation and available capabilities should be agreed with Cognition before work starts.

| Period | Intended outcome |
| --- | --- |
| Week 1 | Verify access, repository permissions, one session, and a usage boundary |
| Week 2 | Connect one issue-to-session-to-review flow with linked evidence |
| Week 3 | Handle retries, stale state, failed checks, and bounded parallel work |
| Week 4 | Publish a reproducible demo and an honest pilot report, including failures |

The pilot begins when suitable access is available. The demo is preparation for that pilot; its sample values are not pilot results. See the [proposal](docs/PILOT-PROPOSAL.md), [roadmap](docs/ROADMAP.md), and [evaluation protocol](docs/EVALUATION.md).

## Documentation

| Document | Purpose |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Current implementation, proposed integration boundaries, and review semantics |
| [Devin integration notes](docs/DEVIN-INTEGRATION.md) | Official API references, account prerequisites, and unverified assumptions |
| [30-day roadmap](docs/ROADMAP.md) | Milestones and acceptance criteria |
| [Pilot proposal](docs/PILOT-PROPOSAL.md) | A focused support request and deliverables |
| [Evaluation protocol](docs/EVALUATION.md) | Metrics, sample selection, and reporting limitations |
| [Demo walkthrough](docs/DEMO-WALKTHROUGH.md) | A five-minute tour of the simulated workflow |
| [Verification record](docs/VERIFICATION.md) | Checks performed for this starter and remaining verification |
| [Contributing](CONTRIBUTING.md) | Development and contribution guidance |
| [Security](SECURITY.md) | Prototype scope and responsible reporting |

## Project layout

| Path | Responsibility |
| --- | --- |
| `public/` | Dashboard markup, styling, and browser interaction |
| `src/server.mjs` | Local HTTP server and demo API |
| `src/store.mjs` | In-memory sample data and workflow transitions |
| `test/` | Automated checks for the local prototype |
| `docs/` | Architecture, pilot plan, and integration research |

## Contributing

Useful early contributions include clearer review evidence, accessible queue interactions, and carefully scoped integration work. Keep simulated behavior visibly identified, attach verification to functional changes, and separate completed work from roadmap items. Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## License and affiliation

Released under the [MIT License](LICENSE).

This is an independent community project. It is not an official Cognition or Devin product, and no sponsorship, partnership, or access grant is implied. Devin and Cognition names identify the intended integration. Current provider capabilities are linked in the [integration notes](docs/DEVIN-INTEGRATION.md).
