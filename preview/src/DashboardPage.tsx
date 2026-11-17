import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import DashboardShell from "./dashboard/DashboardShell"
import Overview from "./dashboard/Overview"
import {
  ApplicationsSection,
  AssessmentsSection,
  InterviewsSection,
  MatchesSection,
  NotificationsSection,
  PreferencesSection,
  ProfileSection,
  RoadmapSection,
  SettingsSection,
} from "./dashboard/Sections"
import type { DashboardActions } from "./dashboard/Sections"
import { Notice } from "./dashboard/ui"
import { devPreview } from "./dev"
import {
  sampleDashboard,
  sampleNotifications,
  sampleProfile,
} from "./dashboard/sampleData"
import {
  ApiError,
  addPreferredLocation,
  addPreferredRole,
  clearSession,
  getDashboard,
  getNotifications,
  getProfile,
  markAllNotificationsRead,
  readSession,
  removePreferredLocation,
  removePreferredRole,
  updateAvailability,
  updatePrivacyConsent,
} from "./api"
import type { DashboardData, NotificationItem, ProfileData } from "./api"

type Source = "loading" | "live" | "sample"

async function fetchWorkspace(token: string) {
  const [dashboard, fullProfile, inbox] = await Promise.all([
    getDashboard(token),
    getProfile(token),
    getNotifications(token),
  ])
  return { dashboard, fullProfile, inbox }
}

function Logo() {
  return (
    <a className="dash-gate-brand" href="#/" aria-label="Proventa home">
      <svg width="28" height="28" viewBox="0 0 25 25" aria-hidden="true">
        <path d="M3 20.5L8.5 4.5H14.2L10 20.5H3Z" fill="#F3924B" />
        <path d="M12.5 20.5L17.5 4.5H22L17.2 20.5H12.5Z" fill="#F4EBDD" />
      </svg>
      <span>Proventa</span>
    </a>
  )
}

