import type { CSSProperties, ReactNode } from "react"
import type { PillTone } from "./format"

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section className={`dash-card ${className}`.trim()} style={style}>
      {children}
    </section>
  )
}

export function CardHead({
  label,
  title,
  action,
}: {
  label: string
  title?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="dash-card-head">
      <div>
        <p className="dash-card-label">{label}</p>
        {title && <h2 className="dash-card-title">{title}</h2>}
      </div>
      {action}
    </header>
  )
}

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="dash-page-head">
      <div>
        <p className="dash-page-eyebrow">{eyebrow}</p>
        <h1 className="dash-page-title">{title}</h1>
        <p className="dash-page-sub">{description}</p>
      </div>
      {actions && <div className="dash-page-actions">{actions}</div>}
    </header>
  )
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string
  value: string | number
  unit?: string
  hint?: string
  tone?: "accent" | "ok" | "warn"
}) {
  return (
    <div className="dash-stat" data-tone={tone}>
      <p className="dash-stat-label">{label}</p>
      <p className="dash-stat-value">
        {value}
        {unit && <span className="dash-stat-unit">{unit}</span>}
      </p>
      {hint && <p className="dash-stat-hint">{hint}</p>}
    </div>
  )
}

export function Meter({
  value,
  tone = "accent",
  label,
}: {
  value: number
  tone?: "accent" | "ok" | "warn" | "danger"
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className="dash-meter-track"
      role="img"
      aria-label={`${label ? `${label}: ` : ""}${clamped} percent`}
    >
      <div
        className="dash-meter-fill"
        data-tone={tone}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function ScoreRing({
  value,
  label,
}: {
  value: number | null
  label: string
}) {
  const size = 108
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.max(0, Math.min(100, value ?? 0))

  return (
    <div
      className="dash-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${value === null ? "not available" : `${value} out of 100`}`}
    >
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(244,235,221,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3924B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dash-ring-center">
        <span>{value === null ? "—" : value}</span>
        <small>/100</small>
      </div>
    </div>
  )
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: PillTone
}) {
  return (
    <span className="dash-pill" data-tone={tone}>
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty-title">{title}</p>
      <p className="dash-empty-desc">{description}</p>
      {action}
    </div>
  )
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode
  tone?: "info" | "danger" | "ok"
}) {
  return (
    <p className="dash-notice" data-tone={tone} role="status">
      <span className="dash-notice-mark" aria-hidden="true">
        {tone === "danger" ? "!" : tone === "ok" ? "✓" : "i"}
      </span>
      <span>{children}</span>
    </p>
  )
}

