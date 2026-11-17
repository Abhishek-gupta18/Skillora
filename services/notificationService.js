function notify(prismaLike, userId, { type, title, body, linkTo }) {
  return prismaLike.notification
    .create({
      data: {
        userId,
        type,
        title: title.slice(0, 120),
        body: body.slice(0, 500),
        linkTo: linkTo ? linkTo.slice(0, 200) : null,
      },
    })
    .then(() => true)
    .catch((err) => {
      console.warn('Notification create failed (best-effort):', err.message);
      return false;
    });
}

function notifyForRetakeDecision(prismaLike, userId, { status, reviewNote }) {
  const title = status === 'APPROVED' ? 'Retake Request Approved' : 'Retake Request Rejected';
  const body = status === 'APPROVED'
    ? 'Your retake request has been approved. You can now start a new assessment session.'
    : `Your retake request was rejected. Reason: ${reviewNote || 'No reason provided.'}`;
  return notify(prismaLike, userId, {
    type: 'RETAKE_DECISION',
    title,
    body,
    linkTo: '/assessments/retake-requests',
  });
}

function notifyForAssessmentResult(prismaLike, userId, { passed, score, skillName }) {
  const title = passed ? 'Assessment Passed' : 'Assessment Result';
  const body = passed
    ? `Congratulations! You passed the ${skillName} assessment with a score of ${score.toFixed(1)}%.`
    : `You scored ${score.toFixed(1)}% on the ${skillName} assessment. You did not meet the passing threshold.`;
  return notify(prismaLike, userId, {
    type: 'ASSESSMENT_RESULT',
    title,
    body,
    linkTo: '/profile/me/assessments',
  });
}

function notifyForApplicationStatus(prismaLike, userId, { status, jobTitle, companyName }) {
  const statusMap = {
    UNDER_REVIEW: { title: 'Application Under Review', body: `Your application for ${jobTitle} at ${companyName} is now under review.` },
    SHORTLISTED: { title: 'Application Shortlisted', body: `Congratulations! You have been shortlisted for ${jobTitle} at ${companyName}.` },
    REJECTED: { title: 'Application Update', body: `Unfortunately, your application for ${jobTitle} at ${companyName} was not selected.` },
    HIRED: { title: 'Congratulations! You\'re Hired', body: `You have been hired for ${jobTitle} at ${companyName}.` },
  };
  const info = statusMap[status] || { title: 'Application Status Update', body: `Your application for ${jobTitle} at ${companyName} status changed to ${status}.` };
  return notify(prismaLike, userId, {
    type: 'APPLICATION_STATUS',
    title: info.title,
    body: info.body,
    linkTo: '/profile/me/applications',
  });
}

function notifyForRoadmapUpdate(prismaLike, userId, { assignmentId, stepTitle, progress }) {
  return notify(prismaLike, userId, {
    type: 'ROADMAP',
    title: 'Roadmap Progress Update',
    body: `Your roadmap progress is ${progress}%. Current step: ${stepTitle}.`,
    linkTo: `/profile/me/roadmaps/${assignmentId}`,
  });
}

module.exports = {
  notify,
  notifyForRetakeDecision,
  notifyForAssessmentResult,
  notifyForApplicationStatus,
  notifyForRoadmapUpdate,
};