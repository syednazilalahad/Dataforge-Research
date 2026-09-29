import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listProjects } from '@/lib/repository';
import { Shell } from '@/components/shell';
import { Dashboard } from '@/components/dashboard';
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!user.profile.name) redirect('/onboarding');
  const projects = await listProjects(user.id);
  return <Shell user={user}><Dashboard name={user.profile.name} initial={JSON.parse(JSON.stringify(projects))} /></Shell>;
}
