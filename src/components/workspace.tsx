'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, GitBranch, History, Lightbulb, Plus, ShieldCheck, Sparkles, Trash2, BookOpen, ListChecks, Route, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Project, type ProjectDocument, type Profile, type Paper, type Pathway, labels, pathways, emptyPaper, health, roadmap, lessons, graph, RULE_VERSION } from '@/lib/domain';
import { useProject } from './use-project';
import { AIReview } from './ai-review';
type Tab = 'idea' | 'questions' | 'literature' | 'methodology' | 'health' | 'roadmap' | 'graph' | 'history';
const tabs: {
  id: Tab;
  label: string;
  icon: typeof Lightbulb;
}[] = [{
  id: 'idea',
  label: 'Idea Lab',
  icon: Lightbulb
}, {
  id: 'questions',
  label: 'Questions & objectives',
  icon: ListChecks
}, {
  id: 'literature',
  label: 'Literature matrix',
  icon: BookOpen
}, {
  id: 'methodology',
  label: 'Methodology',
  icon: GitBranch
}, {
  id: 'health',
  label: 'Health Check',
  icon: ShieldCheck
}, {
  id: 'roadmap',
  label: 'Roadmap',
  icon: Route
}, {
  id: 'graph',
  label: 'Project connections',
  icon: GitBranch
}, {
  id: 'history',
  label: 'Version history',
  icon: History
}];
export function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
  short = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  short?: boolean;
}) {
  return <label>{label}{short ? <input value={value} maxLength={200} placeholder={placeholder} onChange={e => onChange(e.target.value)} /> : <textarea value={value} maxLength={12000} placeholder={placeholder} onChange={e => onChange(e.target.value)} rows={3} />} {hint && <small className="field-hint">{hint}</small>}</label>;
}
type Version = {
  revision: number;
  reason: string;
  created_at: string;
  impact: {
    changed: string[];
    impacted: string[];
  };
};
export function Workspace({
  initial,
  mode
}: {
  initial: Project;
  mode: Profile['mode'];
}) {
  const state = useProject(initial);
  const {
    document: p,
    setDocument: set,
    revision,
    status,
    error,
    impact,
    save,
    replace
  } = state;
  const [tab, setTab] = useState<Tab>('idea');
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [history, setHistory] = useState<Version[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const findings = health(p);
  const steps = roadmap(p);
  const completed = steps.filter(s => s.done).length;
  const update = <K extends keyof ProjectDocument,>(key: K, value: ProjectDocument[K]) => set(prev => ({
    ...prev,
    [key]: value
  }));
  const method = (key: keyof ProjectDocument['methodology'], value: string | boolean) => set(prev => ({
    ...prev,
    methodology: {
      ...prev.methodology,
      [key]: value
    }
  }));
  async function switchTab(next: Tab) {
    setTab(next);
    if (next === 'history') {
      try {
        if (!(await save())) return;
        const r = await fetch(`/api/projects/${initial.id}/versions`);
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setHistory(b.versions);
      } catch (e) {
        setMessage((e as Error).message);
      }
    }
  }
  function downloadDraft() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], {
      type: 'application/json'
    }));
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'researchforge-unsaved-draft.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return <main className="page workspace-page"><Link className="back-link" href="/dashboard"><ArrowLeft size={14} /> All projects</Link><div className="page-heading"><div><div className="row"><span className="pill">{labels[p.pathway]}</span><span className="muted small">RESEARCH PLANNER</span></div><h1 className="project-title">{p.title}</h1><div className="row small muted"><span className={`dot ${error ? 'warning' : ''}`} /><span role="status">{status}</span><span>·</span><span>Revision {revision}</span></div></div><button className="btn secondary" onClick={async () => {
        if (await save()) window.location.href = `/api/projects/${initial.id}/export`;
      }}><Download size={16} /> Export project</button></div>
 {error && <div className="alert error" role="alert"><strong>{error}</strong><div className="row"><button className="text-button" onClick={() => void save()}>Retry save</button><button className="text-button" onClick={downloadDraft}>Download my draft</button><button className="text-button" onClick={async () => {
          if (!confirm('Reload the server version? Download your draft first to keep unsaved changes.')) return;
          const r = await fetch(`/api/projects/${initial.id}`);
          if (r.ok) replace((await r.json()).project);
        }}>Reload latest</button></div></div>}
 {impact.length > 0 && <div className="alert"><GitBranch size={17} /><span>Your change may affect <strong>{impact.map(id => id === 'methodology' ? 'Methodology' : p.objectives.find(o => o.id === id)?.text || p.questions.find(q => q.id === id)?.text || id).join(', ')}</strong>. Review these connections.</span></div>}
 {message && <div className="alert" role="status">{message}<button className="icon-button" aria-label="Dismiss" onClick={() => setMessage('')}><X size={15} /></button></div>}
 <div className="workspace-grid"><aside className="project-nav"><div className="project-progress"><div className="row between"><strong>Your planning journey</strong><span>{completed}/{steps.length}</span></div><div className="progress"><i style={{
              width: `${completed / steps.length * 100}%`
            }} /></div></div>{tabs.map(t => <button key={t.id} className={`project-nav-item ${tab === t.id ? 'selected' : ''}`} onClick={() => void switchTab(t.id)}><t.icon size={17} />{t.label}{t.id === 'health' && findings.filter(f => f.severity === 'critical').length > 0 && <span className="nav-count">{findings.filter(f => f.severity === 'critical').length}</span>}</button>)}<div className="nav-footer">Connected by design.<br />Every decision has a place.</div></aside>
 <div className="workspace-content">
 {mode !== 'researcher' && lessons[tab] && <aside className="learning-note"><span className="learning-icon"><Lightbulb size={20} /></span><div><div className="eyebrow">{mode === 'learn' ? 'RESEARCH, EXPLAINED' : 'A MOMENT OF GUIDANCE'}</div><strong>{lessons[tab].title}</strong><p>{lessons[tab].body}</p>{mode === 'learn' && <p className="learn-extra">Try this: explain this stage to someone outside your field. If the purpose is difficult to describe, narrow your scope before adding more detail.</p>}</div></aside>}
 {tab === 'idea' && <><section className="panel"><div className="section-heading"><div><span className="eyebrow">01 / EXPLORE</span><h2>Give your curiosity a direction.</h2><p className="muted">Start broad. Then make the problem specific.</p></div><Lightbulb className="section-icon" size={26} /></div><Field label="Working title" short value={p.title} onChange={v => update('title', v)} /><div className="form-grid"><Field label="Research topic" value={p.topic} onChange={v => update('topic', v)} placeholder="e.g. Trust in generative AI" /><Field label="Context & scope" value={p.context} onChange={v => update('context', v)} placeholder="Who, where, and under what conditions?" /></div><Field label="Problem statement" value={p.problem} onChange={v => update('problem', v)} placeholder="What is happening, why does it matter, and who is affected?" /><Field label="Proposed research gap" value={p.gap} onChange={v => update('gap', v)} hint="A proposal to evaluate against the literature, not a novelty claim." /><Field label="Search keywords" value={p.keywords} onChange={v => update('keywords', v)} placeholder="Concepts, synonyms, and related terms" /><label>Research pathway<select value={p.pathway} onChange={e => update('pathway', e.target.value as Pathway)}>{pathways.map(x => <option key={x} value={x}>{labels[x]}</option>)}</select><small className="field-hint">Changing pathways adapts your roadmap and validation rules. Review the methodology afterwards.</small></label>{p.papers.length > 0 && <fieldset><legend>Literature informing your gap</legend>{p.papers.map(paper => <label className="checkbox" key={paper.id}><input type="checkbox" checked={p.gapPaperIds.includes(paper.id)} onChange={e => update('gapPaperIds', e.target.checked ? [...p.gapPaperIds, paper.id] : p.gapPaperIds.filter(id => id !== paper.id))} />{paper.title || 'Untitled paper'}</label>)}</fieldset>}</section><AIReview projectId={initial.id} save={save} onAddQuestion={text => set(prev => ({
            ...prev,
            questions: [...prev.questions, {
              id: crypto.randomUUID(),
              text
            }]
          }))} /></>}
 {tab === 'questions' && <section className="panel"><span className="eyebrow">02 / CONNECT</span><h2>What do you want to find out?</h2><p className="muted">Link each objective to the question it will help answer.</p><div className="section-heading"><h3>Research questions</h3><button className="btn secondary" onClick={() => update('questions', [...p.questions, {
              id: crypto.randomUUID(),
              text: ''
            }])}><Plus size={15} /> Add question</button></div>{!p.questions.length && <div className="empty-state">Your first question belongs here. Keep it focused and answerable.</div>}{p.questions.map((q, i) => <div key={q.id} className="linked-item"><span className="item-index">RQ{i + 1}</span><Field label={`Research question ${i + 1}`} value={q.text} onChange={v => update('questions', p.questions.map(x => x.id === q.id ? {
              ...x,
              text: v
            } : x))} /><button aria-label={`Remove question ${i + 1}`} className="icon-button danger" onClick={() => set(prev => ({
              ...prev,
              questions: prev.questions.filter(x => x.id !== q.id),
              objectives: prev.objectives.map(o => o.questionId === q.id ? {
                ...o,
                questionId: ''
              } : o)
            }))}><Trash2 size={16} /></button></div>)}<div className="section-heading divider"><h3>Research objectives</h3><button className="btn secondary" onClick={() => update('objectives', [...p.objectives, {
              id: crypto.randomUUID(),
              text: '',
              questionId: p.questions[0]?.id || ''
            }])}><Plus size={15} /> Add objective</button></div>{p.objectives.map((o, i) => <div key={o.id} className="objective-item"><div className="linked-item"><span className="item-index">O{i + 1}</span><Field label={`Objective ${i + 1}`} value={o.text} onChange={v => update('objectives', p.objectives.map(x => x.id === o.id ? {
                ...x,
                text: v
              } : x))} /><button className="icon-button danger" aria-label={`Remove objective ${i + 1}`} onClick={() => update('objectives', p.objectives.filter(x => x.id !== o.id))}><Trash2 size={16} /></button></div><label className="objective-link">Answers<select value={o.questionId} onChange={e => update('objectives', p.objectives.map(x => x.id === o.id ? {
                ...x,
                questionId: e.target.value
              } : x))}><option value="">Select a research question</option>{p.questions.map((q, n) => <option key={q.id} value={q.id}>RQ{n + 1}: {q.text.slice(0, 100) || 'Untitled'}</option>)}</select></label></div>)}</section>}
 {tab === 'literature' && <section className="panel"><div className="section-heading"><div><span className="eyebrow">03 / GATHER EVIDENCE</span><h2>Your literature, in perspective.</h2></div><button className="btn primary" onClick={() => setEditingPaper(emptyPaper(crypto.randomUUID()))}><Plus size={15} /> Add paper</button></div><p className="muted">Compare studies side by side. Manually entered citations remain unverified.</p>{!p.papers.length ? <div className="empty-state"><BookOpen size={28} /><h3>Start with one relevant paper.</h3><p>Capture what it found, how it worked, and what it left unanswered.</p></div> : <div className="table-scroll"><table><thead><tr>{['Paper / author / year', 'Context & sample', 'Method / variables', 'Findings', 'Limitations / gap', ''].map((x, i) => <th key={i}>{x}</th>)}</tr></thead><tbody>{p.papers.map(paper => <tr key={paper.id}><td><strong>{paper.title || 'Untitled paper'}</strong><small>{paper.authors} · {paper.year}</small><span className="verification">Unverified</span>{paper.doi && <small>DOI: {paper.doi}</small>}</td><td>{paper.country}<small>{paper.sample}</small></td><td>{paper.method}<small>{paper.variables}</small></td><td>{paper.findings || '—'}</td><td>{paper.limitations}<small>{paper.gap}</small></td><td><button className="text-button" onClick={() => setEditingPaper({
                      ...paper
                    })}>Edit</button><button aria-label={`Remove ${paper.title}`} className="icon-button danger" onClick={() => {
                      if (confirm('Remove this paper and its gap link? Prior versions retain it.')) set(prev => ({
                        ...prev,
                        papers: prev.papers.filter(x => x.id !== paper.id),
                        gapPaperIds: prev.gapPaperIds.filter(id => id !== paper.id)
                      }));
                    }}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}</section>}
 {tab === 'methodology' && <section className="panel"><span className="eyebrow">04 / DESIGN</span><h2>A method with a reason.</h2><p className="muted">Your {labels[p.pathway].toLowerCase()} plan should explain how you will answer your questions.</p><Field label="Research design & rationale" value={p.methodology.design} onChange={v => method('design', v)} placeholder="Name the design and justify its fit with your questions." />{p.pathway === 'systematic_review' ? <><Field label="Search strategy" value={p.methodology.searchStrategy} onChange={v => method('searchStrategy', v)} placeholder="Databases, search strings, coverage dates, and search documentation" /><Field label="Eligibility & appraisal" value={p.methodology.eligibility} onChange={v => method('eligibility', v)} placeholder="Inclusion/exclusion criteria, screening process, quality assessment" /></> : <><div className="form-grid"><Field label={p.pathway === 'machine_learning' ? 'Dataset & target population' : 'Population & setting'} value={p.methodology.population} onChange={v => method('population', v)} /><Field label={p.pathway === 'machine_learning' ? 'Dataset selection' : 'Sampling approach'} value={p.methodology.sampling} onChange={v => method('sampling', v)} /></div><Field label="Sample / data size justification" value={p.methodology.sampleJustification} onChange={v => method('sampleJustification', v)} hint="Explain your rationale; a universal sample size cannot be inferred from a pathway." /></>}<Field label={p.pathway === 'qualitative' ? 'Key concepts & researcher reflexivity' : 'Variables, constructs & operational definitions'} value={p.methodology.constructs} onChange={v => method('constructs', v)} /><Field label={p.pathway === 'systematic_review' ? 'Data extraction plan' : 'Data collection / preparation'} value={p.methodology.collection} onChange={v => method('collection', v)} /><Field label={p.pathway === 'mixed_methods' ? 'Analysis & integration plan' : p.pathway === 'systematic_review' ? 'Synthesis plan' : 'Analysis plan'} value={p.methodology.analysis} onChange={v => method('analysis', v)} />{p.pathway === 'machine_learning' && <Field label="Validation, baselines & leakage controls" value={p.methodology.validation} onChange={v => method('validation', v)} placeholder="Split strategy, held-out evaluation, metrics, preprocessing boundaries and baselines" />}<div className="divider"><h3>Ethics & integrity preparation</h3><label className="checkbox"><input type="checkbox" checked={p.methodology.humanParticipants} onChange={e => method('humanParticipants', e.target.checked)} />Involves human participants</label><label className="checkbox"><input type="checkbox" checked={p.methodology.sensitiveData} onChange={e => method('sensitiveData', e.target.checked)} />Involves personal or sensitive information</label><Field label="Safeguards & review requirements" value={p.methodology.ethics} onChange={v => method('ethics', v)} placeholder="Institutional review, consent, privacy, data access permissions, retention and AI disclosure" /><p className="muted small">This is preparation, not ethical approval. Check institutional and discipline-specific requirements before data collection.</p></div><div className="standards-note"><strong>Reporting standards orientation</strong><p>Choose a guideline for your actual study design and discipline. Pathway selection alone cannot establish which standard applies.</p><a href="https://www.equator-network.org/" target="_blank" rel="noreferrer">Explore EQUATOR reporting guidance ↗</a><span> · </span><a href="https://publicationethics.org/" target="_blank" rel="noreferrer">Publication ethics resources ↗</a><p className="small">Health-focused standards do not cover every discipline. Full versioned reporting checklists are planned for later releases.</p></div></section>}
 {tab === 'health' && <section className="panel"><div className="section-heading"><div><span className="eyebrow">05 / REFLECT & REFINE</span><h2>Research Health Check</h2><p className="muted">A clearer view of what needs attention.</p></div><ShieldCheck size={32} className="section-icon" /></div><div className="health-summary"><strong>{findings.filter(f => f.severity === 'critical').length}</strong><span>priority checks</span><strong>{findings.filter(f => f.severity === 'concern').length}</strong><span>methodological concerns</span></div><p className="muted small">Rules {RULE_VERSION} · Evaluated against the current editor contents. Checks are structural review aids, not scientific validation.</p>{!findings.length && <div className="alert">No current rule findings. Expert review is still required.</div>}{findings.map(f => <article key={f.id} className={`finding ${f.severity}`}><div className="row between"><span className="severity">{f.severity === 'concern' ? 'Methodological concern' : f.severity}</span><button className="text-button" onClick={() => setTab(f.nodeId === 'methodology' ? 'methodology' : f.id === 'literature' || f.id === 'citations' ? 'literature' : p.questions.some(q => q.id === f.nodeId) || p.objectives.some(o => o.id === f.nodeId) ? 'questions' : 'idea')}>Review <ArrowRight size={13} /></button></div><h3>{f.title}</h3><p>{f.detail}</p><div className="finding-action"><strong>Next step</strong> {f.action}</div></article>)}</section>}
 {tab === 'roadmap' && <section className="panel"><span className="eyebrow">YOUR ADAPTIVE ROADMAP</span><h2>One step, connected to the next.</h2><p className="muted">Adapted for {labels[p.pathway].toLowerCase()} research. Completion reflects recorded planning information.</p>{steps.map((step, i) => <button key={i} className="roadmap-step" onClick={() => setTab(step.id as Tab)}><span className={`step-circle ${step.done ? 'done' : ''}`}>{step.done ? <Check size={18} /> : i + 1}</span><span><strong>{step.label}</strong><small>{step.description}</small></span><ChevronRight size={18} /></button>)}<div className="future-note"><span className="pill">BEYOND THE PLANNER</span><h3>A foundation for the full journey.</h3><p>Evidence and protocols → Research execution → Manuscript and publication.</p><small>These later stages are planned releases. Your structured project provides their foundation.</small></div></section>}
 {tab === 'graph' && <section className="panel"><span className="eyebrow">THE PROJECT GRAPH</span><h2>See what connects.</h2><p className="muted">These relationships drive traceability and change-impact notices.</p><div className="graph-overview"><div>Topic & problem</div><ArrowRight /><div>Evidence-informed gap</div><ArrowRight /><div>Questions</div></div>{p.questions.map((q, i) => <div className="graph-chain" key={q.id}><div><span className="eyebrow">RQ{i + 1}</span><strong>{q.text || 'Unwritten question'}</strong></div><ArrowRight size={18} /><div><span className="eyebrow">LINKED OBJECTIVES</span>{p.objectives.filter(o => o.questionId === q.id).map(o => <p key={o.id}>{o.text || 'Unwritten objective'}</p>)}{!p.objectives.some(o => o.questionId === q.id) && <p className="error-text">No objective linked yet</p>}</div><ArrowRight size={18} /><div><span className="eyebrow">INFORMS</span>Methodology & analysis</div></div>)}<div className="stats compact"><div>{graph(p).nodes.length} research objects</div><div>{graph(p).edges.length} connections</div><div>{p.gapPaperIds.length} gap evidence links</div></div></section>}
 {tab === 'history' && <section className="panel"><span className="eyebrow">A RECORD OF YOUR THINKING</span><h2>Version history</h2><p className="muted">Each saved change creates a recoverable snapshot. Restoring creates a new revision.</p>{history.map(v => <div className="history-row" key={v.revision}><span className="version-badge">v{v.revision}</span><div><strong>{v.reason}</strong><small>{new Date(v.created_at).toLocaleString()}</small><small>{v.impact.changed.length} changed · {v.impact.impacted.length} downstream objects to review</small></div><button className="btn secondary" disabled={busy || v.revision === revision} onClick={async () => {
              if (!confirm(`Restore revision ${v.revision} as a new version?`)) return;
              setBusy(true);
              try {
                if (!(await save())) return;
                const r = await fetch(`/api/projects/${initial.id}/restore`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    revision: state.getRevision(),
                    targetRevision: v.revision
                  })
                });
                const b = await r.json();
                if (!r.ok) throw new Error(b.error);
                replace(b.project);
                await switchTab('history');
                setMessage(`Restored revision ${v.revision}.`);
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}>Restore</button></div>)}<div className="danger-zone"><h3>Delete this project</h3><p>Deletes the project, versions and AI audit records permanently.</p><button className="btn danger" onClick={async () => {
              if (prompt('Type DELETE to permanently delete this project.') !== 'DELETE') return;
              const r = await fetch(`/api/projects/${initial.id}`, {
                method: 'DELETE'
              });
              if (r.ok) {
                router.push('/dashboard');
                router.refresh();
              } else setMessage('Could not delete project.');
            }}>Delete project</button></div></section>}
 </div></div>
 {editingPaper && <div className="modal-backdrop"><section className="modal large" role="dialog" aria-modal="true" aria-labelledby="paper-title"><div className="row between"><h2 id="paper-title">Literature record</h2><button className="icon-button" aria-label="Close paper editor" onClick={() => setEditingPaper(null)}><X /></button></div><form onSubmit={e => {
          e.preventDefault();
          if (!editingPaper.title.trim()) {
            setMessage('Add a paper title.');
            return;
          }
          set(prev => ({
            ...prev,
            papers: prev.papers.some(x => x.id === editingPaper.id) ? prev.papers.map(x => x.id === editingPaper.id ? editingPaper : x) : [...prev.papers, editingPaper]
          }));
          setEditingPaper(null);
        }}><div className="form-grid">{(['title', 'authors', 'year', 'doi', 'country', 'sample', 'method', 'variables', 'findings', 'limitations', 'gap', 'notes'] as const).map(key => <label key={key}>{{
                title: 'Paper title',
                authors: 'Authors',
                year: 'Publication year',
                doi: 'DOI (optional)',
                country: 'Country / context',
                sample: 'Sample',
                method: 'Methodology',
                variables: 'Variables / concepts',
                findings: 'Key findings',
                limitations: 'Limitations',
                gap: 'Unresolved questions',
                notes: 'Your synthesis notes'
              }[key]}{['findings', 'limitations', 'gap', 'notes'].includes(key) ? <textarea rows={3} value={editingPaper[key]} onChange={e => setEditingPaper({
                ...editingPaper,
                [key]: e.target.value
              })} maxLength={12000} /> : <input required={key === 'title'} maxLength={key === 'year' ? 4 : key === 'doi' ? 300 : 12000} pattern={key === 'year' ? '[0-9]{4}' : undefined} value={editingPaper[key]} onChange={e => setEditingPaper({
                ...editingPaper,
                [key]: e.target.value
              })} />}</label>)}</div><p className="muted small">Citation status: unverified. Recording a DOI does not verify a source.</p><button className="btn primary">Save literature record</button></form></section></div>}
 </main>;
}
