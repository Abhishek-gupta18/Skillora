import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { DashboardData } from "../api"
import "./dashboard.css"

type IconName =
  | "overview"
  | "matches"
  | "assessments"
  | "roadmap"
  | "applications"
  | "interviews"
  | "bell"
  | "profile"
  | "preferences"
  | "settings"
  | "logout"
  | "menu"
  | "close"

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true as const,
  }
  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    case "matches":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="12" height="8.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 5V3.6A1.6 1.6 0 0 1 7.1 2h1.8a1.6 1.6 0 0 1 1.6 1.6V5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 8.5h12" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    case "assessments":
      return (
        <svg {...common}>
          <rect x="3" y="2.5" width="10" height="11.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.8 8.2 7.3 9.7l3-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case "roadmap":
      return (
        <svg {...common}>
          <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 4h3.5A2.5 2.5 0 0 1 12 6.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "applications":
      return (
        <svg {...common}>
          <path d="M4 2.5h5.5L13 6v7.5H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M9 2.5V6h4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.2 9.2h4.4M6.2 11.4h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "interviews":
      return (
        <svg {...common}>
          <path d="M2.5 4.2A1.7 1.7 0 0 1 4.2 2.5h7.6a1.7 1.7 0 0 1 1.7 1.7v4.6a1.7 1.7 0 0 1-1.7 1.7H7l-3.2 2.6v-2.6h-.1a1.2 1.2 0 0 1-1.2-1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    case "bell":
      return (
        <svg {...common}>
          <path d="M4 6.5a4 4 0 0 1 8 0c0 2.2.7 3.4 1.2 4H2.8c.5-.6 1.2-1.8 1.2-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6.6 12.6a1.6 1.6 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "profile":
      return (
        <svg {...common}>
          <circle cx="8" cy="5.4" r="2.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2.8 13.4c.5-2.4 2.6-3.8 5.2-3.8s4.7 1.4 5.2 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "preferences":
      return (
        <svg {...common}>
          <path d="M2.5 4.5h5M10.5 4.5h3M2.5 11.5h3M8.5 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="9" cy="4.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="7" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    case "settings":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 1.6v1.8M8 12.6v1.8M1.6 8h1.8M12.6 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "logout":
      return (
        <svg {...common}>
          <path d="M9.5 3.5H4.2A1.2 1.2 0 0 0 3 4.7v6.6a1.2 1.2 0 0 0 1.2 1.2h5.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M10.6 8h3.4M11.8 5.8 14 8l-2.2 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case "close":
      return (
        <svg {...common}>
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
  }
}

type NavItem = {
  id: string
  label: string
  icon: IconName
  badge?: number
}

const workspaceNav: NavItem[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "matches", label: "Job matches", icon: "matches" },
  { id: "assessments", label: "Assessments", icon: "assessments" },
  { id: "roadmap", label: "Roadmap", icon: "roadmap" },
  { id: "applications", label: "Applications", icon: "applications" },
  { id: "interviews", label: "Interview intelligence", icon: "interviews" },
  { id: "notifications", label: "Notifications", icon: "bell" },
]

const preferenceNav: NavItem[] = [
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "preferences", label: "Preferences", icon: "preferences" },
  { id: "settings", label: "Settings", icon: "settings" },
]

const sectionTitles: Record<string, string> = {
  overview: "Overview",
  matches: "Job matches",
  assessments: "Assessments",
  roadmap: "Roadmap",
  applications: "Applications",
  interviews: "Interview intelligence",
  notifications: "Notifications",
  profile: "Profile",
  preferences: "Preferences",
  settings: "Settings",
}

function Brand() {
  return (
    <a className="dash-brand" href="#/dashboard" aria-label="Proventa dashboard">
      <svg width="24" height="24" viewBox="0 0 25 25" aria-hidden="true">
        <path d="M3 20.5L8.5 4.5H14.2L10 20.5H3Z" fill="#F3924B" />
        <path d="M12.5 20.5L17.5 4.5H22L17.2 20.5H12.5Z" fill="#F4EBDD" />
      </svg>
      <span className="dash-brand-word">Proventa</span>
    </a>
  )
}

export default function DashboardShell({
  section,
  user,
  pendingTests,
  unreadCount,
  source,
  onSignOut,
  children,
}: {
  section: string
  user: DashboardData["user"]
  pendingTests: number
  unreadCount: number
  source: "live" | "sample"
  onSignOut: () => void
  children: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const badges: Record<string, number> = {
    assessments: pendingTests,
    notifications: unreadCount,
  }

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const badge = badges[item.id] ?? 0
      return (
        <a
          key={item.id}
          className="dash-nav-item"
          data-active={section === item.id}
          href={`#/dashboard/${item.id}`}
          aria-current={section === item.id ? "page" : undefined}
          onClick={() => setDrawerOpen(false)}
        >
          <span className="dash-nav-icon">
            <Icon name={item.icon} />
          </span>
          <span className="dash-nav-label">{item.label}</span>
          {badge > 0 && <span className="dash-nav-badge">{badge}</span>}
        </a>
      )
    })

  return (
    <div className="dash-shell">
      <div
        className="dash-backdrop"
        data-open={drawerOpen}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside className="dash-sidebar" data-open={drawerOpen}>
        <div className="dash-sidebar-top">
          <Brand />
          <button
            type="button"
            className="dash-icon-btn dash-sidebar-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="dash-nav" aria-label="Dashboard">
          <p className="dash-nav-group">Workspace</p>
          {renderNav(workspaceNav)}
          <p className="dash-nav-group">Preferences</p>
          {renderNav(preferenceNav)}
        </nav>

        <div className="dash-sidebar-bottom">
          <a className="dash-landing-link" href="#/">
            <span aria-hidden="true">←</span> View landing page
          </a>
          <div className="dash-sidebar-foot">
            <a className="dash-user" href="#/dashboard/profile">
              <span className="dash-avatar" aria-hidden="true">
                {user?.avatarInitials ?? "??"}
              </span>
              <span className="dash-user-text">
                <span className="dash-user-name">
                  {user?.fullName ?? "Your profile"}
                </span>
                <span className="dash-user-email">
                  {user?.email ?? "Signed in"}
                </span>
              </span>
            </a>
            <button
              type="button"
              className="dash-icon-btn"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <button
              type="button"
              className="dash-icon-btn dash-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              <Icon name="menu" />
            </button>
            <p className="dash-crumbs">
              <span>Dashboard</span>
              <span className="dash-crumbs-sep" aria-hidden="true">
                /
              </span>
              <span className="dash-crumbs-current">
                {sectionTitles[section] ?? "Overview"}
              </span>
            </p>
          </div>
          <div className="dash-topbar-right">
            <span className="dash-source" data-source={source}>
              {source === "live" ? "Live data" : "Sample data"}
            </span>
            <a
              className="dash-icon-btn"
              href="#/dashboard/notifications"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <Icon name="bell" />
              {unreadCount > 0 && <span className="dash-bell-dot" aria-hidden="true" />}
            </a>
            <a className="dash-avatar" href="#/dashboard/profile" aria-label="Open profile">
              {user?.avatarInitials ?? "??"}
            </a>
          </div>
        </header>

        <div className="dash-content">{children}</div>
      </div>
    </div>
  )
}
