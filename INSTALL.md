# Install Codex Switcher Local

Codex Switcher Local is an unofficial local community app intended only for switching between Codex accounts you own.

Ready-to-use macOS and Windows builds are available on the continuously updated [official download page](https://shalun.online/codex-switcher/). GitHub Releases provides release mirrors and version history.

## macOS

1. Open the [ready-to-use download page](https://shalun.online/codex-switcher/) or **Releases** on GitHub.
2. Download `Codex-Switcher-4.6.4-mac-universal.dmg`.
3. Compare its SHA-256 digest with `SHA256SUMS.txt` in the same release.
4. Open the DMG and drag the app to **Applications**.
5. Start Codex Switcher Local and add an account through the official OpenAI browser sign-in.

The universal build supports Apple Silicon and Intel. The current test build is not signed with an Apple Developer ID, so macOS may display a warning. Do not disable Gatekeeper globally. For maximum assurance, build the app from reviewed source or wait for a signed release.

## Windows 10/11 x64

1. Open the [ready-to-use download page](https://shalun.online/codex-switcher/) or **Releases** on GitHub.
2. Download `Codex-Switcher-4.6.4-win-x64.zip`.
3. Compare its SHA-256 digest with `SHA256SUMS.txt` in the same release.
4. Extract the ZIP into its own folder.
5. Run `Codex Switcher Local.exe`.

The current test build is not signed with a Windows code-signing certificate, so SmartScreen may display a warning. Do not disable Microsoft Defender. For maximum assurance, build the app from source or wait for a signed release.

## Run from source

Install Node.js 22+, Corepack, pnpm 11, and Git, then run:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run prepare:codex
pnpm run check
pnpm start
```

Enter your password and two-factor authentication code only on the official OpenAI page. Never share `auth.json`, the app data directory, OAuth tokens, QR codes, or your 2FA secret.
