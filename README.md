# ResearchForge · v0.1 Research Planner

A persistent research lifecycle workspace built from the DFRL researcher proposal. This is a full-stack planner, not a chat interface. See [implementation plan](docs/IMPLEMENTATION_PLAN.md), [architecture](docs/ARCHITECTURE.md), [API contract](docs/API.md), [security and deployment](docs/OPERATIONS.md), and [verification record](docs/VERIFICATION.md).

**Current verification status:** source implementation is complete for the described v0.1 scope, but dependency downloads were blocked by connection resets/timeouts in the build environment. Full type checking, database/browser tests and production build have not run. Twelve dependency-free engine smoke checks and source syntax transformation passed. Do not treat this checkout as deployment-verified until the remaining checks pass. Docker/CI currently bootstrap dependency resolution; generate and commit the lockfile, then enable frozen installs before production.

## What is implemented
- Email/password accounts, revocable sessions, onboarding, three guidance modes and external-AI consent.
- Dashboard, create/search/archive/delete projects, five adaptive research pathways.
- Idea Lab, questions with explicit objective links, editable literature matrix, pathway-aware methodology and ethics preparation.
- Rule-based Health Check, adaptive planning roadmap, project graph view, downstream change impacts.
- Debounced autosave, optimistic concurrency, immutable versions, restore-as-new-version, JSON export including AI audit and recent versions.
- Provider-agnostic AI port, clearly labeled offline planning aid, configurable compatible HTTP provider, output validation, prompt/context provenance and researcher decisions.
- PostgreSQL schema and typed repository, persistent local PGlite option, private storage port and leased job queue foundations.

Full evidence extraction, citation verification, instruments, protocol locks, analysis execution, manuscripts, submission workflow and institutional collaboration are planned v0.2–v1.0 work, not working v0.1 features.

## Run locally
Requires Node.js 22+ and pnpm 10.17.1. Framework requirements are documented by [Next.js](https://nextjs.org/docs/app/getting-started/installation).

```sh
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000, create an account and complete onboarding. No AI key or database server is required locally. The same PostgreSQL schema runs in PGlite and persists to `.data/db`; never open that directory from two processes. Next.js loads `.env.local`. Scripts can load an env file with Node's `--env-file` option:

```sh
node --env-file=.env.local --import tsx scripts/migrate.ts
node --env-file=.env.local --import tsx scripts/seed.ts
```

For PowerShell, use `Copy-Item .env.example .env.local` instead of `cp` if preferred. Stop the web process before migration/seed scripts when using PGlite. The seed requires `SEED_EMAIL` and `SEED_PASSWORD` (12+ characters) and is idempotent per account. Its example literature record is clearly marked fictional; no fake citation is presented as verified.

## Production PostgreSQL
Set `DATABASE_URL` and `APP_ORIGIN` (exact public HTTPS origin). The first database connection applies migration 001 transactionally; concurrent PostgreSQL instances coordinate through an advisory lock. Run migrations with a deployment role before granting only DML access to the web role (see operations notes about automatic startup migration). Production refuses embedded storage unless the explicit local smoke-test override is set.

```sh
pnpm db:migrate
pnpm build
pnpm start
```

Or set `POSTGRES_PASSWORD` to a strong URL-safe value, then `docker compose up --build`. Compose keeps PostgreSQL off the host network and persists its data. Localhost browsers allow Secure cookies on localhost; use HTTPS and a reverse proxy for any remote deployment. Configure a real managed PostgreSQL database with verified TLS for hosted production.

## AI configuration
`AI_PROVIDER=offline` is deterministic guidance with no network calls. For an external provider set `AI_PROVIDER=compatible`, `AI_BASE_URL` (HTTPS URL ending in `/v1`), `AI_MODEL`, and `AI_API_KEY`. The provider must support the chat-completions JSON response contract in `src/lib/ai.ts`. Researchers must explicitly enable external processing in their profile. Requests time out after 30 seconds, model output must pass a schema, and every attempted run has an audit row. The app never auto-verifies citations or auto-writes model output into research fields. A researcher can accept/edit a proposed question and add it explicitly.

## Verification
```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser tests start their own dev server and database at `.data/e2e`; stop any server on port 3000 first. Tests use fresh accounts. Tests cover graph integrity, change impacts, pathway rules, session revocation, account isolation, concurrency, job leasing, model validation and the browser workflow. PostgreSQL deployment smoke tests remain required alongside embedded-database tests.

## Repository map
`src/lib/domain.ts`: typed research aggregate, graph projection, rules, lessons and roadmap.
`src/lib/repository.ts`: ownership-scoped transactional operations and versions.
`src/lib/auth.ts`: password/session/throttle primitives.
`src/lib/ai.ts`: provider port and prompt contract.
`src/app/api/[...path]/route.ts`: authenticated JSON API boundary.
`src/components`: dashboard, workspace, autosave, forms and AI review.
`migrations`: production SQL schema. `tests`, `e2e`: automated validation.

The UI uses reusable CSS primitives in a shadcn-style visual system without coupling the research core to a component library. Graph storage is relational PostgreSQL; a dedicated graph server is unnecessary for the bounded project-level traversal in this release.
