import { AuthForm } from '@/components/auth-form';
export default function Login() {
  return <div className="auth-layout"><div className="auth-story"><div className="brand"><span className="brand-icon">R</span> ResearchForge</div><div><div className="eyebrow light">DATAFORGE RESEARCH LAB</div><h1>Good research<br />starts with<br /><em>better questions.</em></h1><p>Your ideas, evidence and decisions.<br />One connected research journey.</p><div className="journey-line"><span>01 · Explore</span><span>02 · Connect</span><span>03 · Validate</span></div></div><small>From Research Idea to Publication.</small></div><div className="auth-panel"><AuthForm /></div></div>;
}
