import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getProject } from '@/lib/repository';
import { AppError } from '@/lib/errors';
import { Shell } from '@/components/shell';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function ProjectPage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  try {
    const project = await getProject(user.id, (await params).id);
    return <Shell user={user} project><Workspace initial={JSON.parse(JSON.stringify(project))} mode={user.profile.mode || 'guided'} /></Shell>;
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
}
