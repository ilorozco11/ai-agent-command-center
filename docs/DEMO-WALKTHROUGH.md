# Five-minute demo walkthrough

## Start

Run `npm start` from the repository root and open `http://localhost:3000`. No API key or dependency installation is needed. The server uses in-memory data, and restarting it restores the synthetic examples.

## Show the review workflow

1. Find a session waiting for human approval and open its details.
2. Inspect the simulated checks, activity, and illustrative ACU usage.
3. Request changes. The session returns to the queue and keeps its previous resource usage.
4. Advance it through the simulated work steps. The demo allows two running sessions and blocks work when a session reaches its illustrative limit.
5. Once checks pass and the session waits for review again, approve the demo result. This marks the local example complete; it does not merge a pull request.

## Show task creation and inspection

Create a small example task such as “Add a loading state to the activity feed,” using `demo/example-app` as the repository label. Search for it, inspect its events, and advance it. Try a status filter and confirm the table and summary use that filter's population.

Use Reset demo to restore the starting examples. The action clears local simulated changes only.

## Explain the pilot boundary

The working application demonstrates the intended operator experience and review gate. Repository names are labels; checks and progress are simulated. No Devin session runs, no source repository is accessed, and no billing data is fetched.

The first real pilot should replace simulation for one narrow workflow: a bounded issue, one provider session, captured evidence, and human review. GitLab, Teams, and multiple coordinated provider sessions remain later milestones. See the [pilot proposal](PILOT-PROPOSAL.md), [integration plan](DEVIN-INTEGRATION.md), and [evaluation protocol](EVALUATION.md).
