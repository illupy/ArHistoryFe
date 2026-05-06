import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="logo-icon">⏳</span>
          <div>
            <h1 className="logo-text">AR History</h1>
            <p className="logo-sub">Portal Giáo Viên</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Tổng quan</span>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
        </div>

        <div className="nav-section">
          <span className="nav-section-title">Quản lý nội dung</span>
          <NavLink to="/lessons" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📚</span>
            <span>Bài học</span>
          </NavLink>
        </div>

        {isAdmin() && (
          <div className="nav-section">
            <span className="nav-section-title">Quản trị</span>
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">👥</span>
              <span>Tài khoản</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">v1.0.0 — AR History</div>
      </div>
    </aside>
  );
}
