import { useState } from 'react';
import { educationApi, certificationsApi, preferredRolesApi, preferredLocationsApi, languagesApi, referencesApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors, formatDate, Modal } from '../ui';

const CONFIG = {
  education: {
    title: 'Education',
    api: educationApi,
    dataKey: 'educationEntries',
    addLabel: '+ Add Education',
    fields: [
      { name: 'institution', label: 'Institution', max: 200, required: true },
      { name: 'degree', label: 'Degree', max: 100, required: true },
      { name: 'fieldOfStudy', label: 'Field of Study', max: 100, required: true },
      { name: 'startYear', label: 'Start Year', type: 'number', required: true },
      { name: 'endYear', label: 'End Year (optional)', type: 'number' },
      { name: 'grade', label: 'Grade (optional)', max: 50 },
    ],
    titleField: (e) => e.degree && e.institution ? `${e.degree}, ${e.fieldOfStudy || ''}` : e.institution,
    subField: (e) => e.institution,
    meta: (e) => [`${e.startYear} – ${e.endYear || 'Present'}`, e.grade ? `Grade: ${e.grade}` : null],
  },
  certifications: {
    title: 'Certifications',
    api: certificationsApi,
    dataKey: 'certifications',
    addLabel: '+ Add Certification',
    fields: [
      { name: 'name', label: 'Name', max: 200, required: true },
      { name: 'issuer', label: 'Issuer', max: 200, required: true },
      { name: 'issueDate', label: 'Issue Date', type: 'date', required: true },
      { name: 'credentialUrl', label: 'Credential URL (optional)', type: 'url', isUrl: true },
    ],
    titleField: (e) => e.name,
    subField: (e) => e.issuer,
    meta: (e) => [`Issued ${formatDate(e.issueDate)}`],
  },
  preferredRoles: {
    title: 'Preferred Roles',
    api: preferredRolesApi,
    dataKey: 'preferredRoles',
    addLabel: '+ Add Role',
    duplicateField: 'roleName',
    fields: [{ name: 'roleName', label: 'Role Name', max: 100, required: true }],
    titleField: (e) => e.roleName,
    subField: () => null,
    meta: () => [],
  },
  preferredLocations: {
    title: 'Preferred Locations',
    api: preferredLocationsApi,
    dataKey: 'preferredLocations',
    addLabel: '+ Add Location',
    duplicateField: 'locationName',
    fields: [{ name: 'locationName', label: 'Location Name', max: 100, required: true }],
    titleField: (e) => e.locationName,
    subField: () => null,
    meta: () => [],
  },
  languages: {
    title: 'Languages Known',
    api: languagesApi,
    dataKey: 'languages',
    addLabel: '+ Add Language',
    duplicateField: 'language',
    fields: [
      { name: 'language', label: 'Language', max: 50, required: true },
      {
        name: 'proficiency',
        label: 'Proficiency',
        type: 'select',
        required: true,
        options: [
          { value: 'BEGINNER', label: 'Beginner' },
          { value: 'CONVERSATIONAL', label: 'Conversational' },
          { value: 'FLUENT', label: 'Fluent' },
          { value: 'NATIVE', label: 'Native' },
        ],
      },
    ],
    titleField: (e) => e.language,
    subField: () => null,
    meta: (e) => [e.proficiency],
  },
  references: {
    title: 'References',
    api: referencesApi,
    dataKey: 'references',
    addLabel: '+ Add Reference',
    fields: [
      { name: 'name', label: 'Name', max: 100, required: true },
      { name: 'relation', label: 'Relationship (e.g. Manager, Professor)', max: 100, required: true },
      { name: 'contactInfo', label: 'Contact Info (phone or email)', max: 500, required: true },
    ],
    titleField: (e) => e.name,
    subField: (e) => e.relation,
    meta: (e) => [e.contactInfo],
  },
};

const EMPTY_INITIAL = {
  education: { institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '' },
  certifications: { name: '', issuer: '', issueDate: '', credentialUrl: '' },
  preferredRoles: { roleName: '' },
  preferredLocations: { locationName: '' },
  languages: { language: '', proficiency: 'CONVERSATIONAL' },
  references: { name: '', relation: '', contactInfo: '' },
};

const currentYear = new Date().getFullYear();
const YEAR_MIN = 1900;
const YEAR_MAX = currentYear + 5;

