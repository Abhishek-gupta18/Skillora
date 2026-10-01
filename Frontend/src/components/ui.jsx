import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

/* ---------------- Field ---------------- */

export function Field({ label, required, hint, error, children, htmlFor }) {
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error-msg">{error}</div>}
      {hint && error && <div className="field-hint" style={{ marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

/* ---------------- Errors from API ---------------- */

export function useApiFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState({});
  const applyApiError = (err) => {
    if (err instanceof ApiError && err.errors?.length) {
      const map = {};
      for (const e of err.errors) map[e.field] = e.message;
      setFieldErrors(map);
    } else {
      setFieldErrors({});
    }
    return err;
  };
  const resetFieldErrors = () => setFieldErrors({});
  return { fieldErrors, applyApiError, resetFieldErrors };
}

/* ---------------- Badge ---------------- */

const BADGE_TONES = {
  blue: 'badge-blue',
  yellow: 'badge-yellow',
  purple: 'badge-purple',
  red: 'badge-red',
  gray: 'badge-gray',
  green: 'badge-green',
};

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge ${BADGE_TONES[tone] || BADGE_TONES.gray}`}>{children}</span>;
}

export const STATUS_TONES = {
  APPLIED: 'blue',
  UNDER_REVIEW: 'yellow',
  SHORTLISTED: 'purple',
  REJECTED: 'red',
  WITHDRAWN: 'gray',
  HIRED: 'green',
  DRAFT: 'gray',
  OPEN: 'green',
  CLOSED: 'red',
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status] || 'gray'}>{statusLabel(status)}</Badge>;
}

export function statusLabel(status) {
  return String(status || '').replace(/_/g, ' ');
}

/* ---------------- Buttons / Spinner / Empty ---------------- */

export function Spinner({ size = 28 }) {
  return <div className="spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-wrap">
      <Spinner />
      <div>{label}</div>
    </div>
  );
}

export function EmptyState({ title, note, action }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {note && <div className="empty-note">{note}</div>}
      {action}
    </div>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel} width={440}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Tag input (chips) ---------------- */

export function TagInput({ tags, onChange, placeholder, max = 20, maxLen = 50 }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const add = () => {
    const v = value.trim();
    if (!v) return;
    if (v.length > maxLen) return;
    if (tags.includes(v)) {
      setValue('');
      return;
    }
    if (tags.length >= max) return;
    onChange([...tags, v]);
    setValue('');
  };

  return (
    <div className="tag-input">
      <div className="tag-list">
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
            <button type="button" className="tag-x" onClick={() => onChange(tags.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        {tags.length >= max && <span className="tag-max">Max {max} tags</span>}
      </div>
      <input
        ref={inputRef}
        value={value}
        maxLength={maxLen}
        placeholder={tags.length >= max ? `Max ${max} tags` : placeholder}
        disabled={tags.length >= max}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !value && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

/* ---------------- Star rating ---------------- */

export function StarRating({ value, onChange, readOnly }) {
  return (
    <div className={`stars${readOnly ? ' stars-readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          className={`star${n <= value ? ' on' : ''}`}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {readOnly && <span className="stars-num">{value ?? '—'}</span>}
    </div>
  );
}

/* ---------------- Progress ring / bar ---------------- */

export function ProgressRing({ value, size = 110 }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, value || 0));
  const color = filled >= 80 ? '#16a34a' : filled >= 50 ? '#1e5eff' : '#f59e0b';

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ecf5" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(filled / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" className="ring-text" fontSize={size / 5}>
        {filled}%
      </text>
    </svg>
  );
}

export function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${v}%` }} />
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
