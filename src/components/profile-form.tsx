'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/domain';
export function ProfileForm({
  initial = {},
  onboarding = false
}: {
  initial?: Partial<Profile>;
  onboarding?: boolean;
}) {
  const [value, setValue] = useState<Profile>({
    name: '',
    field: '',
    level: '',
    experience: 'Beginner',
    interests: '',
    tools: '',
    mode: 'guided',
    aiConsent: false,
    ...initial
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const field = (key: keyof Profile, label: string) => <label>{label}<input required={key === 'name'} maxLength={key === 'interests' ? 2000 : 200} value={String(value[key])} onChange={e => setValue({
      ...value,
      [key]: e.target.value
    })} /></label>;
  return <form className="panel profile-form" onSubmit={async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(value)
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      if (onboarding) {
        router.push('/dashboard');
        router.refresh();
      } else setMessage('Profile saved.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }}><div className="form-grid">{field('name', 'Your name')}{field('field', 'Research field')}{field('level', 'Educational level')}<label>Research experience<select value={value.experience} onChange={e => setValue({
          ...value,
          experience: e.target.value
        })}><option>Beginner</option><option>Some research experience</option><option>Experienced researcher</option></select></label>{field('interests', 'Research interests')}{field('tools', 'Available tools & resources')}</div><h3>How would you like to work?</h3><div className="mode-grid">{(['learn', 'guided', 'researcher'] as const).map(mode => <button key={mode} type="button" className={`mode-card ${value.mode === mode ? 'selected' : ''}`} onClick={() => setValue({
        ...value,
        mode
      })}><strong>{mode === 'learn' ? 'Learn as you go' : mode === 'guided' ? 'A little guidance' : 'Researcher mode'}</strong><small>{mode === 'learn' ? 'Concepts explained at every stage' : mode === 'guided' ? 'Structured steps and contextual tips' : 'A focused workspace with less teaching'}</small></button>)}</div><label className="checkbox"><input type="checkbox" checked={value.aiConsent} onChange={e => setValue({
        ...value,
        aiConsent: e.target.checked
      })} />Allow selected project planning text and literature summaries to be sent to the configured external AI provider when I request suggestions.</label><p className="muted small">External AI is optional. Keep participant identifiers and sensitive raw data out of planning fields. Offline guidance works without this permission.</p>{message && <div role="status" className="alert">{message}</div>}<button className="btn primary" disabled={busy}>{busy ? 'Saving…' : onboarding ? 'Enter your workspace →' : 'Save profile'}</button></form>;
}
