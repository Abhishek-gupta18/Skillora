import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../api/endpoints';
import { consumeSessionExpiredFlag } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Field } from '../../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const { handleAuthSuccess } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (consumeSessionExpiredFlag()) setBanner('Session expired. Please log in again.');
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBanner('');
    if (!form.email.trim() || !form.password) {
      setBanner('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await login({ email: form.email.trim(), password: form.password });
      const user = handleAuthSuccess(res.data);
      // Route by role — admins enter the separate Admin app here.
      navigate(user.role === 'ADMIN' ? '/admin/companies' : '/dashboard', { replace: true });
    } catch (err) {
      // Show the API's message as-is — it is intentionally generic.
      setBanner(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">S</span> Skillora
          </Link>
        </div>
        <div className="card">
          <h2>Welcome back</h2>
          <p className="page-sub mb-16">Log in to continue to Skillora.</p>

          {banner && <div className="form-error-banner">{banner}</div>}

          <form onSubmit={onSubmit} noValidate>
            <Field label="Email" required htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" required htmlFor="login-password">
              <input
                id="login-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </Field>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
              {busy ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        </div>
        <div className="auth-footer">
          New to Skillora? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
