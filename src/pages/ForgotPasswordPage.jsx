import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/api';
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/logo.png';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
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
            <p className="login-subtitle">Quên mật khẩu</p>
          </div>

          {sent ? (
            <div className="forgot-success">
              <CheckCircle2 size={48} color="var(--success)" />
              <p>Email đặt lại mật khẩu đã được gửi đến <strong>{email}</strong></p>
              <p className="forgot-hint">Vui lòng kiểm tra hộp thư (và thư mục spam) để lấy link đặt lại mật khẩu.</p>
              <Link to="/login" className="btn btn-primary login-btn" style={{marginTop: 16}}>
                <ArrowLeft size={14} /> Quay lại đăng nhập
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

              <p style={{color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 16}}>
                Nhập email tài khoản của bạn để đổi mật khẩu
              </p>

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

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Gửi link đặt lại mật khẩu</span>
                )}
              </button>

              <div className="login-footer">
                <Link to="/login" className="forgot-password-link"><ArrowLeft size={12} /> Quay lại đăng nhập</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
