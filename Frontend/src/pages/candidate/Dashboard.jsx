import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFullProfile, getJobMatches } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { Loading, EmptyState, ProgressRing, Badge } from '../../components/ui';

// Section keys in the GET /profile/me response, per the backend contract.
const SECTION_KEYS = [
  'basicInfo',
  'photoHeadline',
  'address',
  'educationEntries',
  'experienceEntries',
  'skillClaims',
  'certifications',
  'projects',
  'careerSummary',
  'preferredRoles',
  'preferredLocations',
  'salaryExpectation',
  'availability',
  'languages',
  'socialLinks',
  'resume',
  'references',
  'privacyConsent',
];

function hasData(section, key) {
  if (!section) return false;
  if (Array.isArray(section)) return section.length > 0;
  if (key === 'photoHeadline') return Boolean(section.photoUrl || section.headline);
  if (key === 'privacyConsent') return Boolean(section.consentTimestamp) || section.dataSharingConsent === true;
  return true; // non-null object counts as complete
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getFullProfile(), getJobMatches()])
      .then(([profileRes, matchRes]) => {
        if (!alive) return;
        setProfile(profileRes.data);
        setMatches(Array.isArray(matchRes.data) ? matchRes.data : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <Loading label="Loading your dashboard…" />;

  const completed = SECTION_KEYS.filter((k) => hasData(profile?.[k], k)).length;
  const pct = Math.round((completed / SECTION_KEYS.length) * 100);
  const name = profile?.basicInfo?.name || user?.email?.split('@')[0] || 'there';
  const topMatches = matches.slice(0, 5);

  return (
    <div>
      <div className="dash-welcome">
        <div>
          <h1>Welcome back, {name}</h1>
          <p className="page-sub">Here's where your job search stands today.</p>
        </div>
      </div>

      <div className="grid grid-3 mb-16">
        <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <ProgressRing value={pct} size={96} />
          <div>
            <h3>Profile completeness</h3>
            <p className="page-sub" style={{ fontSize: 13 }}>
              {completed} of {SECTION_KEYS.length} sections filled. A complete profile means sharper match scores.
            </p>
            <Link to="/profile">Complete your profile →</Link>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3>Open matches</h3>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary)' }}>{matches.length}</div>
          <p className="page-sub" style={{ fontSize: 13 }}>
            open jobs ranked against your claimed skills.
          </p>
          <Link to="/job-matches">See all matches →</Link>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3>Applications</h3>
          <p className="page-sub" style={{ fontSize: 13, marginBottom: 10 }}>
            Track statuses, withdraw pending ones, and follow up.
          </p>
          <Link to="/applications">Go to My Applications →</Link>
        </div>
      </div>

      <div className="quick-links">
        <Link className="quick-link" to="/profile">My Profile <span>Fill or update all 18 sections</span></Link>
        <Link className="quick-link" to="/jobs">Browse Jobs <span>Search &amp; filter open roles</span></Link>
        <Link className="quick-link" to="/applications">My Applications <span>Status of everything you applied to</span></Link>
      </div>

      <div className="card">
        <div className="flex spread mb-8">
          <h2 style={{ margin: 0 }}>Your top matches</h2>
          <Link to="/job-matches" className="text-sm">View all</Link>
        </div>
        {topMatches.length === 0 ? (
          <EmptyState
            title="No matches yet"
            note="Claim some skills in your profile — then every open job gets a match score."
            action={<Link className="btn btn-primary" to="/profile">Claim your skills</Link>}
          />
        ) : (
          <div className="skill-match-list">
            {topMatches.map((m) => (
              <li key={m.jobId}>
                <Link to={`/jobs/${m.jobId}`} style={{ fontWeight: 600 }}>
                  {m.title}
                  <span className="muted" style={{ fontWeight: 400 }}> · {m.companyName}</span>
                </Link>
                <span className="flex" style={{ gap: 12 }}>
                  <strong>{m.eligibilityScore}%</strong>
                  <Badge tone={m.isEligible ? 'green' : 'gray'}>{m.isEligible ? 'Eligible' : 'Not eligible'}</Badge>
                </span>
              </li>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
