import { Link } from 'react-router-dom';

const STEPS = [
  { n: 1, title: 'Build your profile', text: 'Add your education, experience, skills, and preferences — 18 sections that paint the full picture of you.' },
  { n: 2, title: 'Claim your skills', text: 'Self-rate the skills you own. Assessments can verify them later.' },
  { n: 3, title: 'Browse jobs', text: 'Search open roles filtered by type, level, location, or remote-only.' },
  { n: 4, title: 'See your match score', text: 'For every job, see exactly which required skills you meet — and which are missing.' },
  { n: 5, title: 'Apply', text: 'Apply directly with an optional cover note and track every application in one place.' },
];

export default function Landing() {
  return (
    <div>
      <header className="public-header">
        <Link to="/" className="brand">
          <span className="brand-mark">S</span> Skillora
        </Link>
        <nav>
          <Link to="/login" className="btn">Log In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <span className="hero-kicker">AI-POWERED CAREER &amp; SKILL INTELLIGENCE</span>
          <h1>
            Know exactly where you stand — <span className="accent">before</span> you apply.
          </h1>
          <p className="hero-sub">
            Skillora evaluates your skills through self-assessment, matches them against real
            job requirements, shows you precisely which skills are missing for each role, and
            lets you apply directly. No guessing. No black-hole applications.
          </p>
          <div className="hero-ctas">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started — it's free</Link>
            <Link to="/login" className="btn btn-lg">Log In</Link>
          </div>
        </div>
      </section>

      <section className="how-section">
        <h2>How it works</h2>
        <div className="how-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="card how-card">
              <div className="how-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p className="page-sub" style={{ fontSize: 13.5 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-strip">
        <p>
          Built for candidates who want transparency — every match score is broken down
          skill by skill, so you always know why you fit (and what to learn next).
        </p>
      </section>
    </div>
  );
}
