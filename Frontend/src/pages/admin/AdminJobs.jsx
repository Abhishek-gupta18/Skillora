import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListJobs } from '../../api/endpoints';
import { Loading, EmptyState, StatusBadge, Badge } from '../../components/ui';
import { formatSalary } from '../candidate/BrowseJobs';

export default function AdminJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await adminListJobs();
      setJobs(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (jobs === null && !error) return <Loading label="Loading jobs…" />;
  if (error) return <EmptyState title="Could not load jobs" note={error} />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Jobs</h1>
          <p className="page-sub">All postings — DRAFT, OPEN and CLOSED.</p>
        </div>
        <Link className="btn btn-primary" to="/admin/jobs/new">+ New Job</Link>
      </div>

      {!jobs.length ? (
        <EmptyState
          title="No job postings yet"
          note="Create a job, add its required skills, then set it to OPEN."
          action={<Link className="btn btn-primary" to="/admin/jobs/new">Create a job</Link>}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Status</th>
                <th>Type / Level</th>
                <th>Location</th>
                <th>Salary</th>
                <th>Skills</th>
                <th>Applicants</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <Link to={`/admin/jobs/${j.id}`} style={{ fontWeight: 600 }}>{j.title}</Link>
                    {j.postedAt && <div className="cell-note">Posted {new Date(j.postedAt).toLocaleDateString()}</div>}
                  </td>
                  <td>{j.company?.name}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td className="cell-note">
                    {String(j.employmentType || '').replace(/_/g, ' ')} · {j.experienceLevel}
                  </td>
                  <td>
                    {j.location} {j.isRemote && <Badge tone="green">Remote</Badge>}
                  </td>
                  <td className="cell-note">{formatSalary(j) || '—'}</td>
                  <td className="cell-note">{(j.jobRequiredSkills || []).length}</td>
                  <td>
                    <Link className="btn btn-sm" to={`/admin/jobs/${j.id}/applicants`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
