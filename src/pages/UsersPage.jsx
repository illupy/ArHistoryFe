import { useState, useEffect } from 'react';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Users, ShieldCheck, BookOpenCheck, Plus, UserPlus } from 'lucide-react';
import './UsersPage.css';

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await authApi.getUsers();
      setUsers(res.data.data || []);
    } catch {
      showToast('Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin', 'warning');
      return;
    }
    if (form.password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning');
      return;
    }
    setCreating(true);
    try {
      await authApi.register(form);
      showToast('Tạo tài khoản giáo viên thành công!', 'success');
      setShowCreateModal(false);
      setForm({ email: '', password: '' });
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Tạo tài khoản thất bại', 'error');
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <span className="badge badge-admin"><ShieldCheck size={12} /> Admin</span>;
      case 'TEACHER': return <span className="badge badge-teacher"><BookOpenCheck size={12} /> Giáo viên</span>;
      default: return <span className="badge badge-draft">{role}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Users size={24} style={{display:'inline', verticalAlign:'middle', marginRight:8}} /> {isAdmin() ? 'Quản lý tài khoản' : 'Tài khoản của tôi'}</h1>
          <p className="page-subtitle">{isAdmin() ? 'Tạo và quản lý tài khoản giáo viên' : 'Thông tin tài khoản'}</p>
        </div>
        {isAdmin() && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            id="btn-create-user"
          >
            <Plus size={16} />
            <span>Tạo tài khoản</span>
          </button>
        )}
      </div>

      {/* Stats - Admin only */}
      {isAdmin() && (
      <div className="users-stats">
        <div className="stat-card">
          <div className="stat-icon stat-icon-amber"><Users size={20} /></div>
          <div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Tổng tài khoản</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><ShieldCheck size={20} /></div>
          <div>
            <div className="stat-value">{users.filter(u => u.role === 'ADMIN').length}</div>
            <div className="stat-label">Admin</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><BookOpenCheck size={20} /></div>
          <div>
            <div className="stat-value">{users.filter(u => u.role === 'TEACHER').length}</div>
            <div className="stat-label">Giáo viên</div>
          </div>
        </div>
      </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Danh sách tài khoản</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-container">
              <div className="spinner spinner-lg"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={40} /></div>
              <p className="empty-state-text">Chưa có tài khoản nào</p>
            </div>
          ) : (
            <table className="data-table" id="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{index + 1}</td>
                    <td>{user.email}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo tài khoản giáo viên"
        size="sm"
      >
        <form onSubmit={handleCreate} id="create-user-form">
          <div className="form-group">
            <label className="form-label" htmlFor="user-email">Email *</label>
            <input
              id="user-email"
              type="email"
              className="form-input"
              placeholder="teacher@school.edu.vn"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-password">Mật khẩu *</label>
            <input
              id="user-password"
              type="password"
              className="form-input"
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="user-role-info">
            <span className="badge badge-teacher"><BookOpenCheck size={12} /> Giáo viên</span>
            <span className="role-info-text">Tài khoản sẽ được tạo với vai trò Giáo viên</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
