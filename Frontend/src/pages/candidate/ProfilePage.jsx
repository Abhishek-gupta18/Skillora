import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFullProfile } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Loading, EmptyState } from '../../components/ui';
import BasicInfoSection from '../../components/profile/BasicInfoSection';
import PhotoHeadlineSection from '../../components/profile/PhotoHeadlineSection';
import AddressSection from '../../components/profile/AddressSection';
import ListSection from '../../components/profile/ListSection';
import SkillsSection from '../../components/profile/SkillsSection';
import ProjectsSection from '../../components/profile/ProjectsSection';
import CareerSummarySection from '../../components/profile/CareerSummarySection';
import SalarySection from '../../components/profile/SalarySection';
import AvailabilitySection from '../../components/profile/AvailabilitySection';
import SocialLinksSection from '../../components/profile/SocialLinksSection';
import ResumeSection from '../../components/profile/ResumeSection';
import PrivacySection from '../../components/profile/PrivacySection';

export default function ProfilePage() {
  const toast = useToast();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('basic');

  useEffect(() => {
    if (location.state?.banner) toast.info(location.state.banner, 5000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await getFullProfile();
      setProfile(res.data);
      return res.data;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  }, [toast]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const completed = useMemo(() => {
    if (!profile) return {};
    const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
    return {
      basic: has(profile.basicInfo),
      photo: has(profile.photoHeadline),
      address: has(profile.address),
      education: (profile.educationEntries || []).length > 0,
      experience: (profile.experienceEntries || []).length > 0,
      skills: (profile.skillClaims || []).length > 0,
      certifications: (profile.certifications || []).length > 0,
      projects: (profile.projects || []).length > 0,
      summary: has(profile.careerSummary),
      roles: (profile.preferredRoles || []).length > 0,
      locations: (profile.preferredLocations || []).length > 0,
      salary: has(profile.salaryExpectation),
      availability: has(profile.availability),
      languages: (profile.languages || []).length > 0,
      social: (profile.socialLinks || []).length > 0,
      resume: has(profile.resume),
      references: (profile.references || []).length > 0,
      privacy: has(profile.privacyConsent),
    };
  }, [profile]);

  if (loading) return <Loading label="Loading your profile…" />;
  if (!profile) return <EmptyState title="Could not load profile" note="Try refreshing the page." />;

  const SECTIONS = [
    { key: 'basic', label: 'Basic Info', el: <BasicInfoSection profile={profile} refresh={refresh} /> },
    { key: 'photo', label: 'Photo & Headline', el: <PhotoHeadlineSection profile={profile} refresh={refresh} /> },
    { key: 'address', label: 'Address', el: <AddressSection profile={profile} refresh={refresh} /> },
    { key: 'education', label: 'Education', el: <ListSection kind="education" profile={profile} refresh={refresh} /> },
    { key: 'experience', label: 'Experience', el: <ListSection kind="experience" profile={profile} refresh={refresh} /> },
    { key: 'skills', label: 'Skills', el: <SkillsSection profile={profile} refresh={refresh} /> },
    { key: 'certifications', label: 'Certifications', el: <ListSection kind="certifications" profile={profile} refresh={refresh} /> },
    { key: 'projects', label: 'Projects', el: <ProjectsSection profile={profile} refresh={refresh} /> },
    { key: 'summary', label: 'Career Summary', el: <CareerSummarySection profile={profile} refresh={refresh} /> },
    { key: 'roles', label: 'Preferred Roles', el: <ListSection kind="preferredRoles" profile={profile} refresh={refresh} /> },
    { key: 'locations', label: 'Preferred Locations', el: <ListSection kind="preferredLocations" profile={profile} refresh={refresh} /> },
    { key: 'salary', label: 'Salary Expectation', el: <SalarySection profile={profile} refresh={refresh} /> },
    { key: 'availability', label: 'Availability', el: <AvailabilitySection profile={profile} refresh={refresh} /> },
    { key: 'languages', label: 'Languages', el: <ListSection kind="languages" profile={profile} refresh={refresh} /> },
    { key: 'social', label: 'Social Links', el: <SocialLinksSection profile={profile} refresh={refresh} /> },
    { key: 'resume', label: 'Resume', el: <ResumeSection profile={profile} refresh={refresh} /> },
    { key: 'references', label: 'References', el: <ListSection kind="references" profile={profile} refresh={refresh} /> },
    { key: 'privacy', label: 'Privacy & Consent', el: <PrivacySection profile={profile} refresh={refresh} /> },
  ];

  const current = SECTIONS.find((s) => s.key === active) || SECTIONS[0];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>My Profile</h1>
          <p className="page-sub">Each section saves independently — edit only what you need.</p>
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`profile-tab${active === s.key ? ' active' : ''}`}
              onClick={() => setActive(s.key)}
            >
              <span>{s.label}</span>
              <span className={`profile-dot${completed[s.key] ? ' done' : ''}`} title={completed[s.key] ? 'Has data' : 'Empty'} />
            </button>
          ))}
        </div>

        <div className="card">{current.el}</div>
      </div>
    </div>
  );
}
