import type { DashboardData } from "../api"
import {
  Card,
  CardHead,
  EmptyState,
  Meter,
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
  sectionLabel,
  stageTone,
} from "./format"

type NextAction = {
  title: string
  description: string
  href: string
  cta: string
}

function buildNextAction(data: DashboardData): NextAction | null {
  const percent = completionPercent(data.profileCompletion)
  const missing =
    data.profileCompletion.incompleteSections ??
    data.profileCompletion.missingSections ??
    []

  if (percent < 60 && missing.length > 0) {
    return {
      title: `Complete ${sectionLabel(missing[0])}`,
      description: `Your profile is ${percent}% complete. Finishing this section improves your matches.`,
      href: "#/dashboard/profile",
      cta: "Open profile",
    }
  }

  if (data.pendingTests.length > 0) {
    const test = data.pendingTests[0]
    return {
      title:
        test.status === "not-started"
          ? `Take the ${test.skill} assessment`
          : test.title,
      description:
        test.status === "in-progress" && test.expiresAt
          ? `Your session is open until ${formatDate(test.expiresAt)}. Verified skills unlock stronger matches.`
          : "Verify a claimed skill to improve your eligibility for matched roles.",
      href: "#/dashboard/assessments",
      cta: "View assessments",
    }
  }

  if (data.roadmap?.currentStep) {
    return {
      title: `Continue: ${data.roadmap.currentStep.title}`,
      description: `You're ${data.roadmap.overallProgress}% through your ${data.roadmap.targetSkill} roadmap.`,
      href: "#/dashboard/roadmap",
      cta: "Open roadmap",
    }
  }

  if (data.recommendedJobs.length > 0) {
    const job = data.recommendedJobs[0]
    return {
      title: `Apply to ${job.role} at ${job.company}`,
      description: `Your eligibility score is ${job.match}% (${labelize(job.eligibility)}).`,
      href: "#/dashboard/matches",
      cta: "View matches",
    }
  }

  return null
}

function statusTone(status: string) {
  if (status === "in-progress") return "accent" as const
  if (status.startsWith("retake")) return "warn" as const
  return "muted" as const
}

function pendingLabel(status: string) {
  switch (status) {
    case "not-started":
      return "Not started"
    case "in-progress":
      return "In progress"
    case "retake-pending":
      return "Retake pending"
    case "retake-approved":
      return "Retake approved"
    default:
      return "Retake needed"
  }
}

