import { useState } from 'react';
import { updatePrivacyConsent } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

const VISIBILITY = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'RECRUITERS_ONLY', label: 'Recruiters only' },
  { value: 'PRIVATE', label: 'Private' },
];

export default function PrivacySection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const pc = profile.privacyConsent || {};
  const [visibility, setVisibility] = useState(pc.profileVisibility || 'PRIVATE');
  const [sharing, setSharing] = useState(Boolean(pc.dataSharingConsent));
  const [busy, setBusy] = useState(false);

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    setBusy(true);
    try {
      const body = {};
      if (visibility !== (pc.profileVisibility || 'PRIVATE')) body.profileVisibility = visibility;
      if (sharing !== Boolean(pc.dataSharingConsent)) body.dataSharingConsent = sharing;
      if (Object.keys(body).length === 0) {
        toast.info('Nothing to update');
        return;
      }
      await updatePrivacyConsent(body);
      toast.success('Privacy settings saved');
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
          <h2>Privacy &amp; Consent</h2>
          <p>Control who can see your profile.</p>
        </div>
      </div>

      <Field label="Profile Visibility" error={fieldErrors.profileVisibility}>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          {VISIBILITY.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Data Sharing Consent" error={fieldErrors.dataSharingConsent}
        hint="Allow Skillora to share your profile data for matching purposes.">
        <label className="checkbox-row">
          <input type="checkbox" checked={sharing} onChange={(e) => setSharing(e.target.checked)} />
          I consent to data sharing
        </label>
      </Field>

      {pc.consentTimestamp && (
        <p className="text-sm muted">Consent given on: {new Date(pc.consentTimestamp).toLocaleString()}</p>
      )}

      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Privacy Settings'}</button>
    </form>
  );
}
