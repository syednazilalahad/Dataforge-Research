'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project, ProjectDocument } from '@/lib/domain';
export function useProject(initial: Project) {
  const [document, setDocument] = useState(initial.document);
  const [revision, setRevision] = useState(initial.revision);
  const [status, setStatus] = useState('All changes saved');
  const [error, setError] = useState('');
  const [impact, setImpact] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const latest = useRef(document);
  latest.current = document;
  const saved = useRef(JSON.stringify(initial.document));
  const rev = useRef(initial.revision);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const conflict = useRef(false);
  const save = useCallback(async (): Promise<boolean> => {
    while (inFlight.current) await inFlight.current;
    if (conflict.current) return false;
    const snapshot = latest.current;
    const encoded = JSON.stringify(snapshot);
    if (encoded === saved.current) return true;
    const work = (async () => {
      setStatus('Saving…');
      setError('');
      try {
        const response = await fetch(`/api/projects/${initial.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            revision: rev.current,
            document: snapshot
          })
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 409) conflict.current = true;
          throw new Error(data.error + (data.issues ? ' ' + data.issues.join(' ') : ''));
        }
        rev.current = data.project.revision;
        setRevision(rev.current);
        saved.current = encoded;
        setImpact(data.impact.impacted);
        setStatus('All changes saved');
        return true;
      } catch (e) {
        setError((e as Error).message);
        setStatus('Not saved');
        return false;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = work;
    const ok = await work;
    if (ok && JSON.stringify(latest.current) !== saved.current) setTick(t => t + 1);
    return ok;
  }, [initial.id]);
  useEffect(() => {
    if (JSON.stringify(document) === saved.current) return;
    setStatus('Unsaved changes');
    const timeout = setTimeout(() => void save(), 900);
    return () => clearTimeout(timeout);
  }, [document, tick, save]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);
  // Prevent internal navigation from dropping a pending or failed edit.
  useEffect(() => {
    const guard = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (a && a.getAttribute('href')?.startsWith('/') && JSON.stringify(latest.current) !== saved.current && !window.confirm('You have unsaved changes. Leave this project?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    documentGlobal().addEventListener('click', guard, true);
    return () => documentGlobal().removeEventListener('click', guard, true);
  }, []);
  const replace = (p: Project) => {
    latest.current = p.document;
    saved.current = JSON.stringify(p.document);
    rev.current = p.revision;
    conflict.current = false;
    setDocument(p.document);
    setRevision(p.revision);
    setError('');
    setStatus('All changes saved');
    setImpact([]);
  };
  return {
    document,
    setDocument,
    revision,
    status,
    error,
    impact,
    save,
    replace,
    getRevision: () => rev.current
  };
}
function documentGlobal() {
  return window.document;
}
