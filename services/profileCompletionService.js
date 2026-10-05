function calculateProfileCompletion(profile) {
  const sectionChecks = [
    { name: 'basicInfo', check: (p) => p.basicInfo !== null },
    { name: 'photoHeadline', check: (p) => p.photoHeadline !== null },
    { name: 'address', check: (p) => p.address !== null },
    { name: 'educationEntries', check: (p) => Array.isArray(p.educationEntries) && p.educationEntries.length >= 1 },
    { name: 'experienceEntries', check: (p) => Array.isArray(p.experienceEntries) && p.experienceEntries.length >= 1 },
    { name: 'skillClaims', check: (p) => Array.isArray(p.skillClaims) && p.skillClaims.length >= 1 },
    { name: 'certifications', check: (p) => Array.isArray(p.certifications) && p.certifications.length >= 1 },
    { name: 'projects', check: (p) => Array.isArray(p.projects) && p.projects.length >= 1 },
    { name: 'careerSummary', check: (p) => p.careerSummary !== null },
    { name: 'preferredRoles', check: (p) => Array.isArray(p.preferredRoles) && p.preferredRoles.length >= 1 },
    { name: 'preferredLocations', check: (p) => Array.isArray(p.preferredLocations) && p.preferredLocations.length >= 1 },
    { name: 'salaryExpectation', check: (p) => p.salaryExpectation !== null },
    { name: 'availability', check: (p) => p.availability !== null },
    { name: 'languages', check: (p) => Array.isArray(p.languages) && p.languages.length >= 1 },
    { name: 'socialLinks', check: (p) => Array.isArray(p.socialLinks) && p.socialLinks.length >= 1 },
    { name: 'resume', check: (p) => p.resume !== null },
    { name: 'references', check: (p) => Array.isArray(p.references) && p.references.length >= 1 },
    { name: 'privacyConsent', check: (p) => p.privacyConsent !== null },
  ];

  const completeSections = [];
  const incompleteSections = [];

  for (const section of sectionChecks) {
    if (section.check(profile)) {
      completeSections.push(section.name);
    } else {
      incompleteSections.push(section.name);
    }
  }

  const completeCount = completeSections.length;
  const completionPercent = Math.round((completeCount / sectionChecks.length) * 100);

  return {
    completionPercent,
    completeSections,
    incompleteSections,
  };
}

module.exports = { calculateProfileCompletion };