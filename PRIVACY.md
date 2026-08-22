# Privacy

## What the app stores

- local account labels, usually the email returned by official authorization;
- encrypted authorization data for each saved profile;
- last known limit percentages, plan, and reset time;
- the local auto-switch setting;
- local edits to the built-in guides.

## Where data is sent

Codex Switcher Local has no custom server, telemetry, or analytics. It does not send the developer your account list, email addresses, tokens, passwords, or diagnostics.

The official Codex process connects to OpenAI services for sign-in, authorization refresh, and usage-limit data. The sign-in window opens only HTTPS URLs on `openai.com` and `chatgpt.com` domains.

## Protection at rest

Saved authorization copies are encrypted with Electron `safeStorage`, backed by Keychain on macOS or DPAPI on Windows. If protected operating-system storage is unavailable, the app refuses to save a new account.

Active Codex uses its standard `~/.codex/auth.json` file. The Switcher creates temporary authorization files only with restrictive permissions, removes them after use, and cleans up leftover temporary sessions on the next launch.

## Diagnostics

The copy-diagnostics button writes text only to the system clipboard. It includes the app version, operating-system version, and auto-switch state, but no email addresses, tokens, or account list. You decide whether to send this text to anyone.
