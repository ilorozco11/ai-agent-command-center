# Evaluation Protocol

## Purpose and current evidence

The pilot asks whether a developer can delegate a bounded task, inspect the evidence, intervene when needed, and understand the resource use. It does not begin with a promised time-saving percentage.

**Current results: not measured.** Dashboard fixtures are synthetic and must never be included in a benchmark. The protocol below is a proposed method for the future live pilot.

## Task sample

Start with approximately 10 small tasks in an approved public sandbox repository, subject to the granted usage allocation. Include bug fixes, targeted tests, small refactors, and documentation updates. Avoid production incidents or tasks with unclear acceptance criteria.

Before dispatch, record the issue, repository commit, requirements, expected verification, complexity notes, attempt limit, and usage boundary. Keep the selected set visible, including tasks that later fail or cannot run. If the sample changes, report what changed and why.

A task is the unit of evaluation. Additional sessions and retries belong to the same task, so repeated attempts cannot inflate the accepted-task count.

## Acceptance rubric

A task is accepted only when a human confirms its predefined criteria, required checks pass for the reviewed commit, and no known blocking issue remains. A plausible final response, an exited session, or a generated pull request alone does not count as acceptance.

Report each task as one of:

- **Accepted:** satisfies the rubric, with intervention recorded.
- **Not accepted:** work was attempted but failed the rubric or reached its boundary.
- **Blocked before execution:** a setup, permission, or availability problem prevented a substantive attempt.
- **Inconclusive:** necessary evidence is missing or cannot be verified.

An observed test pass is evidence for the specific test, not proof that the entire change is correct. Record any defect found during the pilot follow-up period.

## Metrics and definitions

| Metric | Definition | Interpretation |
| --- | --- | --- |
| Accepted-task rate | Accepted tasks / all attempted tasks | Report numerator and denominator; keep pre-execution blocks separate |
| First-attempt acceptance | Tasks accepted after their first session attempt / attempted tasks | Do not hide review or manual intervention |
| Time to review-ready | Elapsed time from successful dispatch to an inspectable result | Includes provider execution and waiting; excludes preparation, which is reported separately |
| Human active time | Recorded minutes spent preparing, clarifying, reviewing, and correcting | Keep categories separate; note self-report limitations |
| Review turnaround | Time between review-ready and the first human decision | Includes scheduling delays; not a pure agent-performance metric |
| Required-check pass rate | Tasks with all required checks passing / tasks with complete required-check evidence | List tasks with missing evidence separately |
| Resource use per attempt | Provider-reported usage associated with that session attempt | Preserve actual units and timestamps |
| Resource use per accepted task | Total usage across all attempted tasks, including failures and retries / accepted tasks | Undefined if no task is accepted or usage is incomplete |
| Paid cost per accepted task | Total attributable charged cost for all attempted tasks / accepted tasks | Report only when a valid account-specific cost basis is available |
| Intervention count | Number of meaningful human clarifications, corrections, or restarts | Accompany counts with reasons; not all interventions are equally costly |

Sponsored credits have an economic allocation but may have no cash charge to the participant. Report sponsored usage and any actual charges separately. Never infer a dollar rate from the demo's ACU counter.

## Recording template

Use one row per task in the final report, with links to supporting records where sharing is permitted:

| Task | Baseline commit | Acceptance criteria | Attempts | Outcome | Human minutes | Elapsed time | Usage and unit | Evidence or blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| To be recorded | — | — | — | Not measured | — | — | Unknown | — |

Also retain individual attempt records containing session IDs, timestamps, prompts or revisions safe to publish, observed statuses, pull request and commit IDs, required-check evidence, review decisions, and cancellation or retry reasons.

## Optional manual comparison

If feasible, preselect a small matched subset for manual implementation by the same developer. Record active effort and task difficulty consistently. Avoid doing the exact task twice and treating the second run as independent: familiarity can distort the comparison.

Without a credible baseline, report descriptive outcomes only. Even with a matched subset, a pilot this small cannot establish a general productivity gain or causal effect.

## Publication rules

- Include failures, aborted attempts, human corrections, and missing usage data.
- Separate local simulator tests from real task outcomes.
- Distinguish observed facts, evaluator judgments, and hypotheses.
- Show distributions or individual values before presenting averages.
- Report the evaluation dates, provider configuration, relevant versions, and account limitations.
- Redact credentials and private information while preserving enough context to understand results.
- Identify sponsorship if provided and disclose any restrictions on publication.

The most useful output may be a smaller, more reliable workflow and a clear list of unsolved problems. A positive benchmark result is not required for an informative pilot.
