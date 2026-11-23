# 30-Day Devin Pilot Proposal

## Project

**AI Agent Command Center** is an independent, open-source prototype for making AI engineering work easier to inspect and review. Its command center brings together task status, session activity, proposed changes, verification evidence, human decisions, and resource usage.

Repository: [ilorozco11/ai-agent-command-center](https://github.com/ilorozco11/ai-agent-command-center)

## The problem to investigate

A developer evaluating delegated work needs more than an agent's final message. They need a traceable answer to four questions: What was requested? What changed? What evidence supports the result? What did the attempts consume?

This pilot will test a narrow implementation of that workflow with Devin and a public GitHub sandbox repository. The project does not assume that several agents are better than one. Independent review and QA sessions will be explored only if the first workflow is reliable and the extra usage is justified.

## Preparation already in this repository

- A runnable local dashboard with simulated sessions, activity, checks, usage, and review decisions.
- A small demo state machine that makes approval, concurrency, and budget boundaries inspectable.
- Architecture notes separating demo behavior from the proposed live integration.
- A four-week plan with acceptance criteria and a task-level evaluation protocol.

The demonstration uses sample data. It has not called Devin or produced evidence of productivity improvements.

## Support requested

Would Cognition consider providing **30 days of sponsored Devin access or a capped development credit allocation**, with the API permissions needed for this experiment?

The requested access should support creating and observing sessions for a permitted public repository. The exact credits, units, concurrency allowance, and supported API features would be agreed before the live pilot. A small initial allocation is sufficient to establish feasibility; further work would depend on measured progress and any additional allocation the provider chooses to approve.

This is a proposal for consideration, not an application to a verified public grant program. It does not assume that a trial or sponsorship is currently available.

## Initial scope

The first release will connect a bounded GitHub issue to one Devin session, surface the proposed change and test evidence, and record a human review decision. It will track failures and usage alongside successes. It will not automatically merge changes or run against private production repositories.

The planned evaluation uses roughly **10 small, predefined tasks**, adjusted to the agreed usage allocation. They will span bug fixes, focused tests, small refactors, and documentation changes. Task selection, acceptance criteria, and any changes to the sample will be recorded before reporting outcomes.

## Deliverables

| Deliverable | Evidence |
| --- | --- |
| Working integration | Reproducible setup and traceable session-to-task records |
| Public demonstration | A short walkthrough of one complete flow and one failure or intervention |
| Technical write-up | Architecture decisions, integration limitations, and lessons from implementation |
| Evaluation report | Task-level acceptance, review effort, elapsed time, and usage with missing data identified |
| Product feedback | Specific API or workflow friction with reproducible examples |

The publication will identify sponsored access if provided and distinguish measured results from interpretation. No favorable benchmark outcome is promised.

## Timeline and decision point

Week 1 proves access and one session. Week 2 connects a task to proposed changes and review. Week 3 addresses failures and resource accounting. Week 4 completes the evaluation and publishes the findings. The clock starts when usable access is available; blocked prerequisites will be documented.

At the end of the pilot, the evidence should support a decision about continuing, narrowing the approach, or stopping. GitLab, Microsoft Teams, and multiple collaborating sessions remain later experiments.

## Links for review

- [Runnable demo and overview](../README.md)
- [Technical architecture](ARCHITECTURE.md)
- [Detailed roadmap](ROADMAP.md)
- [Evaluation protocol](EVALUATION.md)
- [Devin API research and open questions](DEVIN-INTEGRATION.md)
