import { useState } from "react"
import type { FormEvent } from "react"
import type { DashboardData, NotificationItem, ProfileData } from "../api"
import {
  Card,
  CardHead,
  EmptyState,
  Meter,
  Notice,
  PageHead,
  Pill,
  ScoreRing,
  StatCard,
} from "./ui"
import {
  completionPercent,
  eligibilityTone,
  formatDate,
  formatRelative,
  labelize,
  outcomeTone,
  sectionLabel,
  stageTone,
} from "./format"

export type DashboardActions = {
  addPreferredRole: (roleName: string) => Promise<void>
  removePreferredRole: (id: string) => Promise<void>
  addPreferredLocation: (locationName: string) => Promise<void>
  removePreferredLocation: (id: string) => Promise<void>
  savePrivacy: (input: {
    profileVisibility?: string
    dataSharingConsent?: boolean
  }) => Promise<void>
  saveAvailability: (availability: string) => Promise<void>
  markAllRead: () => Promise<void>
}

type SectionProps = {
  data: DashboardData
  profile: ProfileData | null
  actions: DashboardActions
  source: "live" | "sample"
  notifications?: NotificationItem[]
}

const availabilityLabels: Record<string, string> = {
  IMMEDIATE: "Immediately",
  DAYS_15: "Within 15 days",
  DAYS_30: "Within 30 days",
  DAYS_60_PLUS: "60+ days",
}

const visibilityLabels: Record<string, string> = {
  PUBLIC: "Public",
  RECRUITERS_ONLY: "Recruiters only",
  PRIVATE: "Private",
}

const stageOrder = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]

function useActionState() {
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{
    tone: "ok" | "danger"
    text: string
  } | null>(null)

  async function run(
    key: string,
    task: () => Promise<void>,
    success: string
  ) {
    setBusy(key)
    setNotice(null)
    try {
      await task()
      setNotice({ tone: "ok", text: success })
    } catch (err) {
      setNotice({
        tone: "danger",
        text:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      })
    } finally {
      setBusy(null)
    }
  }

  return { busy, notice, setNotice, run }
}

