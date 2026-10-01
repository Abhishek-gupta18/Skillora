import { useState } from 'react';
import { updateBasicInfo } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function isAtLeast16(dobStr) {
  if (!dobStr) return false;
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 16;
}

export default function BasicInfoSection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const bi = profile.basicInfo || {};
  const [form, setForm] = useState({
    name: bi.name || '',
    dob: bi.dob ? String(bi.dob).slice(0, 10) : '',
    gender: bi.gender || '',
    phone: bi.phone || '',
  });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (form.name && (form.name.trim().length < 2 || !/^[A-Za-z\s'-]+$/.test(form.name.trim())))
      errs.name = 'Name must be 2–100 characters (letters, spaces, hyphens, apostrophes only)';
    if (form.dob && !isAtLeast16(form.dob)) errs.dob = 'Must be at least 16 years old';
    if (form.phone && !/^\+?[1-9]\d{1,14}$/.test(form.phone.trim())) errs.phone = 'Invalid phone format (e.g. +919876543210)';
    return errs;
  };

  const onSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      applyApiError({ errors: Object.entries(errs).map(([field, message]) => ({ field, message })) });
      return;
    }
    setBusy(true);
    resetFieldErrors();
    try {
      const body = {};
      if (form.name.trim() !== (bi.name || '')) body.name = form.name.trim();
      if (form.dob !== (bi.dob ? String(bi.dob).slice(0, 10) : '')) body.dob = form.dob;
      if (form.gender !== (bi.gender || '')) body.gender = form.gender;
      if (form.phone.trim() !== (bi.phone || '')) body.phone = form.phone.trim();
      if (Object.keys(body).length === 0) {
        toast.info('Nothing to update');
        return;
      }
      await updateBasicInfo(body);
      toast.success('Basic info saved');
      await refresh();
    } catch (err) {
      applyApiError(err);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSave} noValidate>
      <div className="section-card-head">
        <div>
          <h2>Basic Info</h2>
          <p>Created when you registered — keep it current.</p>
        </div>
      </div>
      <div className="form-row">
        <Field label="Full Name" error={fieldErrors.name}>
          <input type="text" value={form.name} onChange={set('name')} maxLength={100} />
        </Field>
        <Field label="Phone" error={fieldErrors.phone} hint="International format, e.g. +919876543210">
          <input type="text" value={form.phone} onChange={set('phone')} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Date of Birth" error={fieldErrors.dob} hint="Must be at least 16 years old.">
          <input type="date" value={form.dob} onChange={set('dob')} />
        </Field>
        <Field label="Gender" error={fieldErrors.gender}>
          <select value={form.gender} onChange={set('gender')}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Basic Info'}</button>
    </form>
  );
}
