import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
          <span className={`badge badge-${user?.role?.toLowerCase()}`}>
            {user?.role === 'ADMIN' ? '🛡️ Admin' : '📖 Giáo viên'}
          </span>
        </div>
        <button className="btn-logout" onClick={handleLogout} id="btn-logout">
          <span>🚪</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
