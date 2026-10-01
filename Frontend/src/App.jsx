import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import CandidateLayout from './layouts/CandidateLayout';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/candidate/Dashboard';
import ProfilePage from './pages/candidate/ProfilePage';
import BrowseJobs from './pages/candidate/BrowseJobs';
import JobDetail from './pages/candidate/JobDetail';
import JobMatches from './pages/candidate/JobMatches';
import MyApplications from './pages/candidate/MyApplications';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminJobs from './pages/admin/AdminJobs';
import AdminJobForm from './pages/admin/AdminJobForm';
import AdminJobApplicants from './pages/admin/AdminJobApplicants';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ role, children }) {
  const { isAuthenticated, role: userRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== role) {
    return <Navigate to={userRole === 'ADMIN' ? '/admin/companies' : '/dashboard'} replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={role === 'ADMIN' ? '/admin/companies' : '/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      {/* Candidate app */}
      <Route element={<RequireAuth><CandidateLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<RoleRoute role="CANDIDATE"><Dashboard /></RoleRoute>} />
        <Route path="/profile" element={<RoleRoute role="CANDIDATE"><ProfilePage /></RoleRoute>} />
        <Route path="/jobs" element={<RoleRoute role="CANDIDATE"><BrowseJobs /></RoleRoute>} />
        <Route path="/jobs/:id" element={<RoleRoute role="CANDIDATE"><JobDetail /></RoleRoute>} />
        <Route path="/job-matches" element={<RoleRoute role="CANDIDATE"><JobMatches /></RoleRoute>} />
        <Route path="/applications" element={<RoleRoute role="CANDIDATE"><MyApplications /></RoleRoute>} />
      </Route>

      {/* Admin app */}
      <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route path="/admin/companies" element={<RoleRoute role="ADMIN"><AdminCompanies /></RoleRoute>} />
        <Route path="/admin/jobs" element={<RoleRoute role="ADMIN"><AdminJobs /></RoleRoute>} />
        <Route path="/admin/jobs/new" element={<RoleRoute role="ADMIN"><AdminJobForm /></RoleRoute>} />
        <Route path="/admin/jobs/:id" element={<RoleRoute role="ADMIN"><AdminJobForm /></RoleRoute>} />
        <Route path="/admin/jobs/:jobId/applicants" element={<RoleRoute role="ADMIN"><AdminJobApplicants /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
