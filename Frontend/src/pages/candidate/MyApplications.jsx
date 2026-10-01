import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyApplications, withdrawApplication } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Loading, EmptyState, StatusBadge, formatDate, Modal } from '../../components/ui';

const WITHDRAWABLE = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED'];

export default function MyApplications() {
  const toast = useToast();
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyApplications();
      setApps(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onWithdraw = async () => {
    setBusy(true);
    try {
      await withdrawApplication(withdrawing.id);
      toast.success('Application withdrawn');
      setWithdrawing(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (apps === null && !error) return <Loading label="Loading your applications…" />;
  if (error) return <EmptyState title="Could not load applications" note={error} />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>My Applications</h1>
          <p className="page-sub">Everything you've applied to, with live status.</p>
        </div>
      </div>

      {!apps.length ? (
        <EmptyState
          title="No applications yet"
          note="When you apply to a job, it shows up here."
          action={<Link className="btn btn-primary" to="/jobs">Browse Jobs</Link>}
        />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {apps.map((a) => (
            <div key={a.id} className="entry-card" style={{ border: 'none', borderBottom: '1px solid var(--border)', marginBottom: 0, borderRadius: 0 }}>
              <div className="entry-card-head">
                <div className="grow">
                  <div className="entry-title">
                    <Link to={`/jobs/${a.jobId}`}>{a.jobTitle}</Link>
                  </div>
                  <div className="entry-sub">{a.companyName}</div>
                  {a.coverNote && <div className="entry-meta">“{a.coverNote}”</div>}
                  <div className="entry-meta">
                    <span>Applied {formatDate(a.appliedAt)}</span>
                    <span>Last update {formatDate(a.statusUpdatedAt)}</span>
                  </div>
                </div>
                <div className="flex" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <StatusBadge status={a.status} />
                  {WITHDRAWABLE.includes(a.status) && (
                    <button className="btn btn-sm" onClick={() => setWithdrawing(a)}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {withdrawing && (
        <Modal title="Withdraw application" onClose={() => setWithdrawing(null)} width={440}>
          <p style={{ marginTop: 0 }}>
            Withdraw your application to <strong>{withdrawing.jobTitle}</strong> at{' '}
            <strong>{withdrawing.companyName}</strong>?
          </p>
          <p className="text-sm muted">
            Important: once withdrawn, you can never re-apply to this job.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setWithdrawing(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={onWithdraw} disabled={busy}>
              {busy ? 'Withdrawing…' : 'Withdraw'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
