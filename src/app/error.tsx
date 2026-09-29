'use client';

export default function ErrorPage({
  reset
}: {
  reset: () => void;
}) {
  return <main className="onboarding"><h1>We couldn’t load this workspace.</h1><p>Please try again. If this persists, check the database configuration.</p><button className="btn primary" onClick={reset}>Try again</button></main>;
}
