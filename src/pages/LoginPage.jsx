import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/api';
import { showToast } from '../components/Toast';
import { AlertTriangle } from 'lucide-react';
import logoImg from '../assets/logo.png';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const data = res.data.data;
      login(
        { userId: data.userId, email: data.email, role: data.role },
        data.token
      );
      showToast('Đăng nhập thành công!', 'success');
      navigate('/lessons');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
        <div className="login-orb login-orb-3"></div>
      </div>

      <div className="login-container animate-scale-in">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon"><img src={logoImg} alt="Histar" style={{width:80, height:80, borderRadius:'50%'}} /></div>
            <p className="login-subtitle">Portal Quản Lý Học Liệu</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} id="login-form">
            {error && (
              <div className="login-error animate-fade-in">
                <span><AlertTriangle size={14} /></span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="teacher@arhistory.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={loading}
              id="btn-login"
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Hệ thống dành cho giáo viên được cấp tài khoản</p>
          </div>
        </div>
      </div>
    </div>
  );
}
