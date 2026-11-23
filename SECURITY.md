# Security and operational scope

## Current prototype

This is a local, single-user demo. It does not authenticate users, persist an audit log, contact Devin, access GitHub/GitLab, create pull requests, or send Teams messages. Session activity, checks, and resource usage are simulated.

Run it on a trusted local machine. The default server binds to `127.0.0.1`. Do not expose this prototype directly to the public internet or treat its in-memory approval state as an authorization system.

Do not enter API keys into the dashboard. The application requires no credentials. Keep `.env` files, local logs, and private task data out of version control.

## Requirements before a live pilot

The planned integration must use server-side credentials, explicit repository permissions, authenticated users, durable records, bounded sessions, failure handling, and recorded human review. Provider-specific limits and permissions must be validated with the account used for the pilot. See the [integration plan](docs/DEVIN-INTEGRATION.md) and [architecture](docs/ARCHITECTURE.md).

Do not merge unreviewed agent-generated changes or execute untrusted repository code in the dashboard server process. A real execution environment needs isolation separate from the control application.

## Reporting

For an issue limited to this credential-free demo, open a GitHub issue containing a minimal reproduction with synthetic data. Do not include secrets, private logs, or exploit details involving another service. If private vulnerability reporting is enabled on the repository, use its **Security → Report a vulnerability** flow for sensitive reports; availability has not been assumed or configured by this starter.
