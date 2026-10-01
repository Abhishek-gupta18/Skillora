import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminListApplicants, adminUpdateApplicationStatus, adminDownloadApplicantResume, adminGetJob } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Loading, EmptyState, StatusBadge, formatDate, downloadBlob } from '../../components/ui';

const ALLOWED_STATUSES = ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED'];

export default function AdminJobApplicants() {
  const { jobId } = useParams();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [appsRes, jobsRes] = await Promise.all([adminListApplicants(jobId), adminGetJob(jobId)]);
      setApplicants(appsRes.data || []);
      setJob(jobsRes.data);
    } catch (err) {
      setError(err.message);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const onStatusChange = async (app, status) => {
    setBusyId(app.id);
    try {
      await adminUpdateApplicationStatus(app.id, status);
      toast.success(`Status set to ${status.replace(/_/g, ' ')}`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onDownloadResume = async (app) => {
    setBusyId(app.id);
    try {
      const { blob } = await adminDownloadApplicantResume(app.id);
      downloadBlob(blob, `resume-${app.candidateEmail || app.id}.pdf`);
    } catch (err) {
      // "No resume uploaded" is an expected state — show it plainly.
      toast.info(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (applicants === null && !error) return <Loading label="Loading applicants…" />;
  if (error) return <EmptyState title="Could not load applicants" note={error} />;

  return (
    <div>
      <p className="mb-8"><Link to="/admin/jobs">← Back to Jobs</Link></p>
      <div className="page-head">
        <div>
          <h1>Applicants{job ? ` — ${job.title}` : ''}</h1>
          <p className="page-sub">
            {job?.status && (
              <>Job status: <StatusBadge status={job.status} /> · </>
            )}
            {applicants.length} application{applicants.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {!applicants.length ? (
        <EmptyState title="No applications yet" note="Applicants appear here as soon as candidates apply." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Status</th>
                <th>Cover Note</th>
                <th>Applied</th>
                <th>Last Updated</th>
                <th>Change Status</th>
                <th>Resume</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => {
                const withdrawn = a.status === 'WITHDRAWN';
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.candidateName || 'Not provided'}</td>
                    <td>{a.candidateEmail}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td style={{ maxWidth: 260 }}>
                      {a.coverNote || <span className="cell-note">—</span>}
                    </td>
                    <td className="cell-note">{formatDate(a.appliedAt)}</td>
                    <td className="cell-note">{formatDate(a.statusUpdatedAt)}</td>
                    <td>
                      {withdrawn ? (
                        <span className="cell-note">Withdrawn by candidate</span>
                      ) : (
                        <select
                          value={ALLOWED_STATUSES.includes(a.status) ? a.status : ''}
                          disabled={busyId === a.id}
                          onChange={(e) => e.target.value && onStatusChange(a, e.target.value)}
                          style={{ width: 150 }}
                        >
                          <option value="">Change status…</option>
                          {ALLOWED_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm" disabled={busyId === a.id} onClick={() => onDownloadResume(a)}>
                        Download Resume
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
