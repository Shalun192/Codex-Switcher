# Codex Switcher Local

A minimalist open-source desktop app for switching between your own Codex accounts on macOS and Windows.

> Unofficial community project. It is not affiliated with or endorsed by OpenAI. Use only accounts you own and follow the OpenAI service terms.

[![CI](https://github.com/Shalun192/Codex-Switcher/actions/workflows/ci.yml/badge.svg)](https://github.com/Shalun192/Codex-Switcher/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-lightgrey.svg)](INSTALL.md)

**Do not want to build it yourself?** Download the ready-to-use macOS or Windows version from the [official Codex Switcher download page](https://shalun.online/codex-switcher/). The page is kept up to date whenever a new build is released.

## Download

The easiest option is the continuously updated build on the [official website](https://shalun.online/codex-switcher/). Release mirrors and version history are also available in [GitHub Releases](https://github.com/Shalun192/Codex-Switcher/releases/latest):

| System | File | Support |
| --- | --- | --- |
| macOS | `Codex-Switcher-4.6.3-mac-universal.dmg` | macOS 12+, Apple Silicon and Intel |
| Windows | `Codex-Switcher-4.6.3-win-x64.zip` | Windows 10/11 x64 |

Before installing, read [INSTALL.md](INSTALL.md) and compare the downloaded file's SHA-256 digest with `SHA256SUMS.txt` from the release.

## Why Codex Switcher Local

- **One clear action.** Select an account and click **Connect to Codex**.
- **Fully local architecture.** No custom server, device registration, analytics, or remote administration.
- **Encrypted saved profiles.** Uses Keychain on macOS and DPAPI on Windows.
- **Limits at a glance.** Each account shows remaining percentages, plan, and reset time.
- **Auto-switch at 1%.** The Switcher can find the next account with available capacity, safely close Codex, replace the local authorization, and start Codex again.
- **English and Russian.** English is the default; one compact selector translates the interface, status messages, diagnostics, menus, and all ten built-in guides.
- **Reversible removal.** A locally removed profile can be restored.
- **Auditable code.** Source, threat model, privacy policy, and automated tests are public.

The project's key advantage is its very simple interface combined with local-only storage. You never need to give the developer your password, 2FA secret, or tokens, and you do not need to trust a third-party backend.

## Features

- Add accounts through the official Codex browser sign-in.
- Explicitly connect the selected account to the local Codex installation.
- Display limit percentages, reset time, and the `Free`, `Go`, `Plus`, or `Pro` plan.
- Automatically switch to the next available account at 1%.
- Safe switch order: close Codex → atomically replace authorization → start Codex again.
- Reversible local account removal.
- English and Russian interface with English as the default language.
- Ten fully localized built-in guides with a local editor.
- One source tree for macOS 12+ and Windows 10/11 x64.

The app supports the personal plans that Codex reports as `Free`, `Go`, `Plus`, or `Pro`. It does not provide a subscription or bypass OpenAI limits; it only helps manage your own local authorizations.

## Privacy

The app has no custom backend, remote administration, analytics, or telemetry. Account lists and saved authorizations are never sent to the developer.

Saved profiles are encrypted using operating-system facilities:

- macOS — Keychain through Electron `safeStorage`;
- Windows — DPAPI through Electron `safeStorage`.

Codex itself requires internet access: the official Codex binary communicates with OpenAI for sign-in and usage-limit data. When you switch accounts, the active authorization is written to Codex's standard local file at `~/.codex/auth.json`; this is required for compatibility. A temporary decrypted copy is created with restrictive permissions only for the duration of an app-server request and is deleted after the operation or on the next launch.

See [PRIVACY.md](PRIVACY.md) and [THREAT_MODEL.md](THREAT_MODEL.md) for details.

## Run from source

Install:

- Node.js 22 or later;
- Corepack and pnpm 11;
- Git.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run prepare:codex
pnpm run check
pnpm start
```

`prepare:codex` downloads platform packages from the official `@openai/codex` npm package, verifies the archive's npm SHA-512 integrity and the pinned SHA-256 of the extracted binary. Binaries and builds are not stored in Git.

OpenAI documentation describes ChatGPT browser sign-in as the standard local authentication method for Codex: <https://learn.chatgpt.com/docs/auth>.

## Build

macOS universal DMG/ZIP:

```bash
pnpm run build:mac
```

Windows x64 portable ZIP:

```bash
pnpm run build:win
```

Windows x64 installer:

```bash
pnpm run build:win:installer
```

For public distribution, sign the app with Apple Developer ID and Windows code-signing certificates. Unsigned builds work, but Gatekeeper or SmartScreen may display a warning.

## Checks before publishing

```bash
pnpm run check
pnpm audit --audit-level high
```

The repository includes CI, Dependabot, common-secret detection, Electron sandbox/context isolation/CSP, IPC source validation, permission and navigation blocking, a custom local protocol, and production Electron fuses.

## Publishing to GitHub

Publish only the contents of this project folder. `node_modules`, `vendor`, `dist`, authorization files, local profiles, certificates, and `.env` files are excluded by `.gitignore`.

Before the first commit, enable **Keep my email addresses private** on GitHub and configure Git with your GitHub no-reply address. Otherwise, a personal email address can become part of the public commit history. Then review the file list and create the commit:

```bash
git status --short --ignored
pnpm run check
git commit -m "Initial public release"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

GitHub recommends pinning Actions to full commit SHAs; the included workflow files already use immutable references. Do not force-add ignored files with `git add -f`.

## Important limitations

- The app manages local Codex authorization and is therefore security-sensitive software.
- Encryption cannot protect against malware already running as the current user.
- Auto-switching works only while the Switcher is running.
- APIs used to read limits from the Codex app server may change in future Codex versions.

## License

Switcher code is licensed under MIT. The official Codex package downloaded during the build has a separate Apache-2.0 license; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
