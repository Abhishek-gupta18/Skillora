import { useState } from "react"
import type { FormEvent } from "react"
import AuthLayout from "./AuthLayout"
import { ApiError, register, saveSession } from "./api"
import type { RegisterInput } from "./api"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[1-9]\d{1,14}$/
const NAME_RE = /^[A-Za-z\s'-]+$/

const points = [
  {
    title: "Build a capability profile",
    description:
      "Skills, projects, and education in one place — reused everywhere.",
  },
  {
    title: "Prove what you claim",
    description:
      "Assessments turn listed skills into verified, evidence-backed capability.",
  },
  {
    title: "See the gap, close it",
    description:
      "Role-based gap analysis and a roadmap ordered by real impact.",
  },
]

const strengths = ["Too short", "Weak", "Fair", "Good", "Strong"]

function scorePassword(value: string) {
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1
  if (value.length >= 12) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return score
}

function maxDateOfBirth() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 16)
  return date.toISOString().slice(0, 10)
}

function SetupCard() {
  const steps = [
    "Create your account",
    "Set a target role",
    "Take a skill assessment",
    "Review your match score",
  ]
  return (
    <div className="auth-evidence">
      <div className="auth-evidence-head">
        <span>Profile setup · 4 steps</span>
        <strong>~3 min</strong>
      </div>
      <ul className="auth-checklist">
        {steps.map((step) => (
          <li key={step}>
            <span className="auth-check" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5.2 4.2 7.4 8 2.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [busy, setBusy] = useState(false)
  const [createdEmail, setCreatedEmail] = useState("")

  const strength = scorePassword(password)
  const latestDob = maxDateOfBirth()

  function validate() {
    const next: Record<string, string> = {}
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const cleanPhone = phone.trim()

    if (!cleanName) next.name = "Full name is required"
    else if (cleanName.length < 2 || cleanName.length > 100)
      next.name = "Name must be between 2 and 100 characters"
    else if (!NAME_RE.test(cleanName))
      next.name = "Use letters, spaces, hyphens, and apostrophes only"

    if (!cleanEmail) next.email = "Email is required"
    else if (!EMAIL_RE.test(cleanEmail))
      next.email = "Enter a valid email address"

    if (!cleanPhone) next.phone = "Phone number is required"
    else if (!PHONE_RE.test(cleanPhone))
      next.phone = "Use country code format, e.g. +919876543210"

    if (!dob) next.dob = "Date of birth is required"
    else if (dob > latestDob)
      next.dob = "You must be at least 16 to create an account"

    if (!gender) next.gender = "Select an option"

    if (!password) next.password = "Password is required"
    else if (password.length < 8 || password.length > 72)
      next.password = "Password must be between 8 and 72 characters"
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      next.password = "Include at least one letter and one number"

    if (!accepted)
      next.terms = "Accept the terms to create your account"

    return next
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const payload: RegisterInput = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dob,
        gender: gender as RegisterInput["gender"],
        password,
      }
      const result = await register(payload)
      saveSession(result, true)
      setCreatedEmail(result.user.email)
      setPassword("")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors.length > 0) {
          setErrors(
            Object.fromEntries(err.errors.map((e) => [e.field, e.message]))
          )
        }
        setFormError(
          err.status === 409
            ? "An account with this email already exists. Try signing in instead."
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
      eyebrow="Create your profile"
      title={
        <>
          Stop guessing. <span>Start knowing.</span>
        </>
      }
      lead="One profile, verified capability, and a clear view of the gap between your skills and the roles you actually want."
      points={points}
      asideCard={<SetupCard />}
      asideNote="Free to start · No credit card required"
    >
      <div className="auth-card">
        {createdEmail ? (
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
            <p className="auth-card-eyebrow">Account created</p>
            <h2 className="auth-success-title">You're in.</h2>
            <p className="auth-success-text">
              Your candidate profile is live for{" "}
              <strong>{createdEmail}</strong>. Next step: set a target role and
              take your first assessment.
            </p>
            <span className="auth-success-badge">
              Profile created · Session saved
            </span>
            <div className="auth-success-actions">
              <a className="auth-submit" href="#/dashboard">
                Open dashboard
              </a>
              <a className="auth-ghost" href="#/">
                Back to landing
              </a>
            </div>
          </div>
        ) : (
          <>
            <p className="auth-card-eyebrow">Get started free</p>
            <h2 className="auth-card-title">Create your account</h2>
            <p className="auth-card-sub">
              Candidate accounts are free. Your profile stays private until you
              choose to share it.
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
                <label className="auth-label" htmlFor="signup-name">
                  Full name
                </label>
                <input
                  id="signup-name"
                  className="auth-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? "signup-name-error" : undefined
                  }
                />
                {errors.name && (
                  <p className="auth-field-error" id="signup-name-error">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-email">
                  Email
                </label>
                <input
                  id="signup-email"
                  className="auth-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "signup-email-error" : undefined
                  }
                />
                {errors.email && (
                  <p className="auth-field-error" id="signup-email-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="auth-field-row">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-phone">
                    Phone
                  </label>
                  <input
                    id="signup-phone"
                    className="auth-input"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={
                      errors.phone ? "signup-phone-error" : undefined
                    }
                  />
                  {errors.phone && (
                    <p className="auth-field-error" id="signup-phone-error">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-dob">
                    Date of birth
                  </label>
                  <input
                    id="signup-dob"
                    className="auth-input"
                    type="date"
                    name="dob"
                    autoComplete="bday"
                    max={latestDob}
                    min="1900-01-01"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    aria-invalid={Boolean(errors.dob)}
                    aria-describedby={
                      errors.dob ? "signup-dob-error" : undefined
                    }
                  />
                  {errors.dob && (
                    <p className="auth-field-error" id="signup-dob-error">
                      {errors.dob}
                    </p>
                  )}
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-gender">
                  Gender
                </label>
                <select
                  id="signup-gender"
                  className="auth-input"
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  aria-invalid={Boolean(errors.gender)}
                  aria-describedby={
                    errors.gender ? "signup-gender-error" : undefined
                  }
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <p className="auth-field-error" id="signup-gender-error">
                    {errors.gender}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-password">
                  Password
                </label>
                <div className="auth-password">
                  <input
                    id="signup-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password
                        ? "signup-password-error"
                        : "signup-password-hint"
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
                <div className="auth-strength" aria-hidden="true">
                  <div className="auth-strength-bars">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="auth-strength-bar"
                        data-level={
                          password && i < strength ? strength : undefined
                        }
                      />
                    ))}
                  </div>
                  <span className="auth-strength-label">
                    {password ? strengths[strength] : "—"}
                  </span>
                </div>
                {errors.password ? (
                  <p className="auth-field-error" id="signup-password-error">
                    {errors.password}
                  </p>
                ) : (
                  <p className="auth-hint" id="signup-password-hint">
                    Needs at least 8 characters, with a letter and a number.
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-check-label">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    aria-invalid={Boolean(errors.terms)}
                  />
                  <span>
                    I agree to the Terms of Service and Privacy Policy, and to
                    Proventa storing my profile data.
                  </span>
                </label>
                {errors.terms && (
                  <p className="auth-field-error">{errors.terms}</p>
                )}
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Creating your account…" : "Create my account"}
              </button>
            </form>

            <div className="auth-card-foot">
              <span>Already have an account?</span>
              <a className="auth-link" href="#/signin">
                Sign in
              </a>
            </div>
            <p className="auth-card-foot-msg">
              Private by default · No credit card required
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
