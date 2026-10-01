import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'My Profile' },
  { to: '/jobs', label: 'Browse Jobs' },
  { to: '/job-matches', label: 'Job Matches' },
  { to: '/applications', label: 'My Applications' },
];

export default function CandidateLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ padding: '18px 16px 0' }}>
          <NavLink to="/dashboard" className="brand">
            <span className="brand-mark">S</span> Skillora
          </NavLink>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
          <button className="nav-item" style={{ border: 'none', background: 'none', textAlign: 'left', fontFamily: 'inherit', width: '100%' }} onClick={onLogout}>
            Log Out
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.email}</div>
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={onLogout}>
            Log Out
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
