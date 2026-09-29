# ResearchForge implementation plan

## Product contract
ResearchForge is a persistent research lifecycle workspace: AI recommends, evidence supports, rules validate, researchers decide. It does not certify methodological validity, grant ethics approval, or promise publication. This plan incorporates the attached researcher proposal and the referenced Developer conversation.

## Architecture
- **Web**: Next.js App Router, React, strict TypeScript; responsive, accessible workspace with server-authenticated APIs. The browser edits a typed project document; the server owns validation, authorization, version creation and graph projection.
- **Persistence**: PostgreSQL in production; the same SQL migrations and repository run against embedded PGlite for an immediately usable local setup. Parameterized SQL and typed repository form the data-access layer. No browser-only persistence or production mock database.
- **Project Graph**: stable typed nodes and directed edges scoped to a project. Questions, objectives, papers, gap and methodology are linked. A versioned document is the editable aggregate; graph projection and immutable snapshot are committed in one transaction. This deliberate aggregate boundary simplifies conflict detection in v0.1. Later collaboration can move to per-node revisions without changing identifiers.
- **Evidence Engine**: citation provenance is explicit and defaults to unverified. Source, claim, evidence and support/contradiction edge kinds are reserved. v0.1 implements the literature matrix and evidence links for gap justification. Full extraction and external metadata verification belong to v0.2.
- **Alignment Engine**: pure, deterministic versioned rules return severity, affected node IDs, explanation and next action. Research Health Check never treats lack of detected errors as scientific approval. Dependency traversal identifies downstream objects requiring review after changes.
- **Learning Engine**: pathway-specific prompts, contextual lessons and derived roadmap completion; learn/guided/researcher display modes share the same project data.
- **Publication Engine**: explicit future nodes for manuscript sections, submissions and reviewer responses, connected to evidence/results. No paper writer masquerading as v0.1.
- **AI**: provider interface, offline planning provider and configurable compatible HTTP provider; versioned prompts, minimized context, validated outputs, context hashes, source IDs, timestamps, model/provider and accepted/rejected/modified decisions. No silent mutation of project data.
- **Storage/jobs**: object storage port with local private implementation; persistent leased job queue with retries and idempotency keys for future imports/exports. v0.1 has no arbitrary file-upload or code-execution surface.

## Security and consistency
Scrypt password hashing with random salts, opaque random sessions stored only as hashes, HttpOnly SameSite cookies, production Secure cookies, session expiry/revocation, database-backed login throttling, same-origin writes, strict request size/schema validation and project ownership checks. Optimistic concurrency uses integer revisions; stale saves return 409 and never overwrite newer work. Sensitive participant-level data is outside v0.1 scope. No provider secrets reach the browser. Export/delete support user control. Production uses TLS, encrypted backups, a private database and least-privilege credentials.

## Delivery phases and acceptance
1. **Foundation**: plan, schema/migrations, repository, authentication/onboarding, seed and local startup. Acceptance: two accounts cannot read or modify each other's projects; restarting preserves data.
2. **Planner v0.1**: dashboard, project CRUD/archive/export, five pathways, Idea Lab, question/objective links, literature matrix, methodology/ethics preparation, contextual lessons, adaptive roadmap. Acceptance: a researcher can complete a plan without an AI key.
3. **Integrity v0.1**: debounced autosave, revision conflicts, version restore, graph change impacts, Health Check, audited AI suggestions. Acceptance: changes are recoverable; malformed model output cannot become research objects; citations stay unverified.
4. **Release verification**: domain and repository/security integration tests, browser workflow tests, production build, Docker and deployment/security/API documentation. Deployment requires an operator-provided database, domain and secrets. This is production-oriented software, not a claim of completed independent security review.
5. **v0.2 Research Workspace**: claims/evidence provenance, Crossref/OpenAlex adapters, theory and construct graph, instruments, fuller ethics/protocol packs, immutable protocol locks and deviations, decision log, citation verification queue. Accept when evidence provenance and protocol changes are traceable end to end.
6. **v0.3 Research Execution**: datasets/object versions, isolated analysis jobs, software/environment manifests, quantitative/qualitative/ML runs, figures/results provenance. Never execute uploaded code in the web process. Accept when each figure traces to a dataset version, code revision and run.
7. **v1.0 Publication Platform**: manuscript sections tied to evidence/results, versioned reporting packs with domain applicability, journal verification, submissions and reviewer responses, supervisor approvals and comments. Institutional tenancy, SSO, roles, billing and audit retention are separate release gates. ORCID integration requires terms review.

## Extension model
Graph node kinds: topic, gap, question, objective, paper, methodology, claim, evidence, theory, construct, hypothesis, instrument, ethics, protocol, dataset, analysis, result, manuscript, submission, reviewer_response, decision. Edges express answers, supports, contradicts, depends_on, measures, generated_by and cites. Node payloads carry schema versions. Versioned rule packs and pathway definitions are code-reviewed independently from UI. Future organization/member tables can grant project access through one authorization service; never scatter tenant checks across screens.

## Important boundaries
The v0.1 Health Check detects structural omissions and selected conservative design concerns. Semantic research evaluation, statistical suitability, validated reporting checklists and journal verification remain human responsibilities and later engine work. Standards links are orientation aids, not a completed compliance assessment. The local offline assistant is clearly labeled and never pretends to run a model or search papers.
