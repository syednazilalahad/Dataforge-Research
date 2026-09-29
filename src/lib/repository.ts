import { randomUUID } from 'node:crypto';
import { database, query, type Connection } from './db';
import { emptyProject, graph, changeImpact, projectSchema, stableStringify, type Project, type ProjectDocument, type Pathway } from './domain';
import { AppError } from './errors';
export async function getProject(userId: string, id: string) {
  const {
    rows
  } = await query<Project>('SELECT * FROM projects WHERE id=$1 AND owner_id=$2', [id, userId]);
  if (!rows[0]) throw new AppError(404, 'Project not found.');
  return rows[0];
}
export async function listProjects(userId: string) {
  return (await query<Project>('SELECT * FROM projects WHERE owner_id=$1 ORDER BY updated_at DESC', [userId])).rows;
}
async function projectGraph(tx: Connection, p: Project) {
  const g = graph(p.document);
  // Only v0.1-owned kinds are replaced; future engine objects are retained.
  const ids = g.nodes.map(n => n.id);
  await tx.query("DELETE FROM graph_nodes WHERE project_id=$1 AND kind IN ('topic','gap','question','objective','paper','methodology') AND NOT(id=ANY($2::text[]))", [p.id, ids]);
  for (const n of g.nodes) await tx.query('INSERT INTO graph_nodes(project_id,id,kind,data,revision) VALUES($1,$2,$3,$4,$5) ON CONFLICT(project_id,id) DO UPDATE SET data=EXCLUDED.data,revision=EXCLUDED.revision', [p.id, n.id, n.kind, JSON.stringify(n.data), p.revision]);
  await tx.query("DELETE FROM graph_edges WHERE project_id=$1 AND source=ANY($2::text[]) AND target=ANY($2::text[]) AND relation IN ('informs','answers','supports')", [p.id, ids]);
  for (const e of g.edges) await tx.query('INSERT INTO graph_edges(project_id,source,target,relation) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [p.id, e.source, e.target, e.relation]);
}
export async function createProject(userId: string, title: string, pathway: Pathway) {
  const document = projectSchema.parse(emptyProject(title, pathway));
  return (await database()).transaction(async tx => {
    const p = (await tx.query<Project>('INSERT INTO projects(id,owner_id,title,pathway,document) VALUES($1,$2,$3,$4,$5) RETURNING *', [randomUUID(), userId, title, pathway, JSON.stringify(document)])).rows[0];
    await projectGraph(tx, p);
    await tx.query('INSERT INTO project_versions(project_id,revision,document,impact,actor_id,reason) VALUES($1,1,$2,$3,$4,$5)', [p.id, JSON.stringify(document), JSON.stringify({
      changed: ['topic'],
      impacted: []
    }), userId, 'Project created']);
    return p;
  });
}
export async function saveProject(userId: string, id: string, expected: number, raw: unknown, reason = 'Workspace saved') {
  const document = projectSchema.parse(raw);
  return (await database()).transaction(tx => saveProjectTransaction(tx, userId, id, expected, document, reason));
}
export async function saveProjectTransaction(tx: Connection, userId: string, id: string, expected: number, document: ProjectDocument, reason: string) {
  const old = (await tx.query<Project>('SELECT * FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE', [id, userId])).rows[0];
  if (!old) throw new AppError(404, 'Project not found.');
  if (old.revision !== expected) throw new AppError(409, 'This project changed in another session. Reload the latest version before saving.');
  if (stableStringify(old.document) === stableStringify(document)) return {
    project: old,
    impact: {
      changed: [],
      impacted: []
    }
  };
  const impact = changeImpact(old.document, document);
  const p = (await tx.query<Project>('UPDATE projects SET document=$1,title=$2,pathway=$3,revision=revision+1,updated_at=now() WHERE id=$4 AND owner_id=$5 AND revision=$6 RETURNING *', [JSON.stringify(document), document.title, document.pathway, id, userId, expected])).rows[0];
  await projectGraph(tx, p);
  await tx.query('INSERT INTO project_versions(project_id,revision,document,impact,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6)', [id, p.revision, JSON.stringify(document), JSON.stringify(impact), userId, reason]);
  return {
    project: p,
    impact
  };
}
export async function versions(userId: string, id: string) {
  await getProject(userId, id);
  return (await query<{
    revision: number;
    document: ProjectDocument;
    impact: {
      changed: string[];
      impacted: string[];
    };
    created_at: string;
    reason: string;
  }>('SELECT revision,document,impact,created_at,reason FROM project_versions WHERE project_id=$1 ORDER BY revision DESC LIMIT 100', [id])).rows;
}
