import { useState } from 'react';
import { updateAddress } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

export default function AddressSection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const addr = profile.address; // null until first save
  const [form, setForm] = useState({
    line1: addr?.line1 || '',
    line2: addr?.line2 || '',
    city: addr?.city || '',
    state: addr?.state || '',
    country: addr?.country || '',
    pincode: addr?.pincode || '',
  });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    const errs = {};
    if (!addr) {
      // First save ever: Line 1 / City / State / Country / Pincode required together
      for (const k of ['line1', 'city', 'state', 'country', 'pincode']) {
        if (!form[k].trim()) errs[k] = 'Required on first save';
      }
    }
    if (Object.keys(errs).length) {
      applyApiError({ errors: Object.entries(errs).map(([field, message]) => ({ field, message })) });
      return;
    }
    setBusy(true);
    try {
      const body = {};
      for (const k of ['line1', 'line2', 'city', 'state', 'country', 'pincode']) {
        const val = form[k].trim() || null;
        const cur = addr?.[k] ?? null;
        if (val !== cur) body[k] = val;
      }
      if (Object.keys(body).length === 0) {
        toast.info('Nothing to update');
        return;
      }
      await updateAddress(body);
      toast.success('Address saved');
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
          <h2>Address</h2>
          <p>{addr ? 'Update your address any time.' : 'Line 1, City, State, Country and Postal Code are required on first save.'}</p>
        </div>
      </div>
      <Field label="Address Line 1" error={fieldErrors.line1}>
        <input type="text" maxLength={200} value={form.line1} onChange={set('line1')} />
      </Field>
      <Field label="Address Line 2 (optional)" error={fieldErrors.line2}>
        <input type="text" maxLength={200} value={form.line2} onChange={set('line2')} />
      </Field>
      <div className="form-row">
        <Field label="City" error={fieldErrors.city}>
          <input type="text" maxLength={100} value={form.city} onChange={set('city')} />
        </Field>
        <Field label="State" error={fieldErrors.state}>
          <input type="text" maxLength={100} value={form.state} onChange={set('state')} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Country" error={fieldErrors.country}>
          <input type="text" maxLength={100} value={form.country} onChange={set('country')} />
        </Field>
        <Field label="Postal Code" error={fieldErrors.pincode}>
          <input type="text" maxLength={20} value={form.pincode} onChange={set('pincode')} />
        </Field>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Address'}</button>
    </form>
  );
}
