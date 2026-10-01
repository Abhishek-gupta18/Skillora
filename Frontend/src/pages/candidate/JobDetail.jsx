import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJob, getJobEligibility, applyToJob, getMyApplications } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Loading, EmptyState, Badge, Modal, ProgressRing, formatDate } from '../../components/ui';
import { formatSalary } from './BrowseJobs';

const LEVEL_LABELS = { 1: 'Novice', 2: 'Basic', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

function SkillRow({ rs }) {
  return (
    <li>
      <span>
        <strong>{rs.skill?.name}</strong>
        <span className="muted text-sm"> · min level {rs.minimumLevel} ({LEVEL_LABELS[rs.minimumLevel] || rs.minimumLevel})</span>
      </span>
      {rs.isRequired ? <Badge tone="red">Required</Badge> : <Badge tone="gray">Nice to have</Badge>}
    </li>
  );
}

function SkillMatchRow({ s }) {
  return (
    <li>
      <span>
        <strong>{s.skillName}</strong>
        <span className="muted text-sm"> · needs level {s.minimumLevel}</span>
      </span>
      <span>
        {s.candidateLevel != null ? (
          <span className={s.matched ? '' : 'muted'}>
            Your level: <strong>{s.candidateLevel}</strong>
          </span>
        ) : (
          <Badge tone="gray">Not claimed</Badge>
        )}
      </span>
    </li>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elig, setElig] = useState(null);
  const [eligLoading, setEligLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      const res = await getJob(id);
      setJob(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const checkWithdrawn = useCallback(async () => {
    try {
      const res = await getMyApplications();
      const mine = (res.data || []).find((a) => a.jobId === id);
      if (mine?.status === 'WITHDRAWN') setWithdrawn(true);
      if (mine && mine.status !== 'WITHDRAWN') setApplied(true);
    } catch {
      /* non-fatal */
    }
  }, [id]);

  useEffect(() => {
    loadJob();
    checkWithdrawn();
  }, [loadJob, checkWithdrawn]);

  const onCheckEligibility = async () => {
    setEligLoading(true);
    try {
      const res = await getJobEligibility(id);
      setElig(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEligLoading(false);
    }
  };

  const onApplySubmit = async (e) => {
    e.preventDefault();
    setApplyBusy(true);
    try {
      await applyToJob(id, coverNote.trim() || undefined);
      toast.success('Application submitted!');
      setApplied(true);
      setApplyOpen(false);
    } catch (err) {
      if (err.status === 409) {
        // "Already applied" conflict
        toast.info(err.message);
        setApplied(true);
        setApplyOpen(false);
      } else {
        toast.error(err.message);
      }
    } finally {
      setApplyBusy(false);
    }
  };

  if (loading) return <Loading label="Loading job…" />;
  if (!job) return <EmptyState title="Job not found" note="It may have been closed or removed." action={<Link className="btn" to="/jobs">Back to Browse Jobs</Link>} />;

  const salary = formatSalary(job);
  const required = (job.jobRequiredSkills || []).filter((rs) => rs.isRequired);
  const nice = (job.jobRequiredSkills || []).filter((rs) => !rs.isRequired);

  return (
    <div>
      <p className="mb-8"><Link to="/jobs">← Back to Browse Jobs</Link></p>

      <div className="card">
        <div className="page-head" style={{ marginBottom: 8 }}>
          <div>
            <h1>{job.title}</h1>
            <p className="page-sub">{job.company?.name}</p>
          </div>
          {job.isRemote && <Badge tone="green">Remote</Badge>}
        </div>

        <div className="job-meta mb-16">
          <span className="meta-item">📍 {job.location}</span>
          <span className="meta-item">{String(job.employmentType || '').replace(/_/g, ' ')}</span>
          <span className="meta-item">Level: {job.experienceLevel}</span>
          {salary && <span className="meta-item">💰 {salary}</span>}
          {job.closesAt && <span className="meta-item">Deadline: {formatDate(job.closesAt)}</span>}
        </div>

        <h3>About this role</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>

        {(job.jobRequiredSkills || []).length > 0 && (
          <>
            <h3 className="mt-16">Skills</h3>
            {required.length > 0 && (
              <>
                <div className="text-sm muted mb-8">Required</div>
                <ul className="skill-match-list mb-16">
                  {required.map((rs) => <SkillRow key={rs.id} rs={rs} />)}
                </ul>
              </>
            )}
            {nice.length > 0 && (
              <>
                <div className="text-sm muted mb-8">Nice to have</div>
                <ul className="skill-match-list">
                  {nice.map((rs) => <SkillRow key={rs.id} rs={rs} />)}
                </ul>
              </>
            )}
          </>
        )}

        <div className="flex mt-24">
          <button className="btn" onClick={onCheckEligibility} disabled={eligLoading}>
            {eligLoading ? 'Checking…' : 'Check My Eligibility'}
          </button>

          {withdrawn ? (
            <span className="banner banner-warn" style={{ margin: 0 }}>
              You withdrew your application to this job.
            </span>
          ) : applied ? (
            <button className="btn" disabled>Applied ✓</button>
          ) : (
            <button className="btn btn-primary" onClick={() => setApplyOpen(true)}>Apply</button>
          )}
        </div>

        {elig && (
          <div className="elig-panel">
            <div className="elig-grid">
              <ProgressRing value={elig.eligibilityScore} />
              <div>
                <h3 style={{ marginBottom: 6 }}>
                  {elig.isEligible ? <Badge tone="green">Eligible</Badge> : <Badge tone="yellow">Missing required skills</Badge>}
                </h3>
                <p className="page-sub text-sm" style={{ maxWidth: 420 }}>
                  Score based on matching your claimed skills against this job's <em>required</em> skills.
                </p>
              </div>
            </div>

            {(elig.matchedSkills || []).length > 0 && (
              <>
                <div className="text-sm muted mb-8">Matched skills</div>
                <ul className="skill-match-list mb-16">
                  {elig.matchedSkills.map((s) => <SkillMatchRow key={s.skillId} s={s} />)}
                </ul>
              </>
            )}
            {(elig.missingSkills || []).length > 0 && (
              <>
                <div className="text-sm muted mb-8">Missing skills</div>
                <ul className="skill-match-list">
                  {elig.missingSkills.map((s) => <SkillMatchRow key={s.skillId} s={s} />)}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {applyOpen && (
        <Modal title={`Apply — ${job.title}`} onClose={() => setApplyOpen(false)}>
          <form onSubmit={onApplySubmit}>
            <div className="field">
              <label className="field-label">Cover Note (optional)</label>
              <textarea
                rows={6}
                maxLength={2000}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Tell the employer why you're a great fit…"
              />
              <div className="char-counter">{coverNote.length}/2000</div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setApplyOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={applyBusy}>
                {applyBusy ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
