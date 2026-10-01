import { useState } from 'react';
import { updateSalaryExpectation } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];

export default function SalarySection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const se = profile.salaryExpectation;
  const [form, setForm] = useState({
    minAmount: se?.minAmount ?? '',
    maxAmount: se?.maxAmount ?? '',
    currency: se?.currency || 'INR',
  });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    const errs = {};
    const min = form.minAmount === '' ? null : Number(form.minAmount);
    const max = form.maxAmount === '' ? null : Number(form.maxAmount);
    for (const [label, v] of [['Minimum', min], ['Maximum', max]]) {
      if (v !== null && (!Number.isInteger(v) || v < 0)) errs[label === 'Minimum' ? 'minAmount' : 'maxAmount'] = 'Must be a non-negative whole number';
    }
    if (!errs.minAmount && !errs.maxAmount && min !== null && max !== null && max < min) {
      errs.maxAmount = 'Maximum must be greater than or equal to Minimum';
    }
    if (Object.keys(errs).length) {
      applyApiError({ errors: Object.entries(errs).map(([field, message]) => ({ field, message })) });
      return;
    }
    setBusy(true);
    try {
      const body = {};
      if (min !== null && min !== (se?.minAmount ?? null)) body.minAmount = min;
      if (max !== null && max !== (se?.maxAmount ?? null)) body.maxAmount = max;
      if (form.currency !== (se?.currency || 'INR')) body.currency = form.currency;
      if (Object.keys(body).length === 0) {
        toast.info('Nothing to update');
        return;
      }
      await updateSalaryExpectation(body);
      toast.success('Salary expectation saved');
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
          <h2>Salary Expectation</h2>
          <p>Whole numbers in your chosen currency (annual).</p>
        </div>
      </div>
      <div className="form-row">
        <Field label="Minimum Amount" error={fieldErrors.minAmount}>
          <input type="number" min="0" step="1" value={form.minAmount} onChange={set('minAmount')} placeholder="e.g. 800000" />
        </Field>
        <Field label="Maximum Amount" error={fieldErrors.maxAmount}>
          <input type="number" min="0" step="1" value={form.maxAmount} onChange={set('maxAmount')} placeholder="e.g. 1200000" />
        </Field>
        <Field label="Currency" error={fieldErrors.currency}>
          <select value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Salary Expectation'}</button>
    </form>
  );
}
