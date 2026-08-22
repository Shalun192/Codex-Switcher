# Publishing the project

This folder is divided into two parts:

- source code at the project root, which belongs in the Git repository;
- `release-packages/`, containing ready-to-use builds that must be attached only to a GitHub Release.

`release-packages/`, `node_modules/`, `vendor/`, `dist/`, authorization data, local profiles, `.env` files, and certificates are excluded by `.gitignore`. Do not force-add them with `git add -f`.

## Before every release

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm audit --audit-level high
```

After building, calculate SHA-256 digests and attach `SHA256SUMS.txt` to the release. Upload only files from `release-packages/`, never application data directories.

After publishing a release, update the ready-to-use files and version number on the [download page](https://shalun.online/codex-switcher/) so the website and GitHub show the same current version.

## Recommended GitHub settings

- The primary repository is public and its default branch is `main`.
- Private vulnerability reporting, Dependabot alerts, and Dependabot security updates are enabled.
- Head branches are deleted automatically after merge.
- Actions receive read-only permissions by default and must be pinned to full commit SHAs.
- `main` requires a pull request, successful CI, linear history, resolved conversations, and no force-push or deletion.
- `CODEOWNERS` identifies the project owner for sensitive changes.
- Signing secrets are stored only in GitHub Actions secrets and are never committed.
- Releases are first created as drafts and are published only after files and checksums are reviewed.

Git commits use a GitHub no-reply email so the owner's personal address does not enter public history.
