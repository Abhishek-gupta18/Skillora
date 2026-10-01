import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobMatches } from '../../api/endpoints';
import { Loading, EmptyState, Badge, ProgressBar } from '../../components/ui';

export default function JobMatches() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJobMatches()
      .then((res) => setMatches(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  if (matches === null && !error) return <Loading label="Calculating your matches…" />;
  if (error) return <EmptyState title="Could not load matches" note={error} />;
  if (!matches.length)
    return (
      <EmptyState
        title="No open jobs right now"
        note="Check back soon — matches appear as soon as jobs open."
        action={<Link className="btn" to="/jobs">Browse Jobs</Link>}
      />
    );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Job Matches</h1>
          <p className="page-sub">All open jobs ranked by your eligibility score.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {matches.map((m) => (
          <Link
            key={m.jobId}
            to={`/jobs/${m.jobId}`}
            className="entry-card-head"
            style={{
              display: 'flex',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <div className="grow">
              <div className="entry-title">{m.title}</div>
              <div className="entry-sub">{m.companyName}</div>
            </div>
            <div style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <div className="flex" style={{ gap: 10 }}>
                <strong>{m.eligibilityScore}%</strong>
                <Badge tone={m.isEligible ? 'green' : 'gray'}>{m.isEligible ? 'Eligible' : 'Not eligible'}</Badge>
              </div>
              <div style={{ width: '100%' }}>
                <ProgressBar value={m.eligibilityScore} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
