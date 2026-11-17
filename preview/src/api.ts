const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1"
).replace(/\/$/, "")

export type AuthUser = {
  id: string
  email: string
  role: string
}

export type AuthSession = {
  token: string
  user: AuthUser
}

export type RegisterInput = {
  name: string
  email: string
  phone: string
  dob: string
  gender: "male" | "female" | "other" | "prefer_not_to_say"
  password: string
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
  errors?: { field: string; message: string }[]
}

export class ApiError extends Error {
  status: number
  errors: { field: string; message: string }[]

  constructor(
    status: number,
    message: string,
    errors: { field: string; message: string }[] = []
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const { method = "GET", body, token } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      0,
      "Can't reach the Proventa API. Make sure the server is running on port 5000."
    )
  }

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.message ?? "Something went wrong. Please try again.",
      payload?.errors
    )
  }

  return payload.data as T
}

export function login(input: { email: string; password: string }) {
  return request<AuthSession>("/auth/login", { method: "POST", body: input })
}

export function register(input: RegisterInput) {
  return request<AuthSession>("/auth/register", {
    method: "POST",
    body: input,
  })
}

export const SESSION_KEY = "proventa.session"

export function saveSession(session: AuthSession, persistent: boolean) {
  try {
    const value = JSON.stringify(session)
    if (persistent) {
      window.localStorage.setItem(SESSION_KEY, value)
      window.sessionStorage.removeItem(SESSION_KEY)
    } else {
      window.sessionStorage.setItem(SESSION_KEY, value)
      window.localStorage.removeItem(SESSION_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — the session
    // still exists in memory for this tab, so this is not a blocking failure.
  }
}

export function readSession(): AuthSession | null {
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ??
      window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage failures; nothing else to clean up.
  }
}

/* ---------- Dashboard (GET /api/v1/dashboard) ---------- */

export type NotificationItem = {
  id: string
  type: string
  title: string
  body?: string
  linkTo?: string | null
  readAt: string | null
  createdAt: string
}

export type DashboardData = {
  user: {
    id: string
    email: string
    role: string
    status: string
    joinedAt: string
    firstName: string | null
    lastName: string | null
    fullName: string | null
    title: string | null
    avatarInitials: string
  } | null
  targetRole: { title: string | null } | null
  readiness: {
    readinessScore: number | null
    verifiedSkillsCount: number
    claimedSkillsCount: number
    skillGapCount: number
    profileCompletion: number
  }
  profileCompletion: {
    completionPercent?: number
    percent?: number
    completeSections?: string[]
    incompleteSections?: string[]
    missingSections?: string[]
  }
  verifiedSkills: {
    id: string
    name: string
    proficiency: number | null
    state: string
    level: number | null
    selfRatedLevel: number | null
    lastAssessedAt: string | null
  }[]
  skillGaps: {
    skillId: string
    skill: string
    currentLevel: number
    requiredLevel: number
    gap: number
  }[]
  recommendedJobs: {
    id: string
    role: string
    company: string
    location: string
    workMode: string
    postedAt: string
    match: number
    eligibility: string
    topGap: number
  }[]
  applications: {
    total: number
    byStage: Record<string, number>
    recent: {
      id: string
      role: string | null
      company: string | null
      status: string
      appliedAt: string
    }[]
  }
  pendingTests: {
    id: string
    title: string
    skill: string
    status: string
    activeSessionId?: string
    expiresAt?: string
  }[]
  roadmap: {
    id: string
    targetSkill: string
    overallProgress: number
    currentStep: { id: string; title: string } | null
  } | null
  interviewInsights: {
    id: string
    companyName: string
    roleTitle: string
    outcome: string
    interviewDate: string | null
    narrative: string | null
    rounds: { roundType: string; questionsAsked: string[] }[]
  }[]
  notifications: { unreadCount: number; latest: NotificationItem[] }
  generatedAt: string
}

export function getDashboard(token: string) {
  return request<DashboardData>("/dashboard", { token })
}

/* ---------- Profile (GET /api/v1/profile/me) ---------- */

export type ProfileData = {
  basicInfo: {
    name: string
    dob: string
    gender: string
    phone: string | null
  } | null
  photoHeadline: { photoUrl: string | null; headline: string } | null
  address: {
    line1: string
    line2: string | null
    city: string
    state: string
    country: string
    pincode: string
  } | null
  educationEntries: unknown[]
  experienceEntries: unknown[]
  skillClaims: {
    id: string
    skillId: string
    selfRatedLevel: number
    verifiedLevel: number | null
    verifiedScore: number | null
    verifiedAt: string | null
    skill: { name: string }
  }[]
  certifications: unknown[]
  projects: unknown[]
  careerSummary: { text: string } | null
  preferredRoles: { id: string; roleName: string }[]
  preferredLocations: { id: string; locationName: string }[]
  salaryExpectation: {
    minAmount: number
    maxAmount: number
    currency: string
  } | null
  availability: { availability: string } | null
  languages: unknown[]
  socialLinks: unknown[]
  resume: { fileUrl: string } | null
  references: unknown[]
  privacyConsent: {
    profileVisibility: string
    dataSharingConsent: boolean
  } | null
}

export function getProfile(token: string) {
  return request<ProfileData>("/profile/me", { token })
}

export function updatePrivacyConsent(
  token: string,
  input: { profileVisibility?: string; dataSharingConsent?: boolean }
) {
  return request<unknown>("/profile/me/privacy-consent", {
    method: "PATCH",
    token,
    body: input,
  })
}

export function updateAvailability(token: string, availability: string) {
  return request<unknown>("/profile/me/availability", {
    method: "PATCH",
    token,
    body: { availability },
  })
}

/* ---------- Preferred roles & locations ---------- */

export function addPreferredRole(token: string, roleName: string) {
  return request<unknown>("/profile/preferred-roles", {
    method: "POST",
    token,
    body: { roleName },
  })
}

export function removePreferredRole(token: string, id: string) {
  return request<unknown>(`/profile/preferred-roles/${id}`, {
    method: "DELETE",
    token,
  })
}

export function addPreferredLocation(token: string, locationName: string) {
  return request<unknown>("/profile/preferred-locations", {
    method: "POST",
    token,
    body: { locationName },
  })
}

export function removePreferredLocation(token: string, id: string) {
  return request<unknown>(`/profile/preferred-locations/${id}`, {
    method: "DELETE",
    token,
  })
}

/* ---------- Notifications ---------- */

export function getNotifications(token: string) {
  return request<{
    items: NotificationItem[]
    unreadCount: number
    total?: number
    page?: number
    limit?: number
  }>("/notifications?limit=50", { token })
}

export function markAllNotificationsRead(token: string) {
  return request<unknown>("/notifications/read-all", {
    method: "POST",
    token,
    body: {},
  })
}
