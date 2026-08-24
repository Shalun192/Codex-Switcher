# Publishing the project

This folder is divided into two parts:

- source code at the project root, which belongs in the Git repository;
- `release-packages/`, containing ready-to-use builds that must be attached only to a GitHub Release.

`release-packages/`, `node_modules/`, `vendor/`, `dist/`, authorization data, local profiles, `.env` files, and certificates are excluded by `.gitignore`. Do not force-add them with `git add -f`.

## Before every release

Every material update must receive the next version number. Never replace an
already published asset in place: keep the older release as immutable history
and publish new filenames under the new version.

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm audit --audit-level high
node scripts/release-manifest.mjs
```

`release-manifest.mjs` hashes every tracked source file and every file inside
the unpacked macOS and Windows applications. Review and attach the generated
`FILE_MANIFEST_<version>.txt` to the release. After preparing the final release
archives, calculate their SHA-256 digests and attach `SHA256SUMS.txt` too.
Compare both documents with the copies served by the website and GitHub; a
matching version number alone is not a sufficient release check. Upload only
files from `release-packages/`, never application data directories.

After publishing a release, update the ready-to-use files and version number on the [download page](https://shalun.online/codex-switcher/) so the website and GitHub show the same current version.

Publish only these four release assets:

- the universal macOS DMG;
- the Windows x64 ZIP;
- `SHA256SUMS.txt` for those downloadable files and the manifest;
- `FILE_MANIFEST_<version>.txt` for tracked source and unpacked app contents.

GitHub already generates source-code archives. The electron-builder macOS ZIP may be kept locally for testing, but it is not a public release asset.

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
