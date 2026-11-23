# Contributing

This project is an early, independent prototype. The first milestone is a clear, testable workflow from a small development task to a human-reviewed result. The current application runs entirely with simulated data.

## Local development

Use Node.js 22 or newer (the `.nvmrc` selects Node 24). There are no runtime or development package dependencies.

```sh
npm start
```

Open `http://localhost:3000`. Use `npm run dev` to restart the server when source files change. State is stored in memory and resets when the server restarts.

```sh
npm test
```

## A useful contribution

1. Check the [roadmap](docs/ROADMAP.md) and describe the user problem in an issue.
2. Keep the change small enough to demonstrate and review.
3. Keep sample values and simulated actions visibly labeled. Never display an unknown live metric as zero.
4. For state-machine or API changes, exercise success and relevant failure paths. For UI changes, check keyboard use, narrow layouts, and the affected workflow.
5. Describe what changed, why, and how you verified it in the pull request.

Do not add credentials, private repositories, customer data, or generated activity that looks like a measured result. Use synthetic examples. New API integrations must stay server-side and require explicit configuration before making remote calls.

## Review expectations

Changes to provider access, budgets, permissions, external writes, or approval gates need an explanation of the resulting behavior. A demo approval is not permission to merge a pull request. Preserve human approval in any future live integration.

Contributions are made under the [MIT license](LICENSE).