export default function ListSection({ kind, profile, refresh }) {
  const cfg = CONFIG[kind];
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const entries = profile[cfg.dataKey] || [];

  const [editing, setEditing] = useState(null); // entry being edited, or 'new'
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const openNew = () => {
    resetFieldErrors();
    setFormErrors({});
    setForm({ ...EMPTY_INITIAL[kind] });
    setEditing('new');
  };

  const openEdit = (entry) => {
    resetFieldErrors();
    setFormErrors({});
    const initial = {};
    for (const f of cfg.fields) {
      let v = entry[f.name];
      if (f.type === 'date' && v) v = String(v).slice(0, 10);
      initial[f.name] = v ?? '';
    }
    setForm(initial);
    setEditing(entry);
  };

  const close = () => {
    setEditing(null);
    setForm(null);
  };

  const validate = () => {
    const errs = {};
    for (const f of cfg.fields) {
      const v = String(form[f.name] ?? '').trim();
      if (f.required && !v) errs[f.name] = 'Required';
      if (v && f.max && v.length > f.max) errs[f.name] = `Max ${f.max} characters`;
      if (v && f.isUrl && !/^https?:\/\/.+/i.test(v)) errs[f.name] = 'Must be a valid URL (https://…)';
      if (v && f.type === 'number') {
        const n = Number(v);
        if (!Number.isInteger(n)) errs[f.name] = 'Must be a whole number';
        else if (f.name === 'startYear' || f.name === 'endYear') {
          if (n < YEAR_MIN || n > YEAR_MAX) errs[f.name] = `Must be between ${YEAR_MIN} and ${YEAR_MAX}`;
          if (f.name === 'endYear' && form.startYear && n < Number(form.startYear))
            errs[f.name] = 'End year must be after start year';
        }
      }
    }
    // Local duplicate guard where the backend enforces uniqueness (409 otherwise)
    if (cfg.duplicateField) {
      const val = String(form[cfg.duplicateField] ?? '').trim().toLowerCase();
      const dup = entries.some(
        (e) => e[cfg.duplicateField].toLowerCase() === val && (editing === 'new' || e.id !== editing.id)
      );
      if (dup) errs[cfg.duplicateField] = 'You already added this — duplicates are not allowed';
    }
    return errs;
  };

  const onSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const body = {};
      for (const f of cfg.fields) {
        let v = form[f.name];
        if (typeof v === 'string') v = v.trim();
        if (f.type === 'number') v = v === '' ? null : Number(v);
        else if (v === '' && (f.isUrl || f.name === 'endYear' || f.name === 'grade')) v = null;
        body[f.name] = v;
      }
      if (editing === 'new') await cfg.api.create(body);
      else await cfg.api.update(editing.id, body);
      toast.success(editing === 'new' ? 'Added' : 'Updated');
      close();
      await refresh();
    } catch (err) {
      applyApiError(err); // maps API [{field,message}] onto the form
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await cfg.api.remove(deleting.id);
      toast.success('Deleted');
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-card-head">
        <div>
          <h2>{cfg.title}</h2>
          <p>{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>{cfg.addLabel}</button>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-title">Nothing here yet</div>
          <div className="empty-note">Add your first entry to strengthen your profile.</div>
        </div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="entry-card">
            <div className="entry-card-head">
              <div>
                <div className="entry-title">{cfg.titleField(entry)}</div>
                {cfg.subField(entry) && <div className="entry-sub">{cfg.subField(entry)}</div>}
                <div className="entry-meta">
                  {cfg.meta(entry).filter(Boolean).map((m, i) => (
                    <span key={i}>{m}</span>
                  ))}
                </div>
              </div>
              <div className="entry-actions">
                <button className="icon-btn" onClick={() => openEdit(entry)} title="Edit">✏️</button>
                <button className="icon-btn danger" onClick={() => setDeleting(entry)} title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        ))
      )}

      {editing && (
        <Modal title={editing === 'new' ? cfg.addLabel.replace('+ ', '') : 'Edit'} onClose={close}>
          <form onSubmit={onSave} noValidate>
            {cfg.fields.map((f) => {
              const error = formErrors[f.name] || (fieldErrors[f.name] === 'Required' ? fieldErrors[f.name] : fieldErrors[f.name]);
              return (
                <Field key={f.name} label={f.label} required={f.required} error={error}>
                  {f.type === 'select' ? (
                    <select
                      value={form[f.name]}
                      onChange={(e) => setForm((fm) => ({ ...fm, [f.name]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      maxLength={f.max}
                      value={form[f.name]}
                      min={f.type === 'number' ? YEAR_MIN : undefined}
                      max={f.type === 'number' ? YEAR_MAX : undefined}
                      onChange={(e) => setForm((fm) => ({ ...fm, [f.name]: e.target.value }))}
                    />
                  )}
                </Field>
              );
            })}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete entry" onClose={() => setDeleting(null)} width={420}>
          <p style={{ marginTop: 0 }}>Delete “{cfg.titleField(deleting)}”? This cannot be undone.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={onDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
