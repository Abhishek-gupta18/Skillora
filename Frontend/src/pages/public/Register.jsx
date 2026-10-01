import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../../components/ui';

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
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 16;
}

export default function Register() {
  const navigate = useNavigate();
  const { handleAuthSuccess } = useAuth();
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', dob: '', gender: '' });
  const [clientErrors, setClientErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (form.email.length > 255) errs.email = 'Email must be at most 255 characters';
    if (!form.password) errs.password = 'Password is required';
    else {
      if (form.password.length < 8 || form.password.length > 72)
        errs.password = 'Password must be between 8 and 72 characters';
      else if (!(/[A-Za-z]/.test(form.password) && /\d/.test(form.password)))
        errs.password = 'Password must contain at least one letter and one number';
    }
    if (!form.name.trim()) errs.name = 'Full name is required';
    else if (form.name.trim().length < 2 || form.name.trim().length > 100)
      errs.name = 'Name must be between 2 and 100 characters';
    else if (!/^[A-Za-z\s'-]+$/.test(form.name.trim()))
      errs.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^\+?[1-9]\d{1,14}$/.test(form.phone.trim())) errs.phone = 'Invalid phone format (e.g. +919876543210)';
    if (!form.dob) errs.dob = 'Date of birth is required';
    else if (!isAtLeast16(form.dob)) errs.dob = 'Must be at least 16 years old';
    if (!form.gender) errs.gender = 'Gender is required';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBanner('');
    const errs = validate();
    setClientErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    resetFieldErrors();
    try {
      const res = await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        dob: form.dob,
        gender: form.gender,
      });
      const user = handleAuthSuccess(res.data);
      navigate('/profile', {
        state: { banner: "Welcome! Let's complete your profile" },
        replace: true,
      });
      return user;
    } catch (err) {
      applyApiError(err);
      // Show the API's generic message exactly as returned — do not reword it.
      setBanner(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const err = (k) => clientErrors[k] || fieldErrors[k];

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">S</span> Skillora
          </Link>
        </div>
        <div className="card">
          <h2>Create your account</h2>
          <p className="page-sub mb-16">Start building your skill profile in minutes.</p>

          {banner && <div className="form-error-banner">{banner}</div>}

          <form onSubmit={onSubmit} noValidate>
            <Field label="Full Name" required error={err('name')} htmlFor="reg-name">
              <input
                id="reg-name"
                type="text"
                value={form.name}
                onChange={set('name')}
                maxLength={100}
                placeholder="e.g. Priya Sharma"
              />
            </Field>

            <Field label="Email" required error={err('email')} htmlFor="reg-email">
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                maxLength={255}
                placeholder="you@example.com"
              />
            </Field>

            <Field
              label="Password"
              required
              error={err('password')}
              hint="8–72 characters, with at least one letter and one number."
              htmlFor="reg-password"
            >
              <input id="reg-password" type="password" value={form.password} onChange={set('password')} maxLength={72} />
            </Field>

            <Field
              label="Phone"
              required
              error={err('phone')}
              hint="International format, e.g. +919876543210"
              htmlFor="reg-phone"
            >
              <input id="reg-phone" type="text" value={form.phone} onChange={set('phone')} placeholder="+919876543210" />
            </Field>

            <Field
              label="Date of Birth"
              required
              error={err('dob')}
              hint="You must be at least 16 years old."
              htmlFor="reg-dob"
            >
              <input id="reg-dob" type="date" value={form.dob} onChange={set('dob')} />
            </Field>

            <Field label="Gender" required error={err('gender')} htmlFor="reg-gender">
              <select id="reg-gender" value={form.gender} onChange={set('gender')}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
