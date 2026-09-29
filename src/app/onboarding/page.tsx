import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { ProfileForm } from '@/components/profile-form';
export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <main className="onboarding"><div className="brand"><span className="brand-icon">R</span>ResearchForge</div><div className="eyebrow">LET’S GET ACQUAINTED</div><h1>Your research, your starting point.</h1><p className="muted">A few details help shape the guidance you see. You can change these anytime.</p><ProfileForm initial={user.profile} onboarding /></main>;
}
