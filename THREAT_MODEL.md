# Threat model

## Protected data

- Codex OAuth refresh/access tokens and API keys;
- local account identifiers and email addresses;
- integrity of the active Codex authorization file;
- integrity of the packaged application.

## Trust boundaries

- The Electron main process can access files and launch Codex.
- The renderer displays only local static files and runs in a sandbox without Node.js.
- The preload exposes a narrow IPC method list without direct `ipcRenderer` access.
- The Codex binary is downloaded from the official npm package and verified against registry integrity metadata.
- The system browser performs the official OpenAI sign-in.

## Primary protections

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and a strict CSP.
- A custom `app://` protocol instead of privileged `file://` loading.
- Renderer navigation, new windows, webviews, and all permission requests are blocked.
- Every privileged IPC request has its source validated.
- `shell.openExternal` permits only HTTPS URLs on `openai.com` and `chatgpt.com`.
- Atomic file writes and `0700/0600` permissions on POSIX systems.
- Keychain/DPAPI for saved profiles; plaintext exists only for active Codex and a temporary app-server session.
- Electron fuses disable RunAsNode, `NODE_OPTIONS`, and the CLI inspector while enabling ASAR integrity and ASAR-only loading.
- Auto-switching does not replace authorization until Codex has fully closed.

## Out of scope

- malware already running with the current user's permissions;
- compromise of the operating system, Keychain/DPAPI, the official Codex client, or the OpenAI account;
- physical access to an unlocked computer;
- modification of an unsigned build before installation.

Signing and notarizing the macOS build and signing the Windows build are strongly recommended before broad distribution.
