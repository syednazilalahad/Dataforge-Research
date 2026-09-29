import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ResearchForge · Research with direction',
  description: 'A connected workspace for your research journey. From idea to a defensible research plan.'
};
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <html lang="en"><body>{children}</body></html>;
}