export default function DashboardPage({ section }: { section: string }) {
  const [session] = useState(readSession)
  // Development preview: open the workspace with sample data immediately so
  // every feature is reachable without signing in or running the API. A real
  // session still takes priority and loads live data below.
  const startInSample = devPreview && !session
  const [data, setData] = useState<DashboardData | null>(
    startInSample ? sampleDashboard : null
  )
  const [profile, setProfile] = useState<ProfileData | null>(
    startInSample ? sampleProfile : null
  )
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    startInSample ? sampleNotifications : []
  )
  const [source, setSource] = useState<Source>(
    startInSample ? "sample" : "loading"
  )
  const [error, setError] = useState("")
  const [gateSample, setGateSample] = useState(startInSample)

  const applyWorkspace = useCallback(
    (workspace: Awaited<ReturnType<typeof fetchWorkspace>>) => {
      setData(workspace.dashboard)
      setProfile(workspace.fullProfile)
      setNotifications(workspace.inbox.items)
      setSource("live")
      setError("")
    },
    []
  )

  const applyFailure = useCallback((err: unknown) => {
    const message =
      err instanceof ApiError && err.status === 401
        ? "Your session expired before live data could load. Sign in again to reconnect — sample data is shown in the meantime."
        : err instanceof Error
          ? err.message
          : "Could not load your dashboard."
    setError(message)
    setData(sampleDashboard)
    setProfile(sampleProfile)
    setNotifications(sampleNotifications)
    setSource("sample")
  }, [])

  useEffect(() => {
    const token = session?.token
    if (!token) return
    let cancelled = false
    fetchWorkspace(token).then(
      (workspace) => {
        if (!cancelled) applyWorkspace(workspace)
      },
      (err: unknown) => {
        if (!cancelled) applyFailure(err)
      }
    )
    return () => {
      cancelled = true
    }
  }, [session, applyWorkspace, applyFailure])

  const load = useCallback(
    async (token: string) => {
      try {
        applyWorkspace(await fetchWorkspace(token))
      } catch (err) {
        applyFailure(err)
      }
    },
    [applyWorkspace, applyFailure]
  )

  const token = session?.token ?? null
  const isLive = source === "live" && Boolean(token)

  const refresh = useCallback(async () => {
    if (!token) return
    const [dashboard, fullProfile] = await Promise.all([
      getDashboard(token),
      getProfile(token),
    ])
    setData(dashboard)
    setProfile(fullProfile)
  }, [token])

  function enterSample() {
    setData(sampleDashboard)
    setProfile(sampleProfile)
    setNotifications(sampleNotifications)
    setSource("sample")
    setGateSample(true)
    setError("")
  }

  const actions: DashboardActions = {
    addPreferredRole: async (roleName) => {
      if (isLive && token) {
        await addPreferredRole(token, roleName)
        await refresh()
        return
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              preferredRoles: [
                ...current.preferredRoles,
                { id: `sample-role-${Date.now()}`, roleName },
              ],
            }
          : current
      )
    },
    removePreferredRole: async (id) => {
      if (isLive && token) {
        await removePreferredRole(token, id)
        await refresh()
        return
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              preferredRoles: current.preferredRoles.filter(
                (role) => role.id !== id
              ),
            }
          : current
      )
    },
    addPreferredLocation: async (locationName) => {
      if (isLive && token) {
        await addPreferredLocation(token, locationName)
        await refresh()
        return
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              preferredLocations: [
                ...current.preferredLocations,
                { id: `sample-loc-${Date.now()}`, locationName },
              ],
            }
          : current
      )
    },
    removePreferredLocation: async (id) => {
      if (isLive && token) {
        await removePreferredLocation(token, id)
        await refresh()
        return
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              preferredLocations: current.preferredLocations.filter(
                (location) => location.id !== id
              ),
            }
          : current
      )
    },
    savePrivacy: async (input) => {
      if (isLive && token) {
        await updatePrivacyConsent(token, input)
        await refresh()
        return
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              privacyConsent: {
                profileVisibility:
                  input.profileVisibility ??
                  current.privacyConsent?.profileVisibility ??
                  "PRIVATE",
                dataSharingConsent:
                  input.dataSharingConsent ??
                  current.privacyConsent?.dataSharingConsent ??
                  false,
              },
            }
          : current
      )
    },
    saveAvailability: async (availability) => {
      if (isLive && token) {
        await updateAvailability(token, availability)
        await refresh()
        return
      }
      setProfile((current) =>
        current ? { ...current, availability: { availability } } : current
      )
    },
    markAllRead: async () => {
      if (isLive && token) {
        await markAllNotificationsRead(token)
        const inbox = await getNotifications(token)
        setNotifications(inbox.items)
        setData((current) =>
          current
            ? {
                ...current,
                notifications: {
                  unreadCount: inbox.unreadCount,
                  latest: inbox.items.slice(0, 3),
                },
              }
            : current
        )
        return
      }
      const stamp = new Date().toISOString()
      setNotifications((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt ?? stamp }))
      )
      setData((current) =>
        current
          ? {
              ...current,
              notifications: {
                unreadCount: 0,
                latest: current.notifications.latest.map((item) => ({
                  ...item,
                  readAt: item.readAt ?? stamp,
                })),
              },
            }
          : current
      )
    },
  }

  function signOut() {
    clearSession()
    window.location.hash = "#/signin"
  }

  if (!session && !gateSample) {
    return (
      <div className="dash-gate">
        <div className="dash-gate-card">
          <Logo />
          <p className="dash-page-eyebrow">Candidate workspace</p>
          <h1 className="dash-gate-title">Sign in to open your dashboard.</h1>
          <p className="dash-gate-text">
            Readiness, verified skills, skill gaps, matched roles, and your next
            best action all live here.
          </p>
          <div className="dash-gate-actions">
            <a className="dash-btn" href="#/signin">
              Sign in
            </a>
            <a className="dash-btn dash-btn-ghost" href="#/signup">
              Create account
            </a>
          </div>
          <button
            type="button"
            className="dash-gate-sample"
            onClick={enterSample}
          >
            Preview with sample data →
          </button>
          <p className="dash-gate-foot">
            Sample mode reads nothing from the API and writes nothing to it.
          </p>
        </div>
        <a className="dash-gate-home" href="#/">
          ← Back to landing
        </a>
      </div>
    )
  }

  if (!data || source === "loading") {
    return (
      <div className="dash-gate">
        <div className="dash-gate-card">
          <Logo />
          <p className="dash-gate-loading" role="status">
            Loading your workspace…
          </p>
        </div>
      </div>
    )
  }

  const common = {
    data,
    profile,
    actions,
    source: source === "live" ? ("live" as const) : ("sample" as const),
    notifications,
  }

  let content: ReactNode
  switch (section) {
    case "profile":
      content = <ProfileSection {...common} />
      break
    case "matches":
      content = <MatchesSection {...common} />
      break
    case "assessments":
      content = <AssessmentsSection {...common} />
      break
    case "applications":
      content = <ApplicationsSection {...common} />
      break
    case "roadmap":
      content = <RoadmapSection {...common} />
      break
    case "interviews":
      content = <InterviewsSection {...common} />
      break
    case "notifications":
      content = <NotificationsSection {...common} />
      break
    case "preferences":
      content = <PreferencesSection {...common} />
      break
    case "settings":
      content = <SettingsSection {...common} />
      break
    default:
      content = <Overview data={data} />
  }

  return (
    <DashboardShell
      section={section === "" ? "overview" : section}
      user={data.user}
      pendingTests={data.pendingTests.length}
      unreadCount={data.notifications.unreadCount}
      source={source === "live" ? "live" : "sample"}
      onSignOut={signOut}
    >
      {error && (
        <div className="dash-banner">
          <Notice tone="danger">{error}</Notice>
          <div className="dash-banner-actions">
            <a className="dash-btn dash-btn-ghost" href="#/signin">
              Sign in again
            </a>
            {token && (
              <button
                type="button"
                className="dash-btn"
                onClick={() => {
                  setError("")
                  setSource("loading")
                  void load(token)
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      {!error && source === "sample" && (
        <div className="dash-banner">
          <Notice>
            {devPreview
              ? "Development preview: every page is showing sample data, and actions stay local. Sign in to load live data."
              : "You're viewing sample data. Sign in to load your own profile, matches, and applications."}
          </Notice>
          <div className="dash-banner-actions">
            <a className="dash-btn" href="#/signin">
              Sign in
            </a>
          </div>
        </div>
      )}
      {content}
    </DashboardShell>
  )
}
