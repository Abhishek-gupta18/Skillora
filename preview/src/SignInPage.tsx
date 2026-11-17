import { useState } from "react"
import type { FormEvent } from "react"
import AuthLayout, { ProgressMeter } from "./AuthLayout"
import { ApiError, clearSession, login, saveSession } from "./api"
import type { AuthUser } from "./api"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const points = [
  {
    title: "Verified, not claimed",
    description:
      "Assessment-backed skills surface as evidence instead of a checkbox.",
  },
  {
    title: "Matched with context",
    description:
      "Fit scores explain why a role suits you, not just that it does.",
  },
  {
    title: "A path, not a pile",
    description:
      "Priority-ordered steps show exactly what closes your skill gaps.",
  },
]

function EvidenceCard() {
  return (
    <div className="auth-evidence">
      <div className="auth-evidence-head">
        <span>Profile completeness 82%</span>
        <strong>Live</strong>
      </div>
      <ProgressMeter label="JavaScript" value={78} />
      <ProgressMeter label="React" value={71} />
      <ProgressMeter label="DSA" value={64} />
      <ProgressMeter label="SQL" value={82} />
      <div
        className="auth-evidence-head"
        style={{ marginTop: 12, marginBottom: 6 }}
      >
        <span>Target: Backend Developer</span>
        <strong>Match 78%</strong>
      </div>
      <ProgressMeter label="System design" value={58} />
      <ProgressMeter label="Docker" value={47} />
    </div>
  )
}

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState<AuthUser | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")
    setNotice("")

    const next: Record<string, string> = {}
    const cleanEmail = email.trim()
    if (!cleanEmail) next.email = "Email is required"
    else if (!EMAIL_RE.test(cleanEmail))
      next.email = "Enter a valid email address"
    if (!password) next.password = "Password is required"
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const result = await login({ email: cleanEmail, password })
      saveSession(result, remember)
      setSession(result.user)
      setPassword("")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors.length > 0) {
          setErrors(
            Object.fromEntries(err.errors.map((e) => [e.field, e.message]))
          )
        }
        setFormError(
          err.status === 401
            ? "Those credentials didn't match. Check your email and password."
            : err.message
        )
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Career intelligence, built around you"
      title={
        <>
          Your skills should <span>speak for themselves.</span>
        </>
      }
      lead="Sign in to see verified capability, live match scores, and the exact gaps between where you are and the role you want."
      points={points}
      asideCard={<EvidenceCard />}
      asideNote="10K+ candidate profiles · 500+ companies tracked"
    >
      <div className="auth-card">
        {session ? (
          <div className="auth-success">
            <span className="auth-success-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 10.5 8 14.5 16 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="auth-card-eyebrow">Session active</p>
            <h2 className="auth-success-title">Welcome back.</h2>
            <p className="auth-success-text">
              You're signed in as <strong>{session.email}</strong>
              {session.role ? ` · ${session.role.toLowerCase()}` : ""}. Your
              workspace is ready.
            </p>
            <span className="auth-success-badge">JWT stored on this device</span>
            <div className="auth-success-actions">
              <a className="auth-submit" href="#/dashboard">
                Open dashboard
              </a>
              <a className="auth-ghost" href="#/">
                Back to landing
              </a>
            </div>
            <button
              type="button"
              className="auth-gate-signout"
              onClick={() => {
                clearSession()
                setSession(null)
                setNotice("Signed out on this device.")
              }}
            >
              Sign out of this device
            </button>
          </div>
        ) : (
          <>
            <p className="auth-card-eyebrow">Welcome back</p>
            <h2 className="auth-card-title">Sign in to Proventa</h2>
            <p className="auth-card-sub">
              Pick up where you left off — assessments, matches, and your
              roadmap are waiting.
            </p>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
              {formError && (
                <p className="auth-alert" role="alert">
                  <span className="auth-alert-icon" aria-hidden="true">
                    !
                  </span>
                  {formError}
                </p>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="signin-email">
                  Email
                </label>
                <input
                  id="signin-email"
                  className="auth-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "signin-email-error" : undefined
                  }
                />
                {errors.email && (
                  <p className="auth-field-error" id="signin-email-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signin-password">
                  Password
                </label>
                <div className="auth-password">
                  <input
                    id="signin-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "signin-password-error" : undefined
                    }
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && (
                  <p className="auth-field-error" id="signin-password-error">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="auth-row">
                <label className="auth-check-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Keep me signed in
                </label>
                <button
                  type="button"
                  className="auth-link"
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setNotice(
                      "Password reset isn't connected in this build yet. Ask an admin to reset it."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>

              {notice && (
                <p className="auth-alert is-info" role="status">
                  <span className="auth-alert-icon" aria-hidden="true">
                    i
                  </span>
                  {notice}
                </p>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="auth-card-foot">
              <span>New to Proventa?</span>
              <a className="auth-link" href="#/signup">
                Create an account
              </a>
            </div>
            <p className="auth-card-foot-msg">
              Encrypted in transit · Your profile stays private by default
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
