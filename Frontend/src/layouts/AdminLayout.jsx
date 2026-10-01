import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar admin-sidebar">
        <div style={{ padding: '18px 16px 0' }}>
          <NavLink to="/admin/companies" className="brand">
            <span className="brand-mark">S</span> Skillora
          </NavLink>
          <div className="brand-sub" style={{ marginTop: 6, paddingLeft: 2 }}>ADMIN CONSOLE</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/companies" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end>
            Companies
          </NavLink>
          <NavLink to="/admin/jobs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Jobs
          </NavLink>
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
