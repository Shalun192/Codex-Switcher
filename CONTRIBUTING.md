# Contributing

1. Create a separate branch.
2. Do not add real accounts, tokens, email addresses, IP addresses, private URLs, logs, or packaged applications.
3. Use only obviously fake `example.com` values in tests.
4. Run `pnpm run check` and `pnpm audit --audit-level high`.
5. When changing authorization, IPC, process launch, or file loading, update the tests and `THREAT_MODEL.md`.

A pull request should briefly describe the change, its risk, and the checks performed.
