# Devin Integration Notes

**Status: research and proposed implementation. No live adapter is included in this release.**

Official documentation was reviewed on **23 November 2026**. Provider interfaces and account entitlements can change; confirm these references against the account used for the pilot. Documentation availability does not prove that an account has the corresponding permission or a sponsored allowance.

## Verified documentation and intended use

| Area | Officially documented surface | Project decision |
| --- | --- | --- |
| API version and scope | Current organization APIs use `https://api.devin.ai/v3/organizations/*`; v1 and v2 are legacy [1] | Start with one organization and a v3 adapter |
| Authentication | Service users support automation with role-based access and bearer credentials [2] | Store a dedicated credential on the server; request only the needed role |
| Session creation | `POST /v3/organizations/{org_id}/sessions` accepts a prompt and supports fields including `max_acu_limit`, `repos`, and structured output [3] | Create one bounded session per task initially |
| Session observation | A session can be retrieved through the organization API [4] | Observe provider state and preserve its timestamp and raw status |
| Follow-up instructions | The API provides a session-message operation [5] | Keep human clarifications associated with the task and attempt |
| Termination | The API exposes a terminate-session operation [6] | Implement an explicit stop request and reconcile the result |
| Billing | Self-serve usage and Enterprise ACU billing use different accounting models [7] | Confirm actual units and allowance; no fixed dollar conversion in the demo |

The schema includes usage and pull-request information, but the application must still verify what the authorized account returns and how promptly it is updated. Check results and human acceptance require independent evidence. A provider's terminal status must not automatically mean the project task is accepted.

## Before implementing live mode

1. Confirm that the account has appropriate API access and an organization context.
2. Provision a service user following the provider's current setup guidance; confirm required session and repository permissions.
3. Agree the trial duration, permitted repositories, allocation, billing units, concurrency, and stop conditions.
4. Use a small sandbox task to validate create, observe, clarify, and terminate behavior.
5. Confirm which usage and pull-request fields are populated and how they relate to billing.
6. Record unsupported features rather than substituting made-up values or success states.

The [Teams quick start][8] describes service-user setup and basic session operations. It also documents account-dependent transitions from playbooks to skills. The pilot therefore does not depend on a playbook feature until it is confirmed for the selected account.

## Application design choices

These are project requirements, not claims about guaranteed provider behavior:

- Persist a local task ID and dispatch intent before starting paid work.
- Use a bounded queue; begin with one active session.
- Set a provider-supported session limit when appropriate, and maintain a separate application-wide dispatch budget.
- Treat uncertain request outcomes as reconciliation work before retrying.
- Poll with a controlled interval and backoff, preserving the last successful observation.
- Keep raw provider statuses separate from application states such as `awaiting_approval` and `completed`.
- Validate external links and structured data before rendering them.
- Preserve unknown usage as unknown. Do not silently convert missing values to zero.
- Keep keys out of browser assets, logs, screenshots, and committed configuration.

### Usage boundary caveat

`max_acu_limit` is a documented request field [3]. This repository has not verified its runtime behavior, interaction with account billing, or any possible observation delay. The demo's local ceiling is not evidence of a hard provider spending cap. Test the relevant account controls and document their semantics before unattended operation.

### Multi-agent scope

Separate developer, review, and QA roles are a proposed application workflow. The initial pilot does not require a dedicated "Devin Bots" API or assume that several sessions can run concurrently under any particular plan. Investigate advanced orchestration only after the single-session path works and the account's capabilities and usage boundaries are understood.

## Open questions for the pilot

| Question | Why it matters |
| --- | --- |
| Which API permissions and account capabilities can be granted? | Determines what the first integration can actually do |
| What usage unit and allocation apply? | Prevents misleading cost displays |
| How quickly does reported usage update? | Affects the reliability of application budget decisions |
| What happens at the selected session limit? | Determines recovery and operator handling |
| How should uncertain session creation be reconciled? | Avoids duplicate work and usage |
| Which repositories may the agent access? | Defines the scope of the experiment |
| Are public demos and technical findings permitted? | Confirms the proposed deliverables are feasible |

No sponsorship program, approval process, or trial availability has been verified by this research.

## Official sources

1. [API overview][1]
2. [Authentication][2]
3. [Create Session][3]
4. [Get Session][4]
5. [Send a message to a session][5]
6. [Terminate Session][6]
7. [Billing][7]
8. [Teams quick start][8]

[1]: https://docs.devin.ai/api-reference/overview
[2]: https://docs.devin.ai/api-reference/authentication
[3]: https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions
[4]: https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session
[5]: https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions-messages
[6]: https://docs.devin.ai/api-reference/v3/sessions/delete-organizations-sessions
[7]: https://docs.devin.ai/admin/billing
[8]: https://docs.devin.ai/api-reference/getting-started/teams-quickstart
