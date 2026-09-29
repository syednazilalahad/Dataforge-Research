CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL,
 profile jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS projects (
 id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL, pathway text NOT NULL, document jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1, archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_owner_updated ON projects(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS project_versions (
 project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE, revision integer NOT NULL,
 document jsonb NOT NULL, impact jsonb NOT NULL, actor_id text NOT NULL REFERENCES users(id),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,revision)
);
CREATE TABLE IF NOT EXISTS graph_nodes (
 project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE, id text NOT NULL,
 kind text NOT NULL, schema_version integer NOT NULL DEFAULT 1, data jsonb NOT NULL, revision integer NOT NULL,
 PRIMARY KEY(project_id,id)
);
CREATE TABLE IF NOT EXISTS graph_edges (
 project_id text NOT NULL, source text NOT NULL, target text NOT NULL, relation text NOT NULL,
 PRIMARY KEY(project_id,source,target,relation),
 FOREIGN KEY(project_id,source) REFERENCES graph_nodes(project_id,id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,target) REFERENCES graph_nodes(project_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ai_runs (
 id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES users(id), project_revision integer NOT NULL,
 provider text NOT NULL, model text NOT NULL, prompt_version text NOT NULL,
 context_hash text NOT NULL, context jsonb NOT NULL, source_ids jsonb NOT NULL,
 output jsonb NOT NULL, status text NOT NULL, decision text,
 final_text text, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_runs_project ON ai_runs(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS jobs (
 id text PRIMARY KEY, kind text NOT NULL, payload jsonb NOT NULL,
 idempotency_key text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz, lease_token text, error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storage_objects (
 id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 object_key text UNIQUE NOT NULL, content_type text NOT NULL, bytes bigint NOT NULL,
 sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
