# Deployment, security and privacy

## Production release procedure
1. Provision private PostgreSQL, backup/PITR, verified database TLS and a secrets manager. Choose region and retention based on institution requirements. Configure `DATABASE_URL`, `APP_ORIGIN=https://your-domain`, AI configuration if desired.
2. Complete the first dependency install, run type checks/tests/build, and commit the generated `pnpm-lock.yaml`. Dependency downloads were unavailable in the initial build environment, so the current Docker/CI recipes bootstrap dependency resolution. Before production, change both to use the committed lockfile and `--frozen-lockfile`, and review dependency advisories. Apply migrations before rolling application traffic. The initial migrator uses an advisory lock; the repository auto-checks migrations on first connection. Because it issues `CREATE TABLE IF NOT EXISTS schema_migrations`, the startup role currently requires schema permission: use a dedicated application schema and bounded migration-capable role, or separate startup migration checking from DDL before deploying a strict DML-only role.
3. Deploy the Next.js Node server or Docker image behind a TLS reverse proxy. Set proxy request body limit to 1 MB and per-IP auth rate limits using a trusted client-IP source. Do not expose PostgreSQL publicly. Set upstream request timeout above 30 seconds for AI requests.
4. Check `/api/health`; create two separate test accounts and verify project isolation, create/edit/restore/export and session logout. Test PostgreSQL backup restoration in staging. Configure alerting for 5xx, database latency, failed AI calls and job failures without logging research text.
5. Run browser tests against staging and perform accessibility, security and domain-expert reviews. v0.1 is suitable for a controlled pilot. Public launch additionally needs password recovery/email verification or institution SSO, abuse protection, terms/privacy policy, retention administration and operational monitoring.

## Authentication and authorization
Passwords use Node scrypt with random 128-bit salts and timing-safe verification. Minimum length is 12; max is 128. Sessions use 256-bit opaque tokens; only SHA-256 digests are stored. Cookies are HttpOnly, SameSite=Lax and Secure in production; sessions expire after seven days and logout revokes them. All project operations, export, versions and AI routes enforce owner identity before data access. SQL is parameterized. Graph foreign keys contain project IDs, preventing cross-project edges.

Database-backed auth throttling limits account attempts and total signup/login volume. Add ingress IP limits for public deployment; the application does not trust arbitrary forwarded IP headers. Password recovery, email verification, MFA and institutional SSO are not implemented. Rate-limit and expired-session rows should be pruned by scheduled maintenance. Avoid making claims that accounts are verified identities.

## Browser and request controls
Same-origin enforcement applies to every mutation, including login. Requests are streamed with a byte cap and validated by Zod. React escapes rendered strings; rich HTML and arbitrary uploads are not accepted. CSP restricts connections/resources to self and disables embedding; Next's current rendering requires inline scripts/styles in this implementation. A nonce-based CSP is a further hardening task. Frame, MIME-sniffing, referrer and permissions headers are configured. Add HSTS at the HTTPS ingress after verifying subdomain policy.

## Data privacy
Do not store raw participant records in v0.1. Research drafts, profile fields, literature notes, AI context snapshots and immutable project versions can contain confidential intellectual work. Encrypt database volumes/backups, keep keys separate, restrict support/admin access and define retention. AI calls include topic/context/problem/gap/question/objective text and literature titles/findings/limitations, never credentials. External processing requires profile consent and is only triggered by an explicit request. Review the provider's retention and data-processing terms before enabling it.

JSON export contains the current project, graph, latest 100 versions and complete AI audit (including recorded context). Treat exported files as confidential. Project deletion cascades versions, graph nodes/edges, AI runs and storage metadata. No file uploads are exposed in v0.1; once added, delete actual object bytes with a reliable outbox job as well. Backups follow the institution's retention window and do not vanish instantly. Account export/deletion orchestration is an operator responsibility in this release; do not claim self-service account erasure.

## AI integrity
Prompts are versioned in code; audit rows record model/provider, context hash and snapshot, source IDs, base project revision, output, status and researcher decision. Untrusted research text is embedded as data. Model outputs must match a bounded schema. Failed requests preserve an audit row and never alter the research aggregate. Recommendations are not citations, ethics approvals, evidence or findings. The v0.1 UI decision and question insertion are separate actions; the audit retains accepted text even if a subsequent project save fails, and history supports recovery. A future combined transaction can bind an accepted suggestion to a created node.

## Persistence, jobs and storage
Local PGlite is single-process, disk-backed development storage. Never use it on an ephemeral host or share its directory with a worker/second web instance. Production uses PostgreSQL; the separate worker refuses to use local storage. The queue uses `FOR UPDATE SKIP LOCKED`, lease tokens, five-minute leases, three attempts and idempotency keys. Handlers must be idempotent; long handlers must add lease renewal before use. Only a maintenance no-op handler exists, since current v0.1 flows need no asynchronous file processing.

The private storage port validates object keys and creates immutable files. No public file-serving path exists. Add an S3-compatible adapter, MIME/size validation, malware scanning, authorization and retention before exposing uploads. SQL storage metadata and graph kinds reserve extension points for reproducible datasets, runs and manuscript assets.

## Known release limitations
- Rule checks detect structural gaps and selected patterns, not full semantic or statistical validity.
- Reporting guideline links provide orientation; no guideline compliance is asserted.
- Autosave versions whole project aggregates, bounded to 200 papers and 100 questions/objectives; larger libraries need pagination and node-level writes.
- Versions UI/export includes latest 100 snapshots, though older versions persist in the database.
- Single-owner access in v0.1; sharing/roles/tenancy must route through an expanded central authorization service.
- The initial SQL migration has no down migration. Back up before future destructive schema changes and use expand/contract migrations.
