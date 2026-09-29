import { z } from 'zod';
export const pathways = ['quantitative', 'qualitative', 'systematic_review', 'machine_learning', 'mixed_methods'] as const;
export type Pathway = typeof pathways[number];
export const labels: Record<Pathway, string> = {
  quantitative: 'Quantitative',
  qualitative: 'Qualitative',
  systematic_review: 'Systematic review',
  machine_learning: 'Machine learning',
  mixed_methods: 'Mixed methods'
};
const text = z.string().trim().max(12000);
const id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
export const questionSchema = z.object({
  id,
  text: text
});
export const objectiveSchema = z.object({
  id,
  text: text,
  questionId: z.string().max(80)
});
export const paperSchema = z.object({
  id,
  title: text,
  authors: text,
  year: z.string().max(4).regex(/^(\d{4})?$/),
  doi: z.string().max(300),
  country: text,
  sample: text,
  method: text,
  variables: text,
  findings: text,
  limitations: text,
  gap: text,
  notes: text,
  verification: z.literal('unverified')
});
export const methodologySchema = z.object({
  design: text,
  population: text,
  sampling: text,
  sampleJustification: text,
  constructs: text,
  collection: text,
  analysis: text,
  searchStrategy: text,
  eligibility: text,
  validation: text,
  ethics: text,
  humanParticipants: z.boolean(),
  sensitiveData: z.boolean()
});
export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(1).max(200),
  pathway: z.enum(pathways),
  topic: text,
  context: text,
  problem: text,
  gap: text,
  keywords: text,
  gapPaperIds: z.array(id).max(200),
  questions: z.array(questionSchema).max(100),
  objectives: z.array(objectiveSchema).max(100),
  papers: z.array(paperSchema).max(200),
  methodology: methodologySchema
}).superRefine((p, ctx) => {
  const ids = [...p.questions, ...p.objectives, ...p.papers].map(x => x.id);
  if (new Set(ids).size !== ids.length || ids.some(x => ['topic', 'gap', 'methodology'].includes(x))) ctx.addIssue({
    code: 'custom',
    message: 'Research object IDs must be unique and not reserved.'
  });
  for (const o of p.objectives) if (o.questionId && !p.questions.some(q => q.id === o.questionId)) ctx.addIssue({
    code: 'custom',
    message: 'Objective references an unknown question.'
  });
  if (p.gapPaperIds.some(pid => !p.papers.some(paper => paper.id === pid))) ctx.addIssue({
    code: 'custom',
    message: 'Gap references an unknown paper.'
  });
});
export type ProjectDocument = z.infer<typeof projectSchema>;
export type Paper = z.infer<typeof paperSchema>;
export type Project = {
  id: string;
  owner_id: string;
  title: string;
  pathway: Pathway;
  document: ProjectDocument;
  revision: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type Profile = {
  name: string;
  field: string;
  level: string;
  experience: string;
  interests: string;
  tools: string;
  mode: 'learn' | 'guided' | 'researcher';
  aiConsent: boolean;
};
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  field: z.string().max(200),
  level: z.string().max(100),
  experience: z.string().max(100),
  interests: z.string().max(2000),
  tools: z.string().max(1000),
  mode: z.enum(['learn', 'guided', 'researcher']),
  aiConsent: z.boolean()
});
export function emptyProject(title: string, pathway: Pathway): ProjectDocument {
  return {
    schemaVersion: 1,
    title,
    pathway,
    topic: '',
    context: '',
    problem: '',
    gap: '',
    keywords: '',
    gapPaperIds: [],
    questions: [],
    objectives: [],
    papers: [],
    methodology: {
      design: '',
      population: '',
      sampling: '',
      sampleJustification: '',
      constructs: '',
      collection: '',
      analysis: '',
      searchStrategy: '',
      eligibility: '',
      validation: '',
      ethics: '',
      humanParticipants: false,
      sensitiveData: false
    }
  };
}
export function emptyPaper(id: string): Paper {
  return {
    id,
    title: '',
    authors: '',
    year: '',
    doi: '',
    country: '',
    sample: '',
    method: '',
    variables: '',
    findings: '',
    limitations: '',
    gap: '',
    notes: '',
    verification: 'unverified'
  };
}
export type GraphNode = {
  id: string;
  kind: string;
  data: Record<string, unknown>;
};
export type GraphEdge = {
  source: string;
  target: string;
  relation: string;
};
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function graph(p: ProjectDocument): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [{
    id: 'topic',
    kind: 'topic',
    data: {
      topic: p.topic,
      problem: p.problem,
      context: p.context,
      keywords: p.keywords,
      pathway: p.pathway
    }
  }, {
    id: 'gap',
    kind: 'gap',
    data: {
      text: p.gap
    }
  }, {
    id: 'methodology',
    kind: 'methodology',
    data: p.methodology
  }, ...p.questions.map(q => ({
    id: q.id,
    kind: 'question',
    data: q
  })), ...p.objectives.map(o => ({
    id: o.id,
    kind: 'objective',
    data: o
  })), ...p.papers.map(paper => ({
    id: paper.id,
    kind: 'paper',
    data: paper
  }))];
  const edges: GraphEdge[] = [{
    source: 'topic',
    target: 'gap',
    relation: 'informs'
  }, ...p.questions.map(q => ({
    source: 'gap',
    target: q.id,
    relation: 'informs'
  })), ...p.objectives.filter(o => o.questionId).map(o => ({
    source: o.questionId,
    target: o.id,
    relation: 'answers'
  })), ...p.objectives.map(o => ({
    source: o.id,
    target: 'methodology',
    relation: 'informs'
  })), ...p.gapPaperIds.map(pid => ({
    source: pid,
    target: 'gap',
    relation: 'supports'
  }))];
  return {
    nodes,
    edges
  };
}
export function changeImpact(before: ProjectDocument, after: ProjectDocument) {
  const a = graph(before),
    b = graph(after);
  const old = new Map(a.nodes.map(n => [n.id, stableStringify(n)]));
  const changed = new Set(b.nodes.filter(n => old.get(n.id) !== stableStringify(n)).map(n => n.id));
  for (const n of a.nodes) if (!b.nodes.some(x => x.id === n.id)) changed.add(n.id);
  // An edge edit is a dependency change even if the node payload stays the same.
  for (const e of [...a.edges, ...b.edges]) if (!a.edges.some(x => JSON.stringify(x) === JSON.stringify(e)) || !b.edges.some(x => JSON.stringify(x) === JSON.stringify(e))) changed.add(e.target);
  const impacted = new Set<string>();
  const queue = [...changed];
  const visited = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    for (const e of [...a.edges, ...b.edges]) if (e.source === current && !visited.has(e.target)) {
      visited.add(e.target);
      impacted.add(e.target);
      queue.push(e.target);
    }
  }
  return {
    changed: [...changed],
    impacted: [...impacted].filter(x => !changed.has(x))
  };
}
export type Finding = {
  id: string;
  severity: 'critical' | 'concern' | 'clarification' | 'recommendation';
  nodeId: string;
  title: string;
  detail: string;
  action: string;
};
export const RULE_VERSION = 'planner-1.0.0';
export function health(p: ProjectDocument): Finding[] {
  const f: Finding[] = [];
  const add = (id: string, severity: Finding['severity'], nodeId: string, title: string, detail: string, action: string) => f.push({
    id,
    severity,
    nodeId,
    title,
    detail,
    action
  });
  if (!p.problem) add('problem', 'critical', 'topic', 'Define the research problem', 'A topic alone does not explain the problem your study addresses.', 'Describe the unresolved problem and why it matters.');
  if (!p.gap) add('gap', 'clarification', 'gap', 'Explain the proposed gap', 'A gap must be evaluated against existing evidence.', 'Describe what remains unresolved, with supporting literature.');
  if (p.gap && !p.gapPaperIds.length) add('gap-evidence', 'concern', 'gap', 'Your gap needs evidence', 'A geographic absence alone does not establish a worthwhile research gap.', 'Link relevant papers and explain what they leave unresolved.');
  if (!p.questions.some(q => q.text)) add('questions', 'critical', 'topic', 'Add a research question', 'Your project needs at least one answerable question.', 'Write a specific question with a feasible scope.');
  p.questions.forEach(q => {
    if (!q.text) add(`empty-${q.id}`, 'clarification', q.id, 'Finish this question', 'This question is empty.', 'Write the question or remove it.');
    if (!p.objectives.some(o => o.questionId === q.id && o.text)) add(`objective-${q.id}`, 'concern', q.id, 'Question has no linked objective', 'No substantive objective currently addresses this question.', 'Add and link an objective.');
  });
  p.objectives.forEach(o => {
    if (!o.questionId || !o.text) add(`orphan-${o.id}`, 'concern', o.id, 'Complete the objective link', 'An objective needs text and an explicit research question.', 'Complete the objective and select its question.');
  });
  if (!p.papers.length) add('literature', 'concern', 'gap', 'Build an evidence base', 'No papers have been added yet.', 'Record sources and critically compare findings and limitations.');
  if (p.papers.length) add('citations', 'recommendation', 'gap', 'Verify references before use', `${p.papers.length} manually entered reference(s) have not been externally verified.`, 'Check source metadata against the publisher or DOI record.');
  const m = p.methodology;
  if (!m.design) add('design', 'critical', 'methodology', 'Choose and justify a study design', 'A pathway is not a complete research design.', 'State your design and why it can answer the questions.');
  if (!m.analysis) add('analysis', 'concern', 'methodology', 'Specify your analysis plan', 'The plan needs a clear route from observations to answers.', 'Describe analysis steps and relevant assumptions.');
  if (p.pathway === 'systematic_review') {
    if (!m.searchStrategy || !m.eligibility) add('review-protocol', 'concern', 'methodology', 'Define a reproducible review protocol', 'Search strategy and eligibility criteria are needed.', 'Record databases, queries, dates and inclusion/exclusion rules.');
  } else if (p.pathway === 'machine_learning') {
    if (!m.validation) add('ml-validation', 'concern', 'methodology', 'Plan leakage-safe evaluation', 'A model score alone does not establish generalization.', 'Describe data splits, baselines, metrics and leakage controls.');
  } else if (!m.population || !m.sampling || !m.sampleJustification) add('sampling', 'concern', 'methodology', 'Justify population and sampling', 'Sampling decisions should follow the design and feasibility constraints.', 'Describe participants, sampling and sample-size or information-power rationale.');
  if (p.pathway === 'mixed_methods' && !/integrat|triangulat|merg|connect/i.test(m.analysis)) add('integration', 'clarification', 'methodology', 'Explain how the methods connect', 'Mixed methods requires a reasoned integration strategy.', 'Describe where and how qualitative and quantitative findings will be integrated.');
  if (p.questions.some(q => /predict|effect|caus/i.test(q.text)) && /only descriptive|descriptive statistics only/i.test(m.analysis)) add('inferential', 'concern', 'methodology', 'Question and analysis may not align', 'A predictive or causal question is paired with an explicitly descriptive-only plan.', 'Review the estimand, study design and analysis with a methodologist.');
  if (!m.ethics) add('ethics', 'concern', 'methodology', 'Prepare ethics and integrity review', 'Record consent, privacy, permissions and applicable institutional requirements.', 'Add an ethics preparation plan before collecting or accessing data.');
  if ((m.humanParticipants || m.sensitiveData) && !/consent|approval|review|anonym|privacy/i.test(m.ethics)) add('ethics-risk', 'critical', 'methodology', 'Participant or sensitive-data safeguards need review', 'Your risk flags are not accompanied by a recognizable safeguards plan.', 'Discuss institutional review, informed consent and privacy safeguards. This tool does not issue approval.');
  return f;
}
export function roadmap(p: ProjectDocument) {
  const m = p.methodology;
  return [{
    id: 'idea',
    label: 'Frame your research',
    description: 'Narrow a topic into a problem and an evidence-informed gap.',
    done: !!(p.topic && p.problem && p.gap)
  }, {
    id: 'questions',
    label: 'Connect questions & objectives',
    description: 'Make each question answerable and each objective traceable.',
    done: p.questions.length > 0 && p.questions.every(q => q.text && p.objectives.some(o => o.questionId === q.id && o.text))
  }, {
    id: 'literature',
    label: 'Build your literature matrix',
    description: 'Compare findings, limitations and relevance across sources.',
    done: p.papers.length > 0 && p.papers.every(x => x.title && x.findings && x.limitations)
  }, {
    id: 'methodology',
    label: p.pathway === 'systematic_review' ? 'Design your review protocol' : p.pathway === 'machine_learning' ? 'Plan data & evaluation' : 'Design your study',
    description: p.pathway === 'systematic_review' ? 'Define search strategy, eligibility and synthesis.' : p.pathway === 'machine_learning' ? 'Define datasets, baselines and leakage-safe validation.' : 'Justify design, sampling and analysis.',
    done: !!(m.design && m.analysis && (p.pathway === 'systematic_review' ? m.searchStrategy && m.eligibility : p.pathway === 'machine_learning' ? m.validation : m.population && m.sampling && m.sampleJustification))
  }, {
    id: 'methodology',
    label: 'Prepare ethics & integrity',
    description: 'Confirm requirements with your institution before data collection.',
    done: !!m.ethics
  }, {
    id: 'health',
    label: 'Review research alignment',
    description: 'Resolve detected concerns and seek expert review.',
    done: !health(p).some(f => f.severity === 'critical' || f.severity === 'concern')
  }];
}
export const lessons: Record<string, {
  title: string;
  body: string;
}> = {
  idea: {
    title: 'A topic is a starting point. A gap needs evidence.',
    body: 'Move from a broad interest to a population, context and unresolved problem. Compare what existing work establishes and what it cannot yet answer. Fewer papers in one place is a reason to investigate, not proof of novelty.'
  },
  questions: {
    title: 'Make the connections explicit.',
    body: 'A research question asks what you want to learn. An objective states what you will do to answer it. Link them so a change to your question can flag the downstream plan for review.'
  },
  literature: {
    title: 'Synthesize, rather than stack summaries.',
    body: 'Compare studies by design, context, findings and limitations. Record contradictory findings too. Your matrix should help explain the state of knowledge, not just count sources.'
  },
  methodology: {
    title: 'Let the question guide the method.',
    body: 'Explain why this design can answer your question, what evidence you need and how you will interpret it. Specify ethical safeguards and seek institutional review where applicable.'
  },
  health: {
    title: 'A health check is a review aid.',
    body: 'These versioned rules identify omissions and selected inconsistencies. They cannot establish novelty, causal validity, ethical approval or publication readiness.'
  }
};
