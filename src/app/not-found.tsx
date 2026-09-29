import Link from 'next/link';
export default function NotFound() {
  return <main className="onboarding"><h1>Project not found.</h1><p>This project may be unavailable or belong to another researcher.</p><Link className="btn primary" href="/dashboard">Back to workspace</Link></main>;
}
