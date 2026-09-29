import { beforeAll, describe, it, expect } from 'vitest';
import { register, authenticate, newSession, userFromToken, endSession, rateLimit } from '../src/lib/auth';
import { createProject, getProject, saveProject, versions, listProjects } from '../src/lib/repository';
import { query } from '../src/lib/db';
import { enqueue, claimJob, finishJob } from '../src/lib/jobs';
let a: string, b: string;
beforeAll(async () => {
  a = (await register('alice@example.test', 'long-enough-password')).id;
  b = (await register('bob@example.test', 'another-strong-password')).id;
});
describe('Persistence and isolation', () => {
  it('does not create a version for semantically identical JSONB data', async () => {
    const p = await createProject(a, 'Same document', 'quantitative');
    const saved = await saveProject(a, p.id, 1, p.document);
    expect(saved.project.revision).toBe(1);
    expect(await versions(a, p.id)).toHaveLength(1);
  });
  it('hashes passwords and opaque sessions and supports revocation', async () => {
    await expect(authenticate('alice@example.test', 'wrong-password')).rejects.toMatchObject({
      status: 401
    });
    expect((await authenticate('alice@example.test', 'long-enough-password')).id).toBe(a);
    const token = await newSession(a);
    expect((await userFromToken(token))?.id).toBe(a);
    const row = (await query<{
      token_hash: string;
    }>('SELECT token_hash FROM sessions WHERE user_id=$1', [a])).rows[0];
    expect(row.token_hash).not.toBe(token);
    await endSession(token);
    expect(await userFromToken(token)).toBe(null);
  });
  it('prevents cross-account reads and writes', async () => {
    const p = await createProject(a, 'Private', 'qualitative');
    await expect(getProject(b, p.id)).rejects.toMatchObject({
      status: 404
    });
    await expect(saveProject(b, p.id, 1, p.document)).rejects.toMatchObject({
      status: 404
    });
    expect(await listProjects(b)).toEqual([]);
  });
  it('commits graph and versions atomically and rejects stale writes', async () => {
    const p = await createProject(a, 'Versioned', 'quantitative');
    const d = structuredClone(p.document);
    d.questions = [{
      id: 'q1',
      text: 'Question'
    }];
    d.objectives = [{
      id: 'o1',
      text: 'Objective',
      questionId: 'q1'
    }];
    const saved = await saveProject(a, p.id, 1, d);
    expect(saved.project.revision).toBe(2);
    await expect(saveProject(a, p.id, 1, {
      ...d,
      topic: 'Conflict'
    })).rejects.toMatchObject({
      status: 409
    });
    expect((await versions(a, p.id)).length).toBe(2);
    expect((await query('SELECT * FROM graph_edges WHERE project_id=$1 AND source=$2 AND target=$3', [p.id, 'q1', 'o1'])).rows).toHaveLength(1);
    expect((await getProject(a, p.id)).document.topic).toBe('');
  });
  it('serializes competing saves so exactly one wins', async () => {
    const p = await createProject(a, 'Concurrent', 'qualitative');
    const outcomes = await Promise.allSettled([saveProject(a, p.id, 1, {
      ...p.document,
      topic: 'A'
    }), saveProject(a, p.id, 1, {
      ...p.document,
      topic: 'B'
    })]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect((await getProject(a, p.id)).revision).toBe(2);
  });
  it('rejects invalid graph without creating a version', async () => {
    const p = await createProject(a, 'Invalid', 'qualitative');
    await expect(saveProject(a, p.id, 1, {
      ...p.document,
      gapPaperIds: ['missing']
    })).rejects.toThrow();
    expect((await versions(a, p.id)).length).toBe(1);
  });
  it('enforces shared database rate limits', async () => {
    await rateLimit('test', 1, 60);
    await expect(rateLimit('test', 1, 60)).rejects.toMatchObject({
      status: 429
    });
  });
  it('deduplicates jobs and respects lease ownership', async () => {
    const id = await enqueue('maintenance', {}, 'unique-test');
    expect(await enqueue('maintenance', {}, 'unique-test')).toBe(id);
    const job = await claimJob();
    expect(job?.id).toBe(id);
    await finishJob({
      ...job!,
      lease_token: 'wrong'
    });
    expect((await query<{
      status: string;
    }>('SELECT status FROM jobs WHERE id=$1', [id])).rows[0].status).toBe('running');
    await finishJob(job!);
    expect(await claimJob()).toBe(null);
  });
});
