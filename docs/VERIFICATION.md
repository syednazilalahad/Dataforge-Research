# Verification record

## Performed on 2026-09-29

| Check | Result | Scope |
|---|---|---|
| TypeScript/TSX syntax transformation | Passed, 35 files | Used the existing bundled Babel TypeScript/React transformer; checks syntax, not types or imports |
| Local import and stylesheet structure checks | Passed | All 39 local source imports resolve; stylesheet braces balance |
| `node scripts/offline-smoke.mjs` | Passed, 12 checks | Executes the actual dependency-free engine functions after Node type stripping; no database/schema/UI dependencies |
| Dependency installation | Blocked | Initial sandbox request failed with EACCES; authorized retries failed with ECONNRESET, socket failures and timeouts |
| Full `pnpm typecheck` | Not run | Requires downloaded dependencies |
| Vitest domain/schema/auth/repository/job tests | Not run | Requires downloaded dependencies |
| `pnpm build` | Not run | Requires downloaded dependencies |
| Playwright browser workflow | Not run | Requires a running built/development application and dependencies |
| PostgreSQL/Docker deployment | Not run | No PostgreSQL/Docker executable detected locally; package download blocked |

The 12 passing smoke checks cover empty-state findings, transitive change impacts, JSON key-order stability, deleted dependencies, review/ML/mixed-method rules, manual citation status, participant ethics safeguards, empty-question roadmap behavior, evidence-link changes and descriptive-only predictive alignment.

## Fixes found during review
- Canonical comparisons prevent PostgreSQL JSONB key ordering from creating spurious versions and impact notices.
- Autosave serializes concurrent callers instead of letting them send duplicate revisions.
- Version restore uses the editor's known revision rather than fetching a revision to bypass concurrency checks.
- PGlite's in-memory test path maps to an actual in-memory instance.
- Standalone TypeScript scripts use ESM package mode to support top-level await.

## Required follow-up verification
On a machine with registry access: install dependencies, commit `pnpm-lock.yaml`, run typecheck/tests/build, install Playwright Chromium, and run browser tests. Repeat security/concurrency integration checks against a real PostgreSQL staging database. Resolve all failures before deployment; a syntax check is not a passing application build. Docker and CI need frozen-lockfile installs after the first verified dependency resolution.
