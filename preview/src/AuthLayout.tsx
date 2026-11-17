import type { ReactNode } from "react"
import "./auth.css"

export type AuthPoint = { title: string; description: string }

type AuthLayoutProps = {
  eyebrow: string
  title: ReactNode
  lead: string
  points: AuthPoint[]
  asideCard: ReactNode
  asideNote: string
  children: ReactNode
}

export function AuthLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 25 25" aria-hidden="true">
      <path d="M3 20.5L8.5 4.5H14.2L10 20.5H3Z" fill="#F3924B" />
      <path
        d="M12.5 20.5L17.5 4.5H22L17.2 20.5H12.5Z"
        fill="#F4EBDD"
      />
    </svg>
  )
}

export function ProgressMeter({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="auth-meter">
      <div className="auth-meter-row">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div
        className="auth-meter-track"
        role="img"
        aria-label={`${label} ${value} percent`}
      >
        <div className="auth-meter-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function AuthLayout({
  eyebrow,
  title,
  lead,
  points,
  asideCard,
  asideNote,
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <div className="auth-topbar-inner">
          <a className="auth-brand" href="#/" aria-label="Proventa home">
            <AuthLogo />
            <span className="auth-brand-word">Proventa</span>
          </a>
          <a className="auth-home" href="#/">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9.5 3 5 8l4.5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back to home</span>
          </a>
        </div>
      </header>

      <main className="auth-body">
        <aside className="auth-aside">
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-lead">{lead}</p>
          <ol className="auth-points">
            {points.map((point, index) => (
              <li key={point.title}>
                <span className="auth-point-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="auth-point-title">{point.title}</p>
                  <p className="auth-point-desc">{point.description}</p>
                </div>
              </li>
            ))}
          </ol>
          {asideCard}
          <p className="auth-aside-note">{asideNote}</p>
        </aside>

        <div>{children}</div>
      </main>
    </div>
  )
}
