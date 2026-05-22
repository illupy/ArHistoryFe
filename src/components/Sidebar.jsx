import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} id="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="logo-icon">⏳</span>
          {!collapsed && (
            <div>
              <h1 className="logo-text">Histar</h1>
              <p className="logo-sub">Portal Giáo Viên</p>
            </div>
          )}
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">Tổng quan</span>}
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Dashboard">
            <span className="nav-icon">📊</span>
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        </div>

        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">Quản lý nội dung</span>}
          <NavLink to="/lessons" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Bài học">
            <span className="nav-icon">📚</span>
            {!collapsed && <span>Bài học</span>}
          </NavLink>
          <NavLink to="/marker-models" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Quản lý marker">
            <span className="nav-icon">🎯</span>
            {!collapsed && <span>Quản lý marker</span>}
          </NavLink>
        </div>

        {isAdmin() && (
          <div className="nav-section">
            {!collapsed && <span className="nav-section-title">Quản trị</span>}
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Tài khoản">
              <span className="nav-icon">👥</span>
              {!collapsed && <span>Tài khoản</span>}
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <div className="sidebar-version">v1.0.0 — Histar</div>}
      </div>
    </aside>
  );
}
