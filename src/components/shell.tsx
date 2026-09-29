'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, ArrowUpRight, LogOut, Settings2, FlaskConical } from 'lucide-react';
import type { User } from '@/lib/auth';
export function Shell({
  user,
  children,
  project = false
}: {
  user: User;
  children: React.ReactNode;
  project?: boolean;
}) {
  const router = useRouter();
  return <div className="app-shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-icon">R</span><span>ResearchForge<small>DATAFORGE RESEARCH LAB</small></span></Link><div className="sidebar-label">WORKSPACE</div><nav><Link className={!project ? 'nav-link active' : 'nav-link'} href="/dashboard"><LayoutDashboard size={18} /> Overview</Link><Link className={project ? 'nav-link active' : 'nav-link'} href="/dashboard"><FlaskConical size={18} /> My research</Link><Link className="nav-link" href="/profile"><Settings2 size={18} /> Researcher profile</Link></nav><div className="sidebar-note"><BookOpen size={22} /><h4>Build understanding.<br />Not just a manuscript.</h4><p>Every step connects what you learn to what you create.</p><Link href="/profile">Personalize your guidance <ArrowUpRight size={14} /></Link></div><div className="sidebar-footer"><div className="avatar">{(user.profile.name || user.email).slice(0, 2).toUpperCase()}</div><div><strong>{user.profile.name || 'Researcher'}</strong><small>{user.profile.mode || 'guided'} mode</small></div><button className="icon-button" aria-label="Sign out" onClick={async () => {
          await fetch('/api/auth/logout', {
            method: 'POST'
          });
          router.push('/login');
          router.refresh();
        }}><LogOut size={17} /></button></div></aside><div className="main-shell"><header className="topbar"><span>My workspace <span className="slash">/</span> <strong>{project ? 'Research project' : 'Overview'}</strong></span><span className="topbar-tag"><span className="dot" /> Research Planner <span className="version-tag">v0.1</span></span></header>{children}</div></div>;
}
