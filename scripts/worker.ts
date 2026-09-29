import { claimJob, finishJob } from '../src/lib/jobs';
if (!process.env.DATABASE_URL) throw new Error('The standalone worker requires PostgreSQL; do not share a PGlite directory across processes.');
let running = true;
process.on('SIGTERM', () => {
  running = false;
});
while (running) {
  const job = await claimJob();
  if (job) {
    try {
      if (job.kind !== 'maintenance') throw new Error('No registered handler for this job kind.');
      await finishJob(job);
    } catch (e) {
      await finishJob(job, (e as Error).message);
    }
  } else await new Promise(r => setTimeout(r, 3000));
}
process.exit(0);
