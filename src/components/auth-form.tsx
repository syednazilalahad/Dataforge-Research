'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function AuthForm() {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="auth-form" onSubmit={async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password')
        })
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      router.push(register ? '/onboarding' : '/dashboard');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }}>
 <span className="pill">YOUR RESEARCH STARTS HERE</span><h2>{register ? 'Make room for your next idea.' : 'Welcome back.'}</h2><p className="muted">{register ? 'Create your private research workspace.' : 'Pick up where your curiosity left off.'}</p>
 <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@university.edu" maxLength={254} /></label>
 <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required placeholder="At least 12 characters" /></label>
 {error && <div className="alert error" role="alert">{error}</div>}<button className="btn primary wide" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account →' : 'Sign in →'}</button>
 <p className="center muted">{register ? 'Already have an account?' : 'New to ResearchForge?'} <button type="button" className="text-button" onClick={() => {
        setRegister(!register);
        setError('');
      }}>{register ? 'Sign in' : 'Create an account'}</button></p><small className="muted">A workspace for research planning. You remain the author of every decision.</small>
 </form>;
}
