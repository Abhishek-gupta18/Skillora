import { api } from './client';

// ---------------- Auth ----------------
export const register = (payload) => api.post('/auth/register', payload);
export const login = (payload) => api.post('/auth/login', payload);

// ---------------- Profile (aggregate + singular sections) ----------------
export const getFullProfile = () => api.get('/profile/me');
export const updateBasicInfo = (body) => api.patch('/profile/me/basic-info', body);
export const updatePhotoHeadline = (body) => api.patch('/profile/me/photo-headline', body);
export const updateAddress = (body) => api.patch('/profile/me/address', body);
export const updateCareerSummary = (text) => api.patch('/profile/me/career-summary', { text });
export const updateSalaryExpectation = (body) => api.patch('/profile/me/salary-expectation', body);
export const updateAvailability = (availability) => api.patch('/profile/me/availability', { availability });
export const updatePrivacyConsent = (body) => api.patch('/profile/me/privacy-consent', body);

// ---------------- Profile list sections ----------------
const listResource = (name) => ({
  list: () => api.get(`/profile/${name}`),
  create: (body) => api.post(`/profile/${name}`, body),
  update: (id, body) => api.patch(`/profile/${name}/${id}`, body),
  remove: (id) => api.del(`/profile/${name}/${id}`),
});

export const educationApi = listResource('education');
export const experienceApi = listResource('experience');
export const skillsApi = listResource('skills'); // skill claims
export const certificationsApi = listResource('certifications');
export const projectsApi = listResource('projects');
export const preferredRolesApi = listResource('preferred-roles');
export const preferredLocationsApi = listResource('preferred-locations');
export const languagesApi = listResource('languages');
export const socialLinksApi = listResource('social-links');
export const referencesApi = listResource('references');

// ---------------- Master skills (NOT YET on backend — see README) ----------------
export const getMasterSkills = () => api.get('/skills');

// ---------------- Resume ----------------
export const uploadResume = (formData) => api.upload('/resume', formData);
export const downloadResumeFile = () => api.download('/resume');
export const deleteResumeApi = () => api.del('/resume');

// ---------------- Jobs (candidate) ----------------
export const listJobs = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.employmentType) params.set('employmentType', filters.employmentType);
  if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel);
  if (filters.location) params.set('location', filters.location);
  if (filters.isRemote) params.set('isRemote', 'true');
  const qs = params.toString();
  return api.get(`/jobs${qs ? `?${qs}` : ''}`);
};
export const getJob = (id) => api.get(`/jobs/${id}`);
export const getJobEligibility = (id) => api.get(`/jobs/${id}/eligibility`);
export const applyToJob = (id, coverNote) => api.post(`/jobs/${id}/apply`, { coverNote });

// ---------------- Matches & applications ----------------
export const getJobMatches = () => api.get('/profile/me/job-matches');
export const getMyApplications = () => api.get('/profile/me/applications');
export const withdrawApplication = (id) => api.patch(`/profile/me/applications/${id}/withdraw`, {});

// ---------------- Admin: companies ----------------
export const adminListCompanies = () => api.get('/admin/companies');
export const adminCreateCompany = (body) => api.post('/admin/companies', body);
export const adminUpdateCompany = (id, body) => api.patch(`/admin/companies/${id}`, body);

// ---------------- Admin: jobs ----------------
export const adminListJobs = () => api.get('/admin/jobs');
export const adminGetJob = (id) => api.get(`/admin/jobs/${id}`);
export const adminCreateJob = (body) => api.post('/admin/jobs', body);
export const adminUpdateJob = (id, body) => api.patch(`/admin/jobs/${id}`, body);
export const adminUpdateJobStatus = (id, status) => api.patch(`/admin/jobs/${id}/status`, { status });
export const adminDeleteJob = (id) => api.del(`/admin/jobs/${id}`);
export const adminAddRequiredSkill = (jobId, body) => api.post(`/admin/jobs/${jobId}/required-skills`, body);
export const adminRemoveRequiredSkill = (jobId, skillReqId) =>
  api.del(`/admin/jobs/${jobId}/required-skills/${skillReqId}`);

// ---------------- Admin: applications ----------------
export const adminListApplicants = (jobId) => api.get(`/admin/jobs/${jobId}/applications`);
export const adminUpdateApplicationStatus = (id, status) =>
  api.patch(`/admin/applications/${id}/status`, { status });
export const adminDownloadApplicantResume = (id) => api.download(`/admin/applications/${id}/resume`);
