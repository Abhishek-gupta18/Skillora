import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  adminListCompanies,
  adminGetJob,
  adminCreateJob,
  adminUpdateJob,
  adminUpdateJobStatus,
  adminDeleteJob,
  adminAddRequiredSkill,
  adminRemoveRequiredSkill,
  getMasterSkills,
} from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Loading, EmptyState, Modal, Field, useApiFieldErrors, StatusBadge, Badge, ConfirmDialog } from '../../components/ui';

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
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];
const LEVEL_LABELS = { 1: 'Novice', 2: 'Basic', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

function JobDetailsForm({ job, companies, onSaved }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const [form, setForm] = useState(() => ({
    companyId: job?.companyId || '',
    title: job?.title || '',
    description: job?.description || '',
    employmentType: job?.employmentType || 'FULL_TIME',
    experienceLevel: job?.experienceLevel || 'ENTRY',
    location: job?.location || '',
    isRemote: job?.isRemote || false,
    salaryMin: job?.salaryMin ?? '',
    salaryMax: job?.salaryMax ?? '',
    currency: job?.currency || 'INR',
    closesAt: job?.closesAt ? String(job.closesAt).slice(0, 10) : '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const validate = () => {
    const errs = {};
    if (!form.companyId) errs.companyId = 'Select a company';
    if (form.title.trim().length < 2) errs.title = 'Title must be 2–200 characters';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    const min = form.salaryMin === '' ? null : Number(form.salaryMin);
    const max = form.salaryMax === '' ? null : Number(form.salaryMax);
    if (min !== null && (!Number.isInteger(min) || min < 0)) errs.salaryMin = 'Must be a non-negative whole number';
    if (max !== null && (!Number.isInteger(max) || max < 0)) errs.salaryMax = 'Must be a non-negative whole number';
    if (!errs.salaryMin && !errs.salaryMax && min !== null && max !== null && min > max)
      errs.salaryMin = 'Salary Min must be ≤ Salary Max';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    const errs = validate();
    if (Object.keys(errs).length) {
      applyApiError({ errors: Object.entries(errs).map(([field, message]) => ({ field, message })) });
      return;
    }
    setBusy(true);
    try {
      const body = {
        companyId: form.companyId,
        title: form.title.trim(),
        description: form.description.trim(),
        employmentType: form.employmentType,
        experienceLevel: form.experienceLevel,
        location: form.location.trim(),
        isRemote: form.isRemote,
        currency: form.currency,
      };
      if (form.salaryMin !== '') body.salaryMin = Number(form.salaryMin);
      if (form.salaryMax !== '') body.salaryMax = Number(form.salaryMax);
      if (form.closesAt) body.closesAt = form.closesAt;

      if (job) {
        await adminUpdateJob(job.id, body);
        toast.success('Job updated');
      } else {
        await adminCreateJob(body);
        toast.success('Job created as DRAFT — add skills, then set it to OPEN.');
      }
      onSaved();
    } catch (err) {
      applyApiError(err);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-row">
        <Field label="Company" required error={fieldErrors.companyId}>
          <select value={form.companyId} onChange={set('companyId')}>
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Title" required error={fieldErrors.title}>
          <input type="text" maxLength={200} value={form.title} onChange={set('title')} />
        </Field>
      </div>

      <Field label="Description" required error={fieldErrors.description} hint={`${form.description.length}/10000`}>
        <textarea rows={7} maxLength={10000} value={form.description} onChange={set('description')} />
      </Field>

      <div className="form-row">
        <Field label="Employment Type" required error={fieldErrors.employmentType}>
          <select value={form.employmentType} onChange={set('employmentType')}>
            {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Experience Level" required error={fieldErrors.experienceLevel}>
          <select value={form.experienceLevel} onChange={set('experienceLevel')}>
            {EXPERIENCE_LEVELS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="form-row">
        <Field label="Location" required error={fieldErrors.location}>
          <input type="text" maxLength={200} value={form.location} onChange={set('location')} placeholder="e.g. Bengaluru, India" />
        </Field>
        <Field label="Currency" error={fieldErrors.currency}>
          <select value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <div className="form-row">
        <Field label="Salary Min (optional)" error={fieldErrors.salaryMin}>
          <input type="number" min="0" step="1" value={form.salaryMin} onChange={set('salaryMin')} />
        </Field>
        <Field label="Salary Max (optional)" error={fieldErrors.salaryMax}>
          <input type="number" min="0" step="1" value={form.salaryMax} onChange={set('salaryMax')} />
        </Field>
        <Field label="Application Deadline (optional)" error={fieldErrors.closesAt}>
          <input type="date" value={form.closesAt} onChange={set('closesAt')} />
        </Field>
      </div>

      <div className="field">
        <label className="checkbox-row">
          <input type="checkbox" checked={form.isRemote} onChange={set('isRemote')} />
          This job is remote
        </label>
      </div>

      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : job ? 'Save Changes' : 'Create Job (as DRAFT)'}
      </button>
    </form>
  );
}

function RequiredSkillsPanel({ jobId, jobSkills }) {
  const toast = useToast();
  const [skills, setSkills] = useState(null);
  const [skillsError, setSkillsError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ skillId: '', minimumLevel: 3, isRequired: true });
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();

  // GET /api/v1/skills — master list (not yet on the backend; see README)
  useEffect(() => {
    let alive = true;
    getMasterSkills()
      .then((res) => alive && setSkills(Array.isArray(res.data) ? res.data : []))
      .catch((err) =>
        alive &&
        setSkillsError(
          err.status === 404 || err.status === 0
            ? 'The master skill list endpoint (GET /api/v1/skills) is not available yet — required skills cannot be added until the backend ships it.'
            : err.message
        )
      );
    return () => {
      alive = false;
    };
  }, []);

  const existingIds = useMemo(() => new Set((jobSkills || []).map((rs) => rs.skillId)), [jobSkills]);

  // keep a stable ref to the refresh callback
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const onAdd = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    if (!form.skillId) {
      applyApiError({ errors: [{ field: 'skillId', message: 'Select a skill' }] });
      return;
    }
    setBusy(true);
    try {
      await adminAddRequiredSkill(jobId, {
        skillId: form.skillId,
        minimumLevel: Number(form.minimumLevel),
        isRequired: form.isRequired,
      });
      toast.success('Skill requirement added');
      setAddOpen(false);
      onSavedRef.current();
    } catch (err) {
      applyApiError(err);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await adminRemoveRequiredSkill(jobId, removing.id);
      toast.success('Skill requirement removed');
      setRemoving(null);
      onSavedRef.current();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt-24">
      <div className="section-card-head">
        <div>
          <h2>Required Skills</h2>
          <p>What candidates must (or should) know. Matching drives eligibility scores.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetFieldErrors(); setForm({ skillId: '', minimumLevel: 3, isRequired: true }); setAddOpen(true); }}>
          + Add Skill
        </button>
      </div>

      {skillsError && <div className="banner banner-warn">{skillsError}</div>}

      {skillsError && !(jobSkills || []).length ? null : !(jobSkills || []).length ? (
        <div className="empty-state" style={{ padding: 26 }}>
          <div className="empty-title">No skill requirements yet</div>
          <div className="empty-note">Add at least the must-have skills before opening this job.</div>
        </div>
      ) : (
        <ul className="skill-match-list">
          {(jobSkills || []).map((rs) => (
            <li key={rs.id}>
              <span>
                <strong>{rs.skill?.name}</strong>
                <span className="muted text-sm"> · min level {rs.minimumLevel} ({LEVEL_LABELS[rs.minimumLevel] || rs.minimumLevel})</span>
              </span>
              <span className="flex" style={{ gap: 8 }}>
                {rs.isRequired ? <Badge tone="red">Required</Badge> : <Badge tone="gray">Nice to have</Badge>}
                <button className="icon-btn danger" title="Remove" onClick={() => setRemoving(rs)}>🗑️</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {addOpen && (
        <Modal title="Add skill requirement" onClose={() => setAddOpen(false)} width={480}>
          <form onSubmit={onAdd} noValidate>
            <Field label="Skill" required error={fieldErrors.skillId}>
              <select value={form.skillId} onChange={(e) => setForm((f) => ({ ...f, skillId: e.target.value }))}>
                <option value="">Select a skill…</option>
                {(skills || [])
                  .filter((s) => !existingIds.has(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                  ))}
              </select>
            </Field>
            <Field label="Minimum Level (1–5)" required error={fieldErrors.minimumLevel}>
              <select
                value={form.minimumLevel}
                onChange={(e) => setForm((f) => ({ ...f, minimumLevel: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} — {LEVEL_LABELS[n]}</option>
                ))}
              </select>
            </Field>
            <div className="field">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
                />
                This skill is required (unchecked = nice to have)
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add Skill'}</button>
            </div>
          </form>
        </Modal>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove skill requirement"
          message={`Remove “${removing.skill?.name}” from this job's requirements?`}
          onCancel={() => setRemoving(null)}
          onConfirm={onRemove}
          busy={busy}
        />
      )}
    </div>
  );
}

export default function AdminJobForm() {
  const { id } = useParams(); // undefined = create mode
  const navigate = useNavigate();
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await adminListCompanies();
      setCompanies(res.data || []);
    } catch (err) {
      toast.error(err.message);
    }
  }, [toast]);

  const loadJob = useCallback(async () => {
    try {
      const res = await adminGetJob(id);
      setJob(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadCompanies();
    if (id) loadJob();
  }, [loadCompanies, loadJob, id]);

  const refreshJob = useCallback(() => {
    if (id) loadJob();
  }, [id, loadJob]);

  const onStatusChange = async (e) => {
    const status = e.target.value;
    if (!status || !job) return;
    setStatusBusy(true);
    try {
      await adminUpdateJobStatus(job.id, status);
      toast.success(`Status set to ${status}`);
      await loadJob();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStatusBusy(false);
    }
  };

  const onDelete = async () => {
    setDeleteBusy(true);
    try {
      await adminDeleteJob(job.id);
      toast.success('Job deleted');
      navigate('/admin/jobs', { replace: true });
    } catch (err) {
      // Conflict (skills/applications attached): show the API's message plainly.
      toast.error(err.message, 7000);
      setDeleteConfirm(false);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) return <Loading label="Loading job…" />;
  if (id && !job) return <EmptyState title="Job not found" action={<Link className="btn" to="/admin/jobs">Back to Jobs</Link>} />;

  return (
    <div>
      <p className="mb-8"><Link to="/admin/jobs">← Back to Jobs</Link></p>

      <div className="page-head">
        <div>
          <h1>{job ? `Edit: ${job.title}` : 'New Job'}</h1>
          {job && (
            <p className="page-sub flex" style={{ gap: 10 }}>
              <StatusBadge status={job.status} />
              {job.postedAt && <span>Posted {new Date(job.postedAt).toLocaleString()}</span>}
            </p>
          )}
        </div>
        {job && (
          <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)}>Delete Job</button>
        )}
      </div>

      <div className="card">
        <div className="section-card-head">
          <div>
            <h2>Job Details</h2>
            <p>{job ? 'Edit the posting details.' : 'Every new job starts as a DRAFT.'}</p>
          </div>
        </div>
        <JobDetailsForm job={job} companies={companies} onSaved={refreshJob} />
      </div>

      {job && (
        <>
          {/* Dedicated status control — separate from the details form on purpose */}
          <div className="card mt-24" style={{ borderColor: '#c9d4ea' }}>
            <div className="section-card-head">
              <div>
                <h2>Status</h2>
                <p>
                  DRAFT → OPEN sets the posted date automatically. Candidates only ever see OPEN jobs.
                </p>
              </div>
              <div className="flex">
                <StatusBadge status={job.status} />
                <select value={job.status} onChange={onStatusChange} disabled={statusBusy} style={{ width: 160 }}>
                  {['DRAFT', 'OPEN', 'CLOSED'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {job.postedAt && (
              <p className="text-sm muted" style={{ margin: 0 }}>
                Posted on: {new Date(job.postedAt).toLocaleString()} (set automatically — there is no date picker for this)
              </p>
            )}
          </div>

          <RequiredSkillsPanel jobId={job.id} jobSkills={job.jobRequiredSkills} onSaved={refreshJob} />

          <div className="card mt-24">
            <div className="section-card-head">
              <div>
                <h2>Applicants</h2>
                <p>Review applications for this job.</p>
              </div>
              <Link className="btn" to={`/admin/jobs/${job.id}/applicants`}>View Applicants</Link>
            </div>
          </div>
        </>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete job"
          message={`Delete “${job.title}”? If skills or applications are still attached, the API will refuse — handle those first.`}
          onCancel={() => setDeleteConfirm(false)}
          onConfirm={onDelete}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}
