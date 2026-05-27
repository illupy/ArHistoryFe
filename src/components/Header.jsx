import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, BookOpenCheck } from 'lucide-react';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header" id="header">
      <div className="header-left">
        <div className="header-greeting">
          Xin chào, <span className="header-name">{user?.email}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-role">
          {user?.role === 'ADMIN' ? (
            <span className="badge badge-admin">
              <ShieldCheck size={14} /> ADMIN
            </span>
          ) : (
            <span className="badge badge-teacher">
              <BookOpenCheck size={14} /> Giáo viên
            </span>
          )}
        </div>
        <button className="btn-logout" onClick={handleLogout} id="btn-logout">
          <LogOut size={14} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
