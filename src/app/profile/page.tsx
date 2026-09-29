import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { ProfileForm } from '@/components/profile-form';
import { Shell } from '@/components/shell';
export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <Shell user={user}><main className="page"><div className="eyebrow">YOUR WORKSPACE, PERSONALIZED</div><h1>Researcher profile</h1><p className="muted">Choose your guidance and manage your AI preferences.</p><ProfileForm initial={user.profile} /></main></Shell>;
}
