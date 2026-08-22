# Security policy

## Supported versions

Security fixes are released only for the latest version on the default branch.

## Reporting a vulnerability

Use GitHub Private Vulnerability Reporting under **Security → Advisories → Report a vulnerability**. Do not publish a working exploit or sensitive data in a regular issue.

Include the app version, operating system, expected and actual behavior, and minimal reproduction steps. Never attach `auth.json`, the Switcher data directory, OAuth tokens, API keys, QR codes, or 2FA codes.

## What counts as a vulnerability

- disclosure or unencrypted persistent storage of authorization data;
- bypassing IPC/navigation validation or executing code from the renderer;
- unsafe handling of URLs or updates;
- substitution of the Codex binary during a standard build;
- changing the account before Codex has fully closed.