export default function Overview({ data }: { data: DashboardData }) {
  const user = data.user
  const firstName = user?.firstName ?? "there"
  const readiness = data.readiness.readinessScore
  const percent = completionPercent(data.profileCompletion)
  const missingSections =
    data.profileCompletion.incompleteSections ??
    data.profileCompletion.missingSections ??
    []
  const nextAction = buildNextAction(data)

  return (
    <>
      <PageHead
        eyebrow={`${user?.title ?? "Candidate workspace"} · ${user?.role === "ADMIN" ? "Admin" : "Candidate"}`}
        title={`Welcome back, ${firstName}.`}
        description={
          data.targetRole?.title
            ? `Tracking your path to ${data.targetRole.title}. Here is what moved since your last visit.`
            : "Set a target role to unlock match scores, skill gaps, and a preparation path."
        }
        actions={
          <>
            <a className="dash-btn dash-btn-ghost" href="#/dashboard/preferences">
              Preferences
            </a>
            <a className="dash-btn" href="#/dashboard/matches">
              View matches
            </a>
          </>
        }
      />

      <div className="dash-stats">
        <StatCard
          label="Readiness"
          value={readiness === null ? "—" : readiness}
          unit={readiness === null ? "" : "/100"}
          hint={readiness === null ? "Add verified skills to score" : "Best open-role match"}
          tone="accent"
        />
        <StatCard
          label="Profile complete"
          value={percent}
          unit="%"
          hint={`${missingSections.length} sections to finish`}
        />
        <StatCard
          label="Verified skills"
          value={data.readiness.verifiedSkillsCount}
          unit={`/${data.readiness.claimedSkillsCount}`}
          hint="Assessment-backed"
        />
        <StatCard
          label="Open skill gaps"
          value={data.readiness.skillGapCount}
          hint={data.skillGaps.length ? `Top: ${data.skillGaps[0].skill}` : "No gaps detected"}
          tone={data.readiness.skillGapCount > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="dash-grid dash-grid-hero">
        <Card className="dash-readiness">
          <CardHead
            label="Readiness signal"
            title="How close you are to the role you want"
            action={
              data.targetRole?.title ? (
                <Pill tone="accent">{data.targetRole.title}</Pill>
              ) : undefined
            }
          />
          <div className="dash-readiness-body">
            <ScoreRing value={readiness} label="Readiness score" />
            <div className="dash-readiness-copy">
              <p className="dash-readiness-line">
                {readiness === null
                  ? "No open role has scored your profile yet."
                  : readiness >= 80
                    ? "You're in range for your top matched roles."
                    : readiness >= 50
                      ? "You're close — a couple of verified skills would close the distance."
                      : "Start with assessments to turn claimed skills into verified ones."}
              </p>
              <div className="dash-inline-meta">
                <span>
                  <strong>{data.readiness.verifiedSkillsCount}</strong> verified
                </span>
                <span className="dash-dot" aria-hidden="true" />
                <span>
                  <strong>{data.readiness.claimedSkillsCount}</strong> claimed
                </span>
                <span className="dash-dot" aria-hidden="true" />
                <span>
                  <strong>{data.recommendedJobs.length}</strong> matches
                </span>
              </div>
              <div className="dash-readiness-meter">
                <div className="dash-meter-head">
                  <span>Profile completeness</span>
                  <span>{percent}%</span>
                </div>
                <Meter value={percent} label="Profile completeness" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="dash-next">
          <CardHead label="Next best action" />
          {nextAction ? (
            <div className="dash-next-body">
              <h2 className="dash-next-title">{nextAction.title}</h2>
              <p className="dash-next-desc">{nextAction.description}</p>
              <a className="dash-btn" href={nextAction.href}>
                {nextAction.cta}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          ) : (
            <EmptyState
              title="You're all caught up"
              description="Add a target role or claim a skill to generate your next recommended step."
              action={
                <a className="dash-btn dash-btn-ghost" href="#/dashboard/preferences">
                  Set preferences
                </a>
              }
            />
          )}
        </Card>
      </div>

      <div className="dash-grid dash-grid-2">
        <Card>
          <CardHead
            label="Roadmap"
            title={data.roadmap ? data.roadmap.targetSkill : "No active roadmap"}
            action={
              data.roadmap ? (
                <a className="dash-card-link" href="#/dashboard/roadmap">
                  View roadmap
                </a>
              ) : undefined
            }
          />
          {data.roadmap ? (
            <>
              <div className="dash-meter-head">
                <span>Overall progress</span>
                <span>{data.roadmap.overallProgress}%</span>
              </div>
              <Meter
                value={data.roadmap.overallProgress}
                label="Roadmap progress"
              />
              <div className="dash-current-step">
                <p className="dash-micro">Current step</p>
                <p className="dash-step-title">
                  {data.roadmap.currentStep?.title ?? "All steps completed"}
                </p>
              </div>
            </>
          ) : (
            <EmptyState
              title="No roadmap yet"
              description="Roadmaps are generated when a verified score falls below your claimed level."
            />
          )}
        </Card>

        <Card>
          <CardHead
            label="Assessments"
            title="Pending verification"
            action={
              <a className="dash-card-link" href="#/dashboard/assessments">
                All assessments
              </a>
            }
          />
          {data.pendingTests.length === 0 ? (
            <EmptyState
              title="Nothing pending"
              description="Claim a new skill to start an assessment."
            />
          ) : (
            <ul className="dash-list">
              {data.pendingTests.slice(0, 3).map((test) => (
                <li key={`${test.id}-${test.status}`} className="dash-list-row">
                  <div className="dash-list-main">
                    <p className="dash-list-title">{test.skill}</p>
                    <p className="dash-list-sub">
                      {test.status === "in-progress" && test.expiresAt
                        ? `Expires ${formatDate(test.expiresAt)}`
                        : "Assessment"}
                    </p>
                  </div>
                  <Pill tone={statusTone(test.status)}>
                    {pendingLabel(test.status)}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="dash-grid dash-grid-2">
        <Card>
          <CardHead
            label="Capability"
            title="Verified skills"
            action={
              <a className="dash-card-link" href="#/dashboard/profile">
                Full profile
              </a>
            }
          />
          {data.verifiedSkills.length === 0 ? (
            <EmptyState
              title="No verified skills yet"
              description="Pass an assessment to replace a claim with evidence."
              action={
                <a className="dash-btn dash-btn-ghost" href="#/dashboard/assessments">
                  Take an assessment
                </a>
              }
            />
          ) : (
            <ul className="dash-skill-list">
              {data.verifiedSkills.slice(0, 5).map((skill) => (
                <li key={skill.id} className="dash-skill-row">
                  <div className="dash-skill-head">
                    <span className="dash-skill-name">{skill.name}</span>
                    <span className="dash-skill-meta">
                      {skill.proficiency !== null
                        ? `${Math.round(skill.proficiency)}%`
                        : `Level ${skill.level ?? "—"}`}
                    </span>
                  </div>
                  <Meter
                    value={
                      skill.proficiency ??
                      ((skill.level ?? 0) / 5) * 100
                    }
                    label={skill.name}
                    tone="ok"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead
            label="Gap analysis"
            title="Skills holding your matches back"
            action={
              <a className="dash-card-link" href="#/dashboard/matches">
                See matches
              </a>
            }
          />
          {data.skillGaps.length === 0 ? (
            <EmptyState
              title="No gaps detected"
              description="Your verified skills cover the requirements of your matched roles."
            />
          ) : (
            <ul className="dash-list">
              {data.skillGaps.slice(0, 4).map((gap) => (
                <li key={gap.skillId} className="dash-list-row">
                  <div className="dash-list-main">
                    <p className="dash-list-title">{gap.skill}</p>
                    <p className="dash-list-sub">
                      Level {gap.currentLevel} → {gap.requiredLevel} required
                    </p>
                  </div>
                  <Pill tone="danger">+{gap.gap}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHead
          label="Matching"
          title="Recommended roles"
          action={
            <a className="dash-card-link" href="#/dashboard/matches">
              All matches
            </a>
          }
        />
        {data.recommendedJobs.length === 0 ? (
          <EmptyState
            title="No matches yet"
            description="Add a target role and verify a skill to start matching against open roles."
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
                </tr>
              </thead>
              <tbody>
                {data.recommendedJobs.slice(0, 4).map((job) => (
                  <tr key={job.id}>
                    <td>
                      <span className="dash-cell-strong">{job.role}</span>
                      <span className="dash-cell-sub">{job.company}</span>
                    </td>
                    <td>
                      {job.location}
                      <span className="dash-cell-sub">{labelize(job.workMode)}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="dash-grid dash-grid-2">
        <Card>
          <CardHead
            label="Applications"
            title={`${data.applications.total} tracked`}
            action={
              <a className="dash-card-link" href="#/dashboard/applications">
                Open pipeline
              </a>
            }
          />
          {data.applications.recent.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Apply from a matched role and it will show up here."
            />
          ) : (
            <ul className="dash-list">
              {data.applications.recent.slice(0, 4).map((app) => (
                <li key={app.id} className="dash-list-row">
                  <div className="dash-list-main">
                    <p className="dash-list-title">{app.role ?? "Role"}</p>
                    <p className="dash-list-sub">
                      {app.company ?? "Company"} · {formatDate(app.appliedAt)}
                    </p>
                  </div>
                  <Pill tone={stageTone(app.status)}>{labelize(app.status)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead
            label="Notifications"
            title={
              data.notifications.unreadCount > 0
                ? `${data.notifications.unreadCount} unread`
                : "All read"
            }
            action={
              <a className="dash-card-link" href="#/dashboard/notifications">
                View all
              </a>
            }
          />
          {data.notifications.latest.length === 0 ? (
            <EmptyState
              title="No notifications"
              description="Assessment, application, and roadmap updates appear here."
            />
          ) : (
            <ul className="dash-list">
              {data.notifications.latest.slice(0, 3).map((item) => (
                <li key={item.id} className="dash-list-row">
                  <div className="dash-list-main">
                    <p className="dash-list-title">
                      {!item.readAt && (
                        <span className="dash-unread-dot" aria-label="Unread" />
                      )}
                      {item.title}
                    </p>
                    <p className="dash-list-sub">
                      {labelize(item.type)} · {formatRelative(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
