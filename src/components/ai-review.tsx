'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Suggestion } from '@/lib/ai';
type Run = {
  id: string;
  provider: string;
  model: string;
  prompt_version: string;
  project_revision: number;
  output: Partial<Suggestion>;
  decision?: string;
  status: string;
  created_at: string;
  context_hash: string;
  source_ids: string[];
  final_text?: string;
};
export function AIReview({
  projectId,
  save,
  onAddQuestion
}: {
  projectId: string;
  save: () => Promise<boolean>;
  onAddQuestion: (text: string) => void;
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{
    run: Run;
    original: string;
    text: string;
    kind: string;
  } | null>(null);
  async function refresh() {
    const r = await fetch(`/api/projects/${projectId}/ai`);
    if (r.ok) setRuns((await r.json()).runs);
  }
  useEffect(() => {
    void refresh();
  }, [projectId]);
  async function decide(run: Run, decision: string, text: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/ai-decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          runId: run.id,
          decision,
          finalText: text
        })
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return <section className="panel ai-panel"><div className="section-heading"><div><span className="eyebrow">A THINKING PARTNER, NOT THE AUTHOR</span><h2><Sparkles size={21} /> Explore possible directions</h2></div><button className="btn secondary" disabled={busy} onClick={async () => {
        setBusy(true);
        setError('');
        try {
          if (!(await save())) throw new Error('Save your project before requesting suggestions.');
          const r = await fetch(`/api/projects/${projectId}/ai`, {
            method: 'POST'
          });
          const b = await r.json();
          if (!r.ok) throw new Error(b.error);
          await refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}>{busy ? 'Working…' : 'Get planning suggestions'}</button></div><p className="muted small">Suggestions use saved planning fields and literature summaries. External providers require your profile permission. The default offline provider supplies templates.</p>{error && <div className="alert error" role="alert">{error}</div>}{runs.slice(0, 3).map(run => <div className="ai-run" key={run.id}><div className="row between"><span className="pill">{run.provider === 'offline' ? 'OFFLINE PLANNING AID' : run.model}</span><small className="muted">Based on revision {run.project_revision} · {run.decision || run.status}</small></div><p>{run.output.summary}</p>{run.output.suggestions?.map((s, i) => <div className="suggestion" key={i}><strong>{s.text}</strong><p>{s.rationale}</p>{!run.decision && <button className="text-button" disabled={busy} onClick={() => setSelected({
          run,
          original: s.text,
          text: s.text,
          kind: s.kind
        })}>Review this suggestion →</button>}</div>)}{!run.decision && run.status === 'completed' && <button className="text-button" disabled={busy} onClick={() => void decide(run, 'rejected', 'Researcher rejected these suggestions.')}>Reject this set</button>}<details><summary>Audit details</summary><p className="small">Provider: {run.provider} · Model: {run.model} · Prompt: {run.prompt_version}<br />Created: {new Date(run.created_at).toLocaleString()}<br />Sources supplied: {run.source_ids.length}<br />Context fingerprint: <code className="hash">{run.context_hash}</code></p>{run.final_text && <p className="small">Researcher decision: {run.final_text}</p>}</details></div>)}{selected && <div className="review-box"><h3>Make this recommendation your own.</h3><label>Final researcher text<textarea value={selected.text} onChange={e => setSelected({
          ...selected,
          text: e.target.value
        })} maxLength={12000} /></label><p className="small muted">{selected.kind === 'question' ? 'Accepting adds this text as a research question. Review and link an objective next.' : 'Accepting records your decision in the audit trail. Apply it to the appropriate project field when ready.'}</p><div className="row"><button className="btn primary" disabled={busy || !selected.text.trim()} onClick={async () => {
          if (await decide(selected.run, selected.text === selected.original ? 'accepted' : 'modified', selected.text)) {
            if (selected.kind === 'question') onAddQuestion(selected.text);
            setSelected(null);
          }
        }}>Accept{selected.kind === 'question' ? ' & add question' : ''}</button><button className="btn secondary" onClick={() => setSelected(null)}>Cancel</button></div></div>}</section>;
}