function formatSalary(expectation: ProfileData["salaryExpectation"]) {
  if (!expectation) return "—"
  const amount = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
  return `${expectation.currency} ${amount(expectation.minAmount)} – ${amount(expectation.maxAmount)}`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/* ---------------- Profile ---------------- */

export function ProfileSection({ data, profile }: SectionProps) {
  const completion = data.profileCompletion
  const percent = completionPercent(completion)
  const complete = completion.completeSections ?? []
  const incomplete =
    completion.incompleteSections ?? completion.missingSections ?? []
  const total = complete.length + incomplete.length
  const claims = profile?.skillClaims ?? []

  return (
    <>
      <PageHead
        eyebrow="Profile"
        title={profile?.basicInfo?.name ?? data.user?.fullName ?? "Your profile"}
        description={
          profile?.photoHeadline?.headline ??
          "This is what recruiters and match scoring see first."
        }
        actions={
          <>
            <a className="dash-btn dash-btn-ghost" href="#/dashboard/preferences">
              Preferences
            </a>
            <a className="dash-btn" href="#/dashboard/settings">
              Privacy settings
            </a>
          </>
        }
      />

      <div className="dash-grid dash-grid-2">
        <Card>
          <CardHead
            label="Completeness"
            title={`${percent}% complete`}
            action={<Pill tone="accent">{`${complete.length}/${total || 18} sections`}</Pill>}
          />
          <Meter value={percent} label="Profile completeness" />
          <p className="dash-hint">
            Each section you complete improves match accuracy and unlocks
            recruiter visibility.
          </p>
          {incomplete.length > 0 && (
            <>
              <p className="dash-micro dash-micro-spaced">Still missing</p>
              <div className="dash-chip-row">
                {incomplete.map((section) => (
                  <span key={section} className="dash-chip">
                    {sectionLabel(section)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHead label="Identity" title="Basic information" />
          <dl className="dash-info-list">
            <InfoRow label="Email" value={data.user?.email ?? "—"} />
            <InfoRow label="Phone" value={profile?.basicInfo?.phone ?? "—"} />
            <InfoRow
              label="Date of birth"
              value={formatDate(profile?.basicInfo?.dob)}
            />
            <InfoRow
              label="Gender"
              value={
                profile?.basicInfo?.gender
                  ? labelize(profile.basicInfo.gender)
                  : "—"
              }
            />
            <InfoRow
              label="Location"
              value={
                profile?.address
                  ? `${profile.address.city}, ${profile.address.country}`
                  : "—"
              }
            />
            <InfoRow
              label="Target role"
              value={data.targetRole?.title ?? "Not set"}
            />
            <InfoRow
              label="Availability"
              value={
                profile?.availability
                  ? (availabilityLabels[profile.availability.availability] ??
                    labelize(profile.availability.availability))
                  : "—"
              }
            />
            <InfoRow
              label="Expected salary"
              value={formatSalary(profile?.salaryExpectation ?? null)}
            />
          </dl>
        </Card>
      </div>

      <Card>
        <CardHead
          label="Capability"
          title="Skill claims"
          action={
            <a className="dash-card-link" href="#/dashboard/assessments">
              Verify a skill
            </a>
          }
        />
        {claims.length === 0 ? (
          <EmptyState
            title="No skills claimed"
            description="Add skills from your profile to start the verification flow."
          />
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th scope="col">Skill</th>
                  <th scope="col">Self-rated</th>
                  <th scope="col">Verified</th>
                  <th scope="col">Score</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <span className="dash-cell-strong">{claim.skill.name}</span>
                    </td>
                    <td>Level {claim.selfRatedLevel}</td>
                    <td>
                      {claim.verifiedLevel === null
                        ? "—"
                        : `Level ${claim.verifiedLevel}`}
                    </td>
                    <td>
                      {claim.verifiedScore === null
                        ? "—"
                        : `${Math.round(claim.verifiedScore)}%`}
                    </td>
                    <td>
                      {claim.verifiedLevel === null ? (
                        <Pill tone="warn">Unverified</Pill>
                      ) : (
                        <Pill tone="ok">Verified</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHead label="Sections" title="Profile coverage" />
        <ul className="dash-section-grid">
          {[...complete, ...incomplete].map((section) => {
            const done = complete.includes(section)
            return (
              <li key={section} data-done={done}>
                <span className="dash-section-mark" aria-hidden="true">
                  {done ? "✓" : "·"}
                </span>
                {sectionLabel(section)}
              </li>
            )
          })}
          {total === 0 && <li>No section data available yet.</li>}
        </ul>
      </Card>
    </>
  )
}

/* ---------------- Job matches ---------------- */

export function MatchesSection({ data }: SectionProps) {
  const jobs = data.recommendedJobs
  const eligible = jobs.filter((job) => job.eligibility === "eligible").length
  const average =
    jobs.length > 0
      ? Math.round(jobs.reduce((sum, job) => sum + job.match, 0) / jobs.length)
      : 0
  const biggestGap = data.skillGaps[0]

  return (
    <>
      <PageHead
        eyebrow="Job matches"
        title="Roles scored against verified capability"
        description={
          data.targetRole?.title
            ? `Ranked for ${data.targetRole.title} using your verified skill levels.`
            : "Set a target role to sharpen these matches."
        }
        actions={
          <a className="dash-btn dash-btn-ghost" href="#/dashboard/preferences">
            Adjust preferences
          </a>
        }
      />

      <div className="dash-stats">
        <StatCard label="Matched roles" value={jobs.length} hint="Open positions" />
        <StatCard
          label="Fully eligible"
          value={eligible}
          hint="Every required skill verified"
          tone="ok"
        />
        <StatCard
          label="Average match"
          value={average}
          unit="%"
          hint="Across recommended roles"
          tone="accent"
        />
        <StatCard
          label="Biggest gap"
          value={biggestGap ? biggestGap.skill : "None"}
          hint={biggestGap ? `+${biggestGap.gap} levels needed` : "Nothing missing"}
          tone={biggestGap ? "warn" : "ok"}
        />
      </div>

      <Card>
        <CardHead
          label="Recommendations"
          title={`${jobs.length} roles ranked by eligibility`}
        />
        {jobs.length === 0 ? (
          <EmptyState
            title="No matches yet"
            description="Matches appear once open roles and your verified skills overlap."
          />
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Location</th>
                  <th scope="col">Match</th>
                  <th scope="col">Eligibility</th>
                  <th scope="col">Top gap</th>
                  <th scope="col">Posted</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <span className="dash-cell-strong">{job.role}</span>
                      <span className="dash-cell-sub">{job.company}</span>
                    </td>
                    <td>
                      {job.location}
                      <span className="dash-cell-sub">
                        {labelize(job.workMode)}
                      </span>
                    </td>
                    <td>
                      <div className="dash-match">
                        <Meter value={job.match} label={job.role} />
                        <span>{job.match}%</span>
                      </div>
                    </td>
                    <td>
                      <Pill tone={eligibilityTone(job.eligibility)}>
                        {labelize(job.eligibility)}
                      </Pill>
                    </td>
                    <td>{job.topGap > 0 ? `+${job.topGap}` : "—"}</td>
                    <td>{formatDate(job.postedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dash-hint">
          Eligibility counts only verified skills. Unverified claims do not
          count toward required levels.
        </p>
      </Card>
    </>
  )
}

/* ---------------- Assessments ---------------- */

export function AssessmentsSection({ data }: SectionProps) {
  const tests = data.pendingTests
  const inProgress = tests.filter((test) => test.status === "in-progress").length

  return (
    <>
      <PageHead
        eyebrow="Assessments"
        title="Turn claims into evidence"
        description="Each completed assessment replaces a self-rating with a verified level that counts toward matches."
      />

      <div className="dash-stats">
        <StatCard label="Pending" value={tests.length} hint="Skills awaiting verification" tone="accent" />
        <StatCard label="In progress" value={inProgress} hint="Active sessions" />
        <StatCard
          label="Verified"
          value={data.readiness.verifiedSkillsCount}
          unit={`/${data.readiness.claimedSkillsCount}`}
          hint="Assessment-backed skills"
          tone="ok"
        />
        <StatCard
          label="Gap impact"
          value={data.skillGaps.length}
          hint="Skills blocking eligibility"
          tone={data.skillGaps.length > 0 ? "warn" : "ok"}
        />
      </div>

      <Card>
        <CardHead label="Queue" title="Assessments to complete" />
        {tests.length === 0 ? (
          <EmptyState
            title="No pending assessments"
            description="Claim another skill from your profile to start a new verification."
          />
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th scope="col">Assessment</th>
                  <th scope="col">Status</th>
                  <th scope="col">Session</th>
                  <th scope="col">Expires</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={`${test.id}-${test.status}`}>
                    <td>
                      <span className="dash-cell-strong">{test.skill}</span>
                      <span className="dash-cell-sub">{test.title}</span>
                    </td>
                    <td>
                      <Pill
                        tone={
                          test.status === "in-progress"
                            ? "accent"
                            : test.status.startsWith("retake")
                              ? "warn"
                              : "muted"
                        }
                      >
                        {labelize(test.status)}
                      </Pill>
                    </td>
                    <td className="dash-mono">
                      {test.activeSessionId ? test.activeSessionId.slice(0, 10) : "—"}
                    </td>
                    <td>{test.expiresAt ? formatDate(test.expiresAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dash-hint">
          Verification happens in the assessment flow. This dashboard tracks
          status and expiry for each claim.
        </p>
      </Card>
    </>
  )
}

/* ---------------- Applications ---------------- */

export function ApplicationsSection({ data }: SectionProps) {
  const { total, byStage, recent } = data.applications
  const stages = stageOrder.filter(
    (stage) => byStage[stage] !== undefined || ["APPLIED", "INTERVIEW", "OFFER"].includes(stage)
  )

  return (
    <>
      <PageHead
        eyebrow="Applications"
        title="Your pipeline, in one view"
        description="Every stage from applied to offer, ordered by the most recent activity."
      />

      <div className="dash-stats">
        <StatCard label="Total applications" value={total} hint="All time" tone="accent" />
        <StatCard
          label="In review"
          value={(byStage.UNDER_REVIEW ?? 0) + (byStage.SHORTLISTED ?? 0)}
          hint="Recruiters reviewing"
        />
        <StatCard label="Interviews" value={byStage.INTERVIEW ?? 0} hint="Active processes" tone="warn" />
        <StatCard label="Offers" value={byStage.OFFER ?? 0} hint="Received" tone="ok" />
      </div>

      <Card>
        <CardHead label="Stages" title="Distribution" />
        <div className="dash-stage-grid">
          {stages.map((stage) => (
            <div key={stage} className="dash-stage">
              <p className="dash-stage-count">{byStage[stage] ?? 0}</p>
              <p className="dash-stage-label">{labelize(stage)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead label="Recent" title="Latest applications" />
        {recent.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Apply to a matched role and it will appear in your pipeline."
          />
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Company</th>
                  <th scope="col">Applied</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span className="dash-cell-strong">
                        {app.role ?? "Role"}
                      </span>
                    </td>
                    <td>{app.company ?? "—"}</td>
                    <td>{formatDate(app.appliedAt)}</td>
                    <td>
                      <Pill tone={stageTone(app.status)}>
                        {labelize(app.status)}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

/* ---------------- Roadmap ---------------- */

export function RoadmapSection({ data }: SectionProps) {
  const roadmap = data.roadmap

  return (
    <>
      <PageHead
        eyebrow="Roadmap"
        title="A sequence, not a syllabus"
        description="Steps are ordered by the impact they have on your target role, starting with the largest verified gap."
      />

      {roadmap ? (
        <div className="dash-grid dash-grid-2">
          <Card>
            <CardHead
              label="Active roadmap"
              title={roadmap.targetSkill}
              action={<Pill tone="accent">{roadmap.overallProgress}% done</Pill>}
            />
            <div className="dash-roadmap-body">
              <ScoreRing
                value={roadmap.overallProgress}
                label="Roadmap progress"
              />
              <div>
                <p className="dash-micro">Current step</p>
                <p className="dash-step-title">
                  {roadmap.currentStep?.title ?? "All steps completed"}
                </p>
                <p className="dash-hint">
                  Completing this step moves you closer to the required level
                  for {roadmap.targetSkill}.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead label="Why this roadmap" title="How it was generated" />
            <ul className="dash-bullets">
              <li>
                Triggered when a verified score lands below your self-rated
                level for {roadmap.targetSkill}.
              </li>
              <li>
                Steps target the gap that most limits eligibility for matched
                roles.
              </li>
              <li>
                Progress is tracked per step, so the percentage reflects
                completed work only.
              </li>
            </ul>
            <a className="dash-btn dash-btn-ghost" href="#/dashboard/matches">
              Re-check matches
            </a>
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No active roadmap"
            description="A roadmap is created when an assessment shows a verified score below your claimed level."
            action={
              <a className="dash-btn" href="#/dashboard/assessments">
                Go to assessments
              </a>
            }
          />
        </Card>
      )}
    </>
  )
}

/* ---------------- Interview intelligence ---------------- */

export function InterviewsSection({ data }: SectionProps) {
  const insights = data.interviewInsights

  return (
    <>
      <PageHead
        eyebrow="Interview intelligence"
        title="Patterns from real interview rounds"
        description="Community-reported rounds for the companies in your match list — what was asked and how it ended."
      />

      {insights.length === 0 ? (
        <Card>
          <EmptyState
            title="No insights for your matches yet"
            description="As the community reports interviews at your matched companies, patterns will appear here."
          />
        </Card>
      ) : (
        <div className="dash-grid dash-grid-3">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <div className="dash-insight-head">
                <div>
                  <p className="dash-card-label">{insight.companyName}</p>
                  <h2 className="dash-card-title">{insight.roleTitle}</h2>
                </div>
                <Pill tone={outcomeTone(insight.outcome)}>
                  {labelize(insight.outcome)}
                </Pill>
              </div>
              <p className="dash-micro">{formatDate(insight.interviewDate)}</p>
              {insight.narrative && (
                <p className="dash-insight-text">{insight.narrative}</p>
              )}
              <ul className="dash-rounds">
                {insight.rounds.map((round, index) => (
                  <li key={`${insight.id}-${round.roundType}-${index}`}>
                    <span className="dash-round-type">
                      {labelize(round.roundType)}
                    </span>
                    <span className="dash-round-count">
                      {round.questionsAsked.length} question
                      {round.questionsAsked.length === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

/* ---------------- Notifications ---------------- */

export function NotificationsSection({
  data,
  actions,
  notifications,
}: SectionProps) {
  const items =
    notifications && notifications.length > 0
      ? notifications
      : data.notifications.latest
  const unread = data.notifications.unreadCount
  const { busy, notice, run } = useActionState()

  return (
    <>
      <PageHead
        eyebrow="Notifications"
        title="What changed since last time"
        description="Assessment, application, roadmap, and match updates for your profile."
        actions={
          <button
            type="button"
            className="dash-btn dash-btn-ghost"
            disabled={unread === 0 || busy !== null}
            onClick={() =>
              run("read-all", actions.markAllRead, "All notifications marked read.")
            }
          >
            {busy ? "Marking…" : unread > 0 ? `Mark ${unread} read` : "All read"}
          </button>
        }
      />

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <Card>
        <CardHead label="Inbox" title={`${items.length} recent`} />
        {items.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You'll see assessment reminders, application updates, and new matches here."
          />
        ) : (
          <ul className="dash-notification-list">
            {items.map((item) => (
              <li key={item.id} data-unread={!item.readAt}>
                <span className="dash-notification-dot" aria-hidden="true" />
                <div className="dash-notification-main">
                  <p className="dash-list-title">{item.title}</p>
                  {item.body && (
                    <p className="dash-notification-body">{item.body}</p>
                  )}
                  <p className="dash-list-sub">
                    {labelize(item.type)} · {formatRelative(item.createdAt)}
                  </p>
                </div>
                {!item.readAt && <Pill tone="accent">Unread</Pill>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

/* ---------------- Preferences ---------------- */

function NameChipForm({
  placeholder,
  onAdd,
  busy,
}: {
  placeholder: string
  onAdd: (value: string) => Promise<void>
  busy: boolean
}) {
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = value.trim()
    if (!clean) {
      setError("Enter a value first.")
      return
    }
    setError("")
    try {
      await onAdd(clean)
      setValue("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.")
    }
  }

  return (
    <form className="dash-chip-form" onSubmit={submit}>
      <input
        className="dash-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <button type="submit" className="dash-btn" disabled={busy}>
        {busy ? "Adding…" : "Add"}
      </button>
      {error && <p className="dash-form-error">{error}</p>}
    </form>
  )
}

export function PreferencesSection({ profile, actions, source }: SectionProps) {
  const roles = profile?.preferredRoles ?? []
  const locations = profile?.preferredLocations ?? []
  const { busy, notice, setNotice, run } = useActionState()

  return (
    <>
      <PageHead
        eyebrow="Preferences"
        title="What you're targeting"
        description="Preferred roles and locations drive matching, interview intelligence, and roadmap targeting."
      />

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {source === "sample" && (
        <Notice>
          Sample mode — preference changes stay in this browser tab until you
          sign in with a live API.
        </Notice>
      )}

      <div className="dash-grid dash-grid-2">
        <Card>
          <CardHead
            label="Preferred roles"
            title={`${roles.length} target${roles.length === 1 ? "" : "s"}`}
          />
          {roles.length === 0 ? (
            <p className="dash-hint">No roles yet. Add the role you're aiming for.</p>
          ) : (
            <div className="dash-chip-row">
              {roles.map((role) => (
                <span key={role.id} className="dash-chip dash-chip-removable">
                  {role.roleName}
                  <button
                    type="button"
                    aria-label={`Remove ${role.roleName}`}
                    disabled={busy !== null}
                    onClick={() =>
                      run(
                        `role-${role.id}`,
                        () => actions.removePreferredRole(role.id),
                        `Removed ${role.roleName}.`
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <NameChipForm
            placeholder="e.g. Backend Developer"
            busy={busy !== null}
            onAdd={async (name) => {
              await actions.addPreferredRole(name)
              setNotice({ tone: "ok", text: `Added ${name}.` })
            }}
          />
        </Card>

        <Card>
          <CardHead
            label="Preferred locations"
            title={`${locations.length} location${locations.length === 1 ? "" : "s"}`}
          />
          {locations.length === 0 ? (
            <p className="dash-hint">No locations yet. Add where you'd work.</p>
          ) : (
            <div className="dash-chip-row">
              {locations.map((location) => (
                <span
                  key={location.id}
                  className="dash-chip dash-chip-removable"
                >
                  {location.locationName}
                  <button
                    type="button"
                    aria-label={`Remove ${location.locationName}`}
                    disabled={busy !== null}
                    onClick={() =>
                      run(
                        `loc-${location.id}`,
                        () => actions.removePreferredLocation(location.id),
                        `Removed ${location.locationName}.`
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <NameChipForm
            placeholder="e.g. Bengaluru or Remote"
            busy={busy !== null}
            onAdd={async (name) => {
              await actions.addPreferredLocation(name)
              setNotice({ tone: "ok", text: `Added ${name}.` })
            }}
          />
        </Card>
      </div>

      <Card>
        <CardHead label="Targeting" title="Compensation and availability" />
        <dl className="dash-info-list dash-info-inline">
          <InfoRow
            label="Target role"
            value={roles[0]?.roleName ?? "Not set"}
          />
          <InfoRow
            label="Expected salary"
            value={formatSalary(profile?.salaryExpectation ?? null)}
          />
          <InfoRow
            label="Availability"
            value={
              profile?.availability
                ? (availabilityLabels[profile.availability.availability] ??
                  labelize(profile.availability.availability))
                : "Not set"
            }
          />
          <InfoRow
            label="Profile visibility"
            value={
              profile?.privacyConsent
                ? (visibilityLabels[profile.privacyConsent.profileVisibility] ??
                  labelize(profile.privacyConsent.profileVisibility))
                : "Private"
            }
          />
        </dl>
        <p className="dash-hint">
          Availability and visibility can be changed from{" "}
          <a className="dash-card-link" href="#/dashboard/settings">
            Settings
          </a>
          . Compensation is edited from the profile flow.
        </p>
      </Card>
    </>
  )
}

/* ---------------- Settings ---------------- */

export function SettingsSection({
  data,
  profile,
  actions,
  source,
}: SectionProps) {
  const [visibility, setVisibility] = useState(
    profile?.privacyConsent?.profileVisibility ?? "PRIVATE"
  )
  const [sharing, setSharing] = useState(
    profile?.privacyConsent?.dataSharingConsent ?? false
  )
  const [availability, setAvailability] = useState(
    profile?.availability?.availability ?? "IMMEDIATE"
  )
  const { busy, notice, run } = useActionState()

  return (
    <>
      <PageHead
        eyebrow="Settings"
        title="Account and privacy"
        description="Control who sees your profile and how your data is used."
      />

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="dash-grid dash-grid-2">
        <Card>
          <CardHead label="Account" title="Signed-in identity" />
          <dl className="dash-info-list">
            <InfoRow label="Email" value={data.user?.email ?? "—"} />
            <InfoRow
              label="Account type"
              value={data.user?.role ? labelize(data.user.role) : "—"}
            />
            <InfoRow
              label="Status"
              value={data.user?.status ? labelize(data.user.status) : "—"}
            />
            <InfoRow label="Member since" value={formatDate(data.user?.joinedAt)} />
            <InfoRow
              label="Profile ID"
              value={data.user?.id ? data.user.id.slice(0, 12) : "—"}
            />
          </dl>
          <p className="dash-hint">
            Email and account type are managed by the platform and cannot be
            edited here.
          </p>
        </Card>

        <Card>
          <CardHead label="Privacy" title="Profile visibility" />
          <fieldset className="dash-radio-group">
            <legend className="dash-micro">Who can see your profile</legend>
            {(["PUBLIC", "RECRUITERS_ONLY", "PRIVATE"] as const).map((option) => (
              <label key={option} className="dash-radio">
                <input
                  type="radio"
                  name="visibility"
                  value={option}
                  checked={visibility === option}
                  onChange={() => setVisibility(option)}
                />
                <span>
                  {visibilityLabels[option]}
                  <small>
                    {option === "PUBLIC"
                      ? "Anyone with the link can view your capability profile."
                      : option === "RECRUITERS_ONLY"
                        ? "Only verified recruiters can view your profile."
                        : "Your profile is hidden from discovery."}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="dash-switch">
            <input
              type="checkbox"
              checked={sharing}
              onChange={(event) => setSharing(event.target.checked)}
            />
            <span>Share anonymised data to improve match quality</span>
          </label>
          <button
            type="button"
            className="dash-btn"
            disabled={busy !== null}
            onClick={() =>
              run(
                "privacy",
                () =>
                  actions.savePrivacy({
                    profileVisibility: visibility,
                    dataSharingConsent: sharing,
                  }),
                "Privacy settings saved."
              )
            }
          >
            {busy === "privacy" ? "Saving…" : "Save privacy settings"}
          </button>
          {source === "sample" && (
            <p className="dash-hint">
              Sample mode: settings apply to this tab only.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHead
          label="Availability"
          title="When can you start?"
          action={<Pill tone="accent">{availabilityLabels[availability] ?? "—"}</Pill>}
        />
        <div className="dash-inline-form">
          <label className="dash-field">
            <span className="dash-label">Availability</span>
            <select
              className="dash-input"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              {Object.entries(availabilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="dash-btn"
            disabled={busy !== null}
            onClick={() =>
              run(
                "availability",
                () => actions.saveAvailability(availability),
                "Availability updated."
              )
            }
          >
            {busy === "availability" ? "Saving…" : "Save availability"}
          </button>
        </div>
      </Card>
    </>
  )
}
