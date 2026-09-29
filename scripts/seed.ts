import { register } from '../src/lib/auth';
import { createProject, saveProject } from '../src/lib/repository';
import { query } from '../src/lib/db';
import { emptyPaper } from '../src/lib/domain';
const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
if (!email || !password || password.length < 12) throw new Error('Provide SEED_EMAIL and a SEED_PASSWORD of at least 12 characters.');
const existing = (await query<{
  id: string;
}>('SELECT id FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
if (existing) {
  console.log('Seed account already exists; no data changed.');
  process.exit(0);
}
const user = await register(email, password);
await query('UPDATE users SET profile=$1 WHERE id=$2', [JSON.stringify({
  name: 'Alex Researcher',
  field: 'Education',
  level: 'Master’s',
  experience: 'Beginner',
  interests: 'Technology and learning',
  tools: 'R, Zotero',
  mode: 'guided',
  aiConsent: false
}), user.id]);
const p = await createProject(user.id, 'Trust in generative AI among university students', 'quantitative');
const d = p.document;
d.topic = 'Trust in generative AI';
d.context = 'University students in Bangladesh';
d.problem = 'Students increasingly encounter generative AI tools, but how they assess trust and intended use needs careful investigation.';
d.gap = 'Working hypothesis: local context may influence trust. A literature review is needed before asserting novelty.';
d.keywords = 'generative AI; trust; student adoption; higher education';
d.questions = [{
  id: 'rq-trust',
  text: 'How is perceived trust associated with intended use of generative AI among university students?'
}];
d.objectives = [{
  id: 'obj-trust',
  text: 'Examine the association between perceived trust and intended use.',
  questionId: 'rq-trust'
}];
d.papers = [{
  ...emptyPaper('paper-example'),
  title: 'Illustrative literature record — replace with a real source',
  authors: 'Fictional example (not a citation)',
  year: '',
  method: 'Example survey design',
  findings: 'Use this field to record source-grounded findings.',
  limitations: 'This is synthetic seed content and must not be cited.'
}];
d.methodology.design = 'Proposed cross-sectional survey; association rather than causal inference.';
await saveProject(user.id, p.id, p.revision, d, 'Illustrative seed project');
console.log('Seeded researcher and clearly labeled illustrative project.');
process.exit(0);
