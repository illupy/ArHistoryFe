import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/api';
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/logo.png';
import './LoginPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Vui lòng nhập đầy đủ mật khẩu');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!token) {
      setError('Link đặt lại mật khẩu không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
              <p className="login-subtitle">Link không hợp lệ</p>
            </div>
            <div className="forgot-success">
              <AlertTriangle size={48} color="var(--warning)" />
              <p>Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
              <Link to="/forgot-password" className="btn btn-primary login-btn" style={{marginTop: 16}}>
                Yêu cầu link mới
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="login-subtitle">Đặt lại mật khẩu</p>
          </div>

          {success ? (
            <div className="forgot-success">
              <CheckCircle2 size={48} color="var(--success)" />
              <p>Mật khẩu đã được đặt lại thành công!</p>
              <Link to="/login" className="btn btn-primary login-btn" style={{marginTop: 16}}>
                <ArrowLeft size={14} /> Đăng nhập ngay
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              {error && (
                <div className="login-error animate-fade-in">
                  <span><AlertTriangle size={14} /></span>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="password">Mật khẩu mới</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Xác nhận mật khẩu</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Đặt lại mật khẩu</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
