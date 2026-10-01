import { useState } from 'react';
import { updateAvailability } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

const OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediately' },
  { value: 'DAYS_15', label: 'Within 15 days' },
  { value: 'DAYS_30', label: 'Within 30 days' },
  { value: 'DAYS_60_PLUS', label: '60+ days' },
];

export default function AvailabilitySection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const [value, setValue] = useState(profile.availability?.availability || '');
  const [busy, setBusy] = useState(false);

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    if (!value) {
      applyApiError({ errors: [{ field: 'availability', message: 'Select your availability' }] });
      return;
    }
    setBusy(true);
    try {
      if (value === (profile.availability?.availability || '')) {
        toast.info('Nothing to update');
        return;
      }
      await updateAvailability(value);
      toast.success('Availability saved');
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
          <h2>Availability</h2>
          <p>How soon can you start a new role?</p>
        </div>
      </div>
      <Field label="Availability" error={fieldErrors.availability}>
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Select…</option>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Availability'}</button>
    </form>
  );
}
