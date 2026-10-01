import { useCallback, useEffect, useState } from 'react';
import { adminListCompanies, adminCreateCompany, adminUpdateCompany } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Loading, EmptyState, Modal, Field, useApiFieldErrors } from '../../components/ui';

const EMPTY = { name: '', description: '', website: '', industry: '', logoUrl: '' };

function CompanyForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name || '',
          description: initial.description || '',
          website: initial.website || '',
          industry: initial.industry || '',
          logoUrl: initial.logoUrl || '',
        }
      : { ...EMPTY }
  );
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    for (const k of ['website', 'logoUrl']) {
      if (form[k] && !/^https?:\/\/.+/i.test(form[k].trim())) errs[k] = 'Must be a valid URL (https://…)';
    }
    if (Object.keys(errs).length) {
      applyApiError({ errors: Object.entries(errs).map(([field, message]) => ({ field, message })) });
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        industry: form.industry.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
      };
      if (initial) {
        await adminUpdateCompany(initial.id, body);
        toast.success('Company updated');
      } else {
        await adminCreateCompany(body);
        toast.success('Company created');
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
    <Modal title={initial ? 'Edit Company' : 'New Company'} onClose={onClose} width={600}>
      <form onSubmit={onSubmit} noValidate>
        <Field label="Name" required error={fieldErrors.name} hint="2–200 characters">
          <input type="text" maxLength={200} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Description (optional)" error={fieldErrors.description} hint={`${form.description.length}/5000`}>
          <textarea rows={4} maxLength={5000} value={form.description} onChange={set('description')} />
        </Field>
        <div className="form-row">
          <Field label="Website (optional)" error={fieldErrors.website}>
            <input type="url" value={form.website} onChange={set('website')} placeholder="https://…" />
          </Field>
          <Field label="Industry (optional)" error={fieldErrors.industry}>
            <input type="text" maxLength={100} value={form.industry} onChange={set('industry')} />
          </Field>
        </div>
        <Field label="Logo URL (optional)" error={fieldErrors.logoUrl}>
          <input type="url" value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…" />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Company'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCompanies() {
  const toast = useToast();
  const [companies, setCompanies] = useState(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminListCompanies();
      setCompanies(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (companies === null && !error) return <Loading label="Loading companies…" />;
  if (error) return <EmptyState title="Could not load companies" note={error} />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Companies</h1>
          <p className="page-sub">{companies.length} companies registered.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>+ New Company</button>
      </div>

      {!companies.length ? (
        <EmptyState title="No companies yet" note="Create your first company to start posting jobs." />
      ) : (
        <div className="grid grid-2">
          {companies.map((c) => (
            <div key={c.id} className="card job-card" style={{ cursor: 'default' }}>
              <div className="job-card-top">
                <div className="flex" style={{ gap: 12 }}>
                  {c.logoUrl && (
                    <img
                      src={c.logoUrl}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div>
                    <h3 className="job-title">{c.name}</h3>
                    {c.industry && <div className="job-company">{c.industry}</div>}
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => setEditing(c)}>Edit</button>
              </div>
              {c.description && <p className="page-sub text-sm mt-8" style={{ marginBottom: 0 }}>{c.description}</p>}
              {c.website && (
                <div className="entry-meta">
                  <a href={c.website} target="_blank" rel="noreferrer">{c.website}</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <CompanyForm
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
      {editing && (
        <CompanyForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
