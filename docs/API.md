# HTTP API v0.1

All endpoints are rooted at `/api`. JSON responses use `Cache-Control: no-store`. Authentication is an HttpOnly cookie. All writes require `Origin` equal to `APP_ORIGIN`; JSON bodies are limited to 1 MB. Errors: `{ "error": "message", "issues"?: ["validation message"] }`. Status codes: 400 validation, 401 unauthenticated, 403 origin/consent, 404 absent or inaccessible object, 409 conflict, 413 size, 429 throttle, 502 provider failure.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | /health | none | `{status,version}`; checks DB |
| POST | /auth/register | `{email,password}` | `{user}` and session cookie |
| POST | /auth/login | `{email,password}` | `{user}` and session cookie |
| POST | /auth/logout | none | `{ok:true}`; session revoked |
| GET | /profile | none | `{user:{id,email,profile}}` |
| PUT | /profile | Profile | `{user}` |
| GET | /projects | none | `{projects:Project[]}` |
| POST | /projects | `{title,pathway}` | 201 `{project}` |
| GET | /projects/:id | none | `{project}` |
| PUT | /projects/:id | `{revision,document}` | `{project,impact:{changed,impacted}}` |
| PATCH | /projects/:id | `{archived:boolean}` | `{ok:true}` |
| DELETE | /projects/:id | none | `{ok:true}`; permanent cascade |
| GET | /projects/:id/health | none | `{revision,ruleVersion,findings}` |
| GET | /projects/:id/graph | none | `{nodes,edges}` |
| GET | /projects/:id/versions | none | `{versions}`; newest 100 |
| POST | /projects/:id/restore | `{revision,targetRevision}` | new `{project,impact}` |
| GET | /projects/:id/export | none | downloadable project/graph/recent versions/AI audit JSON |
| GET | /projects/:id/ai | none | `{runs}`; newest 30; no raw context |
| POST | /projects/:id/ai | none | `{id,output,provider}` |
| POST | /projects/:id/ai-decision | `{runId,decision,finalText}` | `{ok:true}`; decision recorded once |

## Core contracts
The executable contracts and TypeScript types are `projectSchema`, `profileSchema`, `ProjectDocument`, `Project`, and `suggestionSchema` in `src/lib`. Unknown document fields are stripped; the schema version is fixed at 1. Node IDs are stable safe strings, unique within the aggregate. Question/objective/paper counts and string lengths are bounded. Objective question IDs and gap paper IDs must reference existing objects in the same project. Citation verification accepts only `unverified` in this release.

Pathways: `quantitative | qualitative | systematic_review | machine_learning | mixed_methods`.
Modes: `learn | guided | researcher`. AI decisions: `accepted | rejected | modified`.

Example save:
```json
{"revision":3,"document":{"schemaVersion":1,"title":"My study","pathway":"qualitative","topic":"Teaching","context":"University","problem":"An unresolved problem","gap":"A proposed gap","keywords":"teaching","gapPaperIds":[],"questions":[{"id":"q-1","text":"How do participants describe this experience?"}],"objectives":[{"id":"o-1","text":"Explore participants' accounts.","questionId":"q-1"}],"papers":[],"methodology":{"design":"Interview study","population":"Teachers","sampling":"Purposive","sampleJustification":"Information power rationale to develop","constructs":"","collection":"Interviews","analysis":"Thematic analysis","searchStrategy":"","eligibility":"","validation":"","ethics":"Institutional review and informed consent planned","humanParticipants":true,"sensitiveData":false}}}
```

Concurrent clients must send the last server revision. A 409 requires explicit reconciliation; never retry with a fetched revision while silently replacing another client's work. Restore creates a new version rather than rewriting history. Identical saves do not create versions. Archive is independent project metadata and does not change the research revision.
