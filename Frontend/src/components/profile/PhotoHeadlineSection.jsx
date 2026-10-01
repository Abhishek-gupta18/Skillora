import { useState } from 'react';
import { updatePhotoHeadline } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

export default function PhotoHeadlineSection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const ph = profile.photoHeadline || {};
  const [form, setForm] = useState({ photoUrl: ph.photoUrl || '', headline: ph.headline || '' });
  const [busy, setBusy] = useState(false);

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    if (form.photoUrl && !/^https?:\/\/.+/i.test(form.photoUrl.trim())) {
      applyApiError({ errors: [{ field: 'photoUrl', message: 'Photo URL must be a valid URL' }] });
      return;
    }
    setBusy(true);
    try {
      const body = {};
      const newUrl = form.photoUrl.trim() || null;
      const newHeadline = form.headline.trim();
      if (newUrl !== (ph.photoUrl || null)) body.photoUrl = newUrl;
      if (newHeadline !== (ph.headline || '')) body.headline = newHeadline;
      if (Object.keys(body).length === 0) {
        toast.info('Nothing to update');
        return;
      }
      await updatePhotoHeadline(body);
      toast.success('Photo & headline saved');
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
          <h2>Photo &amp; Headline</h2>
          <p>Paste a link to an external image — there is no photo upload.</p>
        </div>
      </div>
      <div className="flex mb-16" style={{ alignItems: 'flex-start', gap: 20 }}>
        {form.photoUrl ? (
          <img
            src={form.photoUrl}
            alt="Profile preview"
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)', flex: 'none' }} />
        )}
        <div className="grow">
          <Field label="Photo URL" error={fieldErrors.photoUrl} hint="External image link (https://…)">
            <input
              type="url"
              value={form.photoUrl}
              onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
              placeholder="https://example.com/me.jpg"
            />
          </Field>
        </div>
      </div>
      <Field label="Headline" error={fieldErrors.headline} hint={`${form.headline.length}/200 characters`}>
        <input
          type="text"
          value={form.headline}
          maxLength={200}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          placeholder="e.g. Full-stack developer who loves clean APIs"
        />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Photo & Headline'}</button>
    </form>
  );
}
