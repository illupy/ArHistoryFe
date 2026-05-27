import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BookOpen, Crosshair, Puzzle, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import './Sidebar.css';

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} id="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="logo-icon"><img src={logoImg} alt="Histar" /></span>
          {!collapsed && (
            <div>
              <h1 className="logo-text">Histar</h1>
              <p className="logo-sub">Portal Giáo Viên</p>
            </div>
          )}
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">Tổng quan</span>}
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Dashboard">
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        </div>

        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">Quản lý nội dung</span>}
          <NavLink to="/lessons" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Bài học">
            <span className="nav-icon"><BookOpen size={18} /></span>
            {!collapsed && <span>Bài học</span>}
          </NavLink>
          <NavLink to="/marker-models" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Quản lý marker">
            <span className="nav-icon"><Crosshair size={18} /></span>
            {!collapsed && <span>Quản lý marker</span>}
          </NavLink>
          <NavLink to="/match3" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Match3 Game">
            <span className="nav-icon"><Puzzle size={18} /></span>
            {!collapsed && <span>Match3 Game</span>}
          </NavLink>
        </div>

        {isAdmin() && (
          <div className="nav-section">
            {!collapsed && <span className="nav-section-title">Quản trị</span>}
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Tài khoản">
              <span className="nav-icon"><Users size={18} /></span>
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
