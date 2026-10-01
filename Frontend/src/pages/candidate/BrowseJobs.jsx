import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listJobs } from '../../api/endpoints';
import { Loading, EmptyState, Badge, Spinner } from '../../components/ui';

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'CONTRACT', label: 'Contract' },
];

const EXPERIENCE_LEVELS = [
  { value: 'ENTRY', label: 'Entry' },
  { value: 'MID', label: 'Mid' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'LEAD', label: 'Lead' },
];

export function formatSalary(job) {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const fmt = (n) => (n == null ? '' : new Intl.NumberFormat('en-IN').format(n));
  if (job.salaryMin != null && job.salaryMax != null) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)} ${job.currency || ''}`;
  if (job.salaryMin != null) return `From ${fmt(job.salaryMin)} ${job.currency || ''}`;
  return `Up to ${fmt(job.salaryMax)} ${job.currency || ''}`;
}

export function JobCard({ job }) {
  const salary = formatSalary(job);
  return (
    <Link to={`/jobs/${job.id}`} className="card job-card">
      <div className="job-card-top">
        <div>
          <h3 className="job-title">{job.title}</h3>
          <div className="job-company">{job.company?.name}</div>
        </div>
        {job.isRemote && <Badge tone="green">Remote</Badge>}
      </div>
      <div className="job-meta">
        <span className="meta-item">📍 {job.location}</span>
        <span className="meta-item">{String(job.employmentType || '').replace(/_/g, ' ')}</span>
        <span className="meta-item">{String(job.experienceLevel || '')}</span>
        {salary && <span className="meta-item">💰 {salary}</span>}
      </div>
      {(job.jobRequiredSkills || []).length > 0 && (
        <div className="job-meta">
          {job.jobRequiredSkills.slice(0, 6).map((rs) => (
            <span key={rs.id} className="skill-chip">{rs.skill?.name}</span>
          ))}
          {job.jobRequiredSkills.length > 6 && <span className="muted text-sm">+{job.jobRequiredSkills.length - 6} more</span>}
        </div>
      )}
      {job.postedAt && (
        <div className="entry-meta">Posted {new Date(job.postedAt).toLocaleDateString()}</div>
      )}
    </Link>
  );
}

export default function BrowseJobs() {
  const [filters, setFilters] = useState({
    search: '',
    employmentType: '',
    experienceLevel: '',
    location: '',
    isRemote: false,
  });
  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (f) => {
    setLoading(true);
    setError('');
    try {
      const res = await listJobs(f);
      setJobs(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({});
  }, [load]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const next = { ...filters, [k]: v };
    setFilters(next);
    load(next);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    load(filters);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Browse Jobs</h1>
          <p className="page-sub">All currently-open roles.</p>
        </div>
      </div>

      <form className="filters" onSubmit={onSubmit}>
        <input
          type="search"
          placeholder="Search by job title or skill…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          onBlur={() => load(filters)}
        />
        <select value={filters.employmentType} onChange={set('employmentType')}>
          <option value="">All types</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={filters.experienceLevel} onChange={set('experienceLevel')}>
          <option value="">All levels</option>
          {EXPERIENCE_LEVELS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          onBlur={() => load(filters)}
        />
        <label className="toggle-row">
          <input type="checkbox" checked={filters.isRemote} onChange={set('isRemote')} />
          Remote only
        </label>
        <button className="btn btn-primary btn-sm" type="submit" style={{ display: 'none' }}>Go</button>
      </form>

      {loading && !jobs ? (
        <Loading label="Loading jobs…" />
      ) : error ? (
        <EmptyState title="Could not load jobs" note={error} />
      ) : !jobs?.length ? (
        <EmptyState title="No open jobs match your filters" note="Try widening your search." />
      ) : (
        <div className="grid grid-2">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}

      {loading && jobs && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <Spinner size={22} />
        </div>
      )}
    </div>
  );
}
