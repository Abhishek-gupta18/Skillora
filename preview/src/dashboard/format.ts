export type PillTone = "accent" | "ok" | "warn" | "danger" | "muted"

export function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatRelative(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const diff = Date.now() - date.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diff < 60 * 60 * 1000) return "Just now"
  if (diff < day) return `${Math.max(1, Math.round(diff / (60 * 60 * 1000)))}h ago`
  const days = Math.round(diff / day)
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

export function labelize(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function sectionLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function eligibilityTone(label: string): PillTone {
  if (label === "eligible") return "ok"
  if (label === "partially-eligible") return "warn"
  return "danger"
}

export function stageTone(status: string): PillTone {
  if (status === "OFFER" || status === "HIRED") return "ok"
  if (status === "INTERVIEW" || status === "SHORTLISTED") return "accent"
  if (status === "REJECTED" || status === "WITHDRAWN") return "danger"
  return "muted"
}

export function outcomeTone(outcome: string): PillTone {
  if (outcome === "OFFER") return "ok"
  if (outcome === "REJECTED") return "danger"
  return "accent"
}

export function completionPercent(completion: {
  completionPercent?: number
  percent?: number
}) {
  return completion.completionPercent ?? completion.percent ?? 0
}
