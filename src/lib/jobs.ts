import { randomUUID } from 'node:crypto';
import { database, query } from './db';
export type Job = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
  lease_token: string;
};
export async function enqueue(kind: string, payload: Record<string, unknown>, idempotencyKey: string) {
  return (await query<{
    id: string;
  }>('INSERT INTO jobs(id,kind,payload,idempotency_key) VALUES($1,$2,$3,$4) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id', [randomUUID(), kind, JSON.stringify(payload), idempotencyKey])).rows[0].id;
}
export async function claimJob() {
  return (await database()).transaction(async tx => {
    const job = (await tx.query<Job>("SELECT * FROM jobs WHERE (status='pending' AND available_at<=now()) OR (status='running' AND locked_until<now()) ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];
    if (!job) return null;
    return (await tx.query<Job>("UPDATE jobs SET status='running',attempts=attempts+1,lease_token=$2,locked_until=now()+interval '5 minutes' WHERE id=$1 RETURNING *", [job.id, randomUUID()])).rows[0];
  });
}
export async function finishJob(job: Job, error?: string) {
  if (error) await query("UPDATE jobs SET status=$3,error=$4,available_at=now()+interval '1 minute',locked_until=NULL WHERE id=$1 AND lease_token=$2", [job.id, job.lease_token, job.attempts >= 3 ? 'failed' : 'pending', error.slice(0, 1000)]);else await query("UPDATE jobs SET status='completed',locked_until=NULL WHERE id=$1 AND lease_token=$2", [job.id, job.lease_token]);
}
