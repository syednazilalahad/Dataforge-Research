'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ArrowUpRight, Search, BookOpen, GitBranch, ArrowRight, Archive, RotateCcw } from 'lucide-react';
import { type Project, type Pathway, pathways, labels, roadmap, health } from '@/lib/domain';
export function Dashboard({
  name,
  initial
}: {
  name: string;
  initial: Project[];
}) {
  const [projects, setProjects] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [pathway, setPathway] = useState<Pathway>('quantitative');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const active = projects.filter(p => !p.archived);
  const papers = active.reduce((s, p) => s + p.document.papers.length, 0);
  const open = active.reduce((s, p) => s + health(p.document).filter(f => f.severity === 'critical').length, 0);
  return <main className="page"><div className="page-heading"><div><div className="eyebrow">A LITTLE CURIOSITY. A LOT OF POSSIBILITY.</div><h1>Welcome back, {name.split(' ')[0]}<span className="green">.</span></h1><p className="muted">Let’s turn your next question into meaningful research.</p></div><button className="btn primary" onClick={() => setCreating(true)}><Plus size={17} />New project</button></div>
 <section className="dashboard-hero"><div><span className="eyebrow light">YOUR IDEAS DESERVE A CLEAR PATH</span><h2>From “what if”<br />to a research plan.</h2><p>Connect your questions, evidence and methods.<br />Build a project you can explain and defend.</p><button className="btn cream" onClick={() => setCreating(true)}>Start your research journey <ArrowRight size={17} /></button></div><div className="hero-diagram" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="diagram-center"><GitBranch size={33} /><span>YOUR<br />RESEARCH</span></div><span className="diagram-label label-a">✧ The idea</span><span className="diagram-label label-b">↗ The evidence</span><span className="diagram-label label-c">✓ The method</span><span className="spark s1">+</span><span className="spark s2">+</span></div></section>
 <div className="stats"><div className="stat"><span>Active projects</span><strong>{String(active.length).padStart(2, '0')}</strong><small>Your questions in progress <GitBranch size={17} /></small></div><div className="stat"><span>Papers in your library</span><strong>{String(papers).padStart(2, '0')}</strong><small>Building your evidence base <BookOpen size={17} /></small></div><div className="stat"><span>Priority checks</span><strong>{String(open).padStart(2, '0')}</strong><small>Next opportunities to strengthen your plan <ArrowUpRight size={17} /></small></div></div>
 <div className="section-heading"><div><h2>Your research projects <span className="count">{projects.filter(p => p.archived === archived).length}</span></h2><p className="muted small">Every good study starts with a question worth asking.</p></div><div className="row"><button className="btn subtle" onClick={() => setArchived(!archived)}>{archived ? 'Show active' : 'Archived'}</button><label className="search"><Search size={16} /><input aria-label="Search projects" placeholder="Find a project…" value={search} onChange={e => setSearch(e.target.value)} /></label></div></div>
 {error && <div className="alert error" role="alert">{error}</div>}<div className="project-grid">{projects.filter(p => p.archived === archived && p.title.toLowerCase().includes(search.toLowerCase())).map(p => {
        const steps = roadmap(p.document);
        const percent = Math.round(steps.filter(s => s.done).length / steps.length * 100);
        return <article className="project-card" key={p.id}><div className="row between"><span className="pill">{labels[p.pathway]}</span><button className="icon-button" aria-label={p.archived ? 'Unarchive project' : 'Archive project'} onClick={async () => {
              try {
                const r = await fetch(`/api/projects/${p.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    archived: !p.archived
                  })
                });
                if (!r.ok) throw new Error('Could not update project.');
                setProjects(projects.map(x => x.id === p.id ? {
                  ...x,
                  archived: !p.archived
                } : x));
              } catch (e) {
                setError((e as Error).message);
              }
            }}>{p.archived ? <RotateCcw size={16} /> : <Archive size={16} />}</button></div><Link href={`/projects/${p.id}`}><h3>{p.title}</h3></Link><p className="project-description">{p.document.problem || 'A new question. An open field of possibilities.'}</p><div className="progress-label"><span>Planning progress</span><strong>{percent}%</strong></div><div className="progress"><i style={{
              width: `${percent}%`
            }} /></div><div className="project-card-footer"><span>{p.document.papers.length} papers · v{p.revision}</span><Link href={`/projects/${p.id}`}>Open workspace <ArrowUpRight size={16} /></Link></div></article>;
      })}<button className="new-project-card" onClick={() => setCreating(true)}><span className="plus-circle"><Plus size={23} /></span><strong>A new question awaits.</strong><span>Create a research project</span></button></div><div className="bottom-note"><span className="dot" /> AI recommends. Evidence supports. Rules validate. <strong>You decide.</strong></div>
 {creating && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="row between"><span className="eyebrow">A NEW BEGINNING</span><button className="icon-button" aria-label="Close" onClick={() => setCreating(false)}>×</button></div><h2 id="create-title">What will you explore?</h2><p className="muted">Start with a working title. Your project can evolve.</p><form onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const r = await fetch('/api/projects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                title,
                pathway
              })
            });
            const b = await r.json();
            if (!r.ok) throw new Error(b.error);
            router.push(`/projects/${b.project.id}`);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}><label>Working title<input autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Trust in AI among university students" /></label><label>Research pathway<select value={pathway} onChange={e => setPathway(e.target.value as Pathway)}>{pathways.map(p => <option key={p} value={p}>{labels[p]}</option>)}</select></label><p className="pathway-hint">{pathway === 'quantitative' ? 'Examine measurable patterns and relationships. Plan your variables, sampling and analysis.' : pathway === 'qualitative' ? 'Explore experiences and meanings. Plan your participants, reflexivity and interpretation.' : pathway === 'systematic_review' ? 'Synthesize existing evidence through a reproducible search and selection process.' : pathway === 'machine_learning' ? 'Evaluate predictive methods with baselines, held-out data and reproducible experiments.' : 'Connect qualitative and quantitative approaches through an explicit integration plan.'}</p>{error && <p className="error-text" role="alert">{error}</p>}<button className="btn primary wide" disabled={busy}>{busy ? 'Creating…' : 'Create project →'}</button></form></section></div>}
 </main>;
}
