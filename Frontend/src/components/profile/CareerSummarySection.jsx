import { useState } from 'react';
import { updateCareerSummary } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

export default function CareerSummarySection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const [text, setText] = useState(profile.careerSummary?.text || '');
  const [busy, setBusy] = useState(false);

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    setBusy(true);
    try {
      const newTrim = text.trim();
      const old = profile.careerSummary?.text || '';
      if (newTrim === old.trim()) {
        toast.info('Nothing to update');
        return;
      }
      await updateCareerSummary(newTrim || undefined);
      toast.success('Career summary saved');
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
          <h2>Career Summary</h2>
          <p>A short paragraph at the top of your profile — who you are and where you're heading.</p>
        </div>
      </div>
      <Field label="Summary" error={fieldErrors.text}>
        <textarea
          rows={8}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Backend engineer with 4 years of experience building Node.js APIs…"
        />
        <div className="char-counter">{text.length}/2000</div>
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Summary'}</button>
    </form>
  );
}
