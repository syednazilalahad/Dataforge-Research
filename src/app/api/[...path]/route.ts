import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authenticate, register, newSession, sessionCookie, requireUser, endSession, rateLimit } from '@/lib/auth';
import { query } from '@/lib/db';
import { createProject, getProject, listProjects, saveProject, versions } from '@/lib/repository';
import { profileSchema, pathways, health, graph, RULE_VERSION } from '@/lib/domain';
import { provider, aiContext, contextHash, PROMPT_VERSION } from '@/lib/ai';
import { AppError } from '@/lib/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const credentials = z.object({
  email: z.email().max(254).transform(x => x.toLowerCase()),
  password: z.string().min(12).max(128)
});
const revision = z.number().int().positive();
async function body(req: NextRequest) {
  if (Number(req.headers.get('content-length') || 0) > 1000000) throw new AppError(413, 'Request too large.');
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, 'Request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {
      done,
      value
    } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1000000) {
      await reader.cancel();
      throw new AppError(413, 'Request too large.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AppError(400, 'Invalid JSON.');
  }
}
const json = (value: unknown, status = 200) => NextResponse.json(value, {
  status,
  headers: {
    'Cache-Control': 'no-store'
  }
});
function assertOrigin(req: NextRequest) {
  const expected = process.env.APP_ORIGIN || 'http://localhost:3000';
  if (req.headers.get('origin') !== new URL(expected).origin) throw new AppError(403, 'Request origin is not allowed.');
}
async function handle(req: NextRequest, {
  params
}: {
  params: Promise<{
    path: string[];
  }>;
}) {
  try {
    const route = (await params).path;
    const method = req.method;
    if (method !== 'GET') assertOrigin(req);
    if (route[0] === 'health' && method === 'GET') {
      await query('SELECT 1');
      return json({
        status: 'ok',
        version: '0.1.0'
      });
    }
    if (route[0] === 'auth' && ['login', 'register'].includes(route[1]) && method === 'POST') {
      const c = credentials.parse(await body(req));
      await rateLimit(`auth:${c.email}`, 10, 900);
      // Global cap prevents unlimited rotating-email signup; put per-IP limits at a trusted ingress too.
      await rateLimit('auth:global', 300, 900);
      const user = route[1] === 'register' ? await register(c.email, c.password) : await authenticate(c.email, c.password);
      const token = await newSession(user.id);
      const result = json({
        user
      });
      result.cookies.set(sessionCookie, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800
      });
      return result;
    }
    const user = await requireUser();
    if (route[0] === 'auth' && route[1] === 'logout' && method === 'POST') {
      const token = req.cookies.get(sessionCookie)?.value;
      if (token) await endSession(token);
      const result = json({
        ok: true
      });
      result.cookies.delete(sessionCookie);
      return result;
    }
    if (route[0] === 'profile') {
      if (method === 'GET') return json({
        user
      });
      if (method === 'PUT') {
        const profile = profileSchema.parse(await body(req));
        await query('UPDATE users SET profile=$1 WHERE id=$2', [JSON.stringify(profile), user.id]);
        return json({
          user: {
            ...user,
            profile
          }
        });
      }
    }
    if (route[0] === 'projects') {
      const id = route[1];
      if (!id) {
        if (method === 'GET') return json({
          projects: await listProjects(user.id)
        });
        if (method === 'POST') {
          const b = z.object({
            title: z.string().trim().min(1).max(200),
            pathway: z.enum(pathways)
          }).parse(await body(req));
          return json({
            project: await createProject(user.id, b.title, b.pathway)
          }, 201);
        }
      }
      if (id) {
        const p = await getProject(user.id, id);
        if (!route[2]) {
          if (method === 'GET') return json({
            project: p
          });
          if (method === 'PUT') {
            const b = z.object({
              revision,
              document: z.unknown()
            }).parse(await body(req));
            return json(await saveProject(user.id, id, b.revision, b.document));
          }
          if (method === 'PATCH') {
            const b = z.object({
              archived: z.boolean()
            }).parse(await body(req));
            await query('UPDATE projects SET archived=$1,updated_at=now() WHERE id=$2 AND owner_id=$3', [b.archived, id, user.id]);
            return json({
              ok: true
            });
          }
          if (method === 'DELETE') {
            await query('DELETE FROM projects WHERE id=$1 AND owner_id=$2', [id, user.id]);
            return json({
              ok: true
            });
          }
        }
        if (route[2] === 'health' && method === 'GET') return json({
          revision: p.revision,
          ruleVersion: RULE_VERSION,
          findings: health(p.document)
        });
        if (route[2] === 'graph' && method === 'GET') return json(graph(p.document));
        if (route[2] === 'versions' && method === 'GET') return json({
          versions: await versions(user.id, id)
        });
        if (route[2] === 'restore' && method === 'POST') {
          const b = z.object({
            revision,
            targetRevision: revision
          }).parse(await body(req));
          const target = (await query<{
            document: unknown;
          }>('SELECT document FROM project_versions WHERE project_id=$1 AND revision=$2', [id, b.targetRevision])).rows[0];
          if (!target) throw new AppError(404, 'Version not found.');
          return json(await saveProject(user.id, id, b.revision, target.document, `Restored revision ${b.targetRevision}`));
        }
        if (route[2] === 'export' && method === 'GET') {
          const audit = (await query('SELECT * FROM ai_runs WHERE project_id=$1 ORDER BY created_at', [id])).rows;
          return new NextResponse(JSON.stringify({
            exportVersion: 1,
            exportedAt: new Date().toISOString(),
            project: p,
            graph: graph(p.document),
            versions: await versions(user.id, id),
            aiAudit: audit
          }, null, 2), {
            headers: {
              'Content-Type': 'application/json',
              'Content-Disposition': 'attachment; filename="researchforge-project.json"',
              'Cache-Control': 'no-store'
            }
          });
        }
        if (route[2] === 'ai') {
          if (method === 'GET') return json({
            runs: (await query('SELECT id,provider,model,prompt_version,project_revision,context_hash,source_ids,output,status,decision,final_text,created_at,decided_at FROM ai_runs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 30', [id])).rows
          });
          if (method === 'POST') {
            await rateLimit(`ai:${user.id}`, 15, 3600);
            const adapter = provider();
            if (adapter.name !== 'offline' && !user.profile.aiConsent) throw new AppError(403, 'Enable external AI processing in your profile first.');
            const context = aiContext(p.document);
            const runId = randomUUID();
            await query('INSERT INTO ai_runs(id,project_id,actor_id,project_revision,provider,model,prompt_version,context_hash,context,source_ids,output,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [runId, id, user.id, p.revision, adapter.name, adapter.model, PROMPT_VERSION, contextHash(context), JSON.stringify(context), JSON.stringify(context.sources.map(s => s.id)), '{}', 'pending']);
            try {
              const output = await adapter.generate(context);
              await query('UPDATE ai_runs SET output=$1,status=$2 WHERE id=$3', [JSON.stringify(output), 'completed', runId]);
              return json({
                id: runId,
                output,
                provider: adapter.name
              });
            } catch {
              await query('UPDATE ai_runs SET status=$1,output=$2 WHERE id=$3', ['failed', JSON.stringify({
                error: 'Provider request failed or output was invalid.'
              }), runId]);
              throw new AppError(502, 'The provider failed or returned invalid suggestions. Your project is unchanged.');
            }
          }
        }
        if (route[2] === 'ai-decision' && method === 'POST') {
          const b = z.object({
            runId: z.string().uuid(),
            decision: z.enum(['accepted', 'rejected', 'modified']),
            finalText: z.string().max(12000)
          }).parse(await body(req));
          const updated = await query('UPDATE ai_runs SET decision=$1,final_text=$2,decided_at=now() WHERE id=$3 AND project_id=$4 AND status=$5 AND decision IS NULL RETURNING id', [b.decision, b.finalText, b.runId, id, 'completed']);
          if (!updated.rows.length) throw new AppError(409, 'This recommendation is missing or already reviewed.');
          return json({
            ok: true
          });
        }
      }
    }
    throw new AppError(404, 'Endpoint not found.');
  } catch (e) {
    if (e instanceof AppError) return json({
      error: e.message
    }, e.status);
    if (e instanceof z.ZodError) return json({
      error: 'Please check your input.',
      issues: e.issues.map(i => i.message)
    }, 400);
    console.error('Request failed', e instanceof Error ? e.message : 'Unknown error');
    return json({
      error: 'Unable to complete the request. Please try again.'
    }, 500);
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
