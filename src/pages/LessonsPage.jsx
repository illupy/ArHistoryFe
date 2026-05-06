import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessonApi } from '../api/api';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import './LessonsPage.css';

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', content: '', thumbnailUrl: '' });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterQuiz, setFilterQuiz] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => { fetchLessons(); }, []);

  const fetchLessons = async () => {
    try {
      const res = await lessonApi.getAll();
      setLessons(res.data.data || []);
    } catch { showToast('Không thể tải danh sách bài học', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Tiêu đề không được để trống', 'warning'); return; }
    setCreating(true);
    try {
      const res = await lessonApi.create(form);
      showToast('Tạo bài học thành công!', 'success');
      setShowCreateModal(false);
      setForm({ title: '', description: '', content: '', thumbnailUrl: '' });
      fetchLessons();
      // Navigate to editor
      const newId = res.data?.data?.id;
      if (newId) navigate(`/lessons/${newId}/edit`);
    } catch (err) { showToast(err.response?.data?.message || 'Tạo bài học thất bại', 'error'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa bài học này?')) return;
    try {
      await lessonApi.delete(id);
      showToast('Đã xóa bài học', 'success');
      fetchLessons();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const filtered = lessons.filter(l => {
    if (search && !l.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'ALL' && l.status !== filterStatus) return false;
    if (filterQuiz === 'HAS_QUIZ' && !l.hasQuiz) return false;
    if (filterQuiz === 'NO_QUIZ' && l.hasQuiz) return false;
    return true;
  });

  return (
    <div className="lessons-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📚 Bài học</h1>
          <p className="page-subtitle">Quản lý tất cả bài học AR lịch sử</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="btn-create-lesson">
          <span>＋</span> Tạo bài học mới
        </button>
      </div>

      {/* Stats */}
      <div className="lessons-stats">
        <div className="stat-card"><div className="stat-icon">📖</div><div><div className="stat-value">{lessons.length}</div><div className="stat-label">Tổng bài học</div></div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{lessons.filter(l => l.status === 'PUBLISH').length}</div><div className="stat-label">Đã xuất bản</div></div></div>
        <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{lessons.filter(l => l.status === 'DRAFT').length}</div><div className="stat-label">Bản nháp</div></div></div>
      </div>

      {/* Filters */}
      <div className="lessons-filters">
        <input className="form-input filter-search" placeholder="🔍 Tìm theo tên bài học..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PUBLISH">Đã xuất bản</option>
        </select>
        <select className="form-input filter-select" value={filterQuiz} onChange={e => setFilterQuiz(e.target.value)}>
          <option value="ALL">Quiz: Tất cả</option>
          <option value="HAS_QUIZ">Có quiz</option>
          <option value="NO_QUIZ">Chưa có quiz</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h2 className="card-title">Danh sách ({filtered.length})</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="loading-container"><div className="spinner spinner-lg"></div></div> :
          filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📚</div><p className="empty-state-text">Không tìm thấy bài học</p></div> :
          <table className="data-table" id="lessons-table">
            <thead><tr>
              <th>#</th><th>Tiêu đề</th><th>Marker</th><th>Trạng thái</th><th>Quiz</th><th>Game</th><th style={{textAlign:'right'}}>Thao tác</th>
            </tr></thead>
            <tbody>{filtered.map((l, i) => (
              <tr key={l.id} className="animate-fade-in" style={{animationDelay:`${i*0.03}s`}}>
                <td style={{color:'var(--text-tertiary)',fontWeight:400}}>{i+1}</td>
                <td><div className="lesson-title-cell">
                  {l.thumbnailUrl && <img src={l.thumbnailUrl.startsWith('/') ? `http://localhost:8080${l.thumbnailUrl}` : l.thumbnailUrl} alt="" className="lesson-thumb" />}
                  <span>{l.title}</span>
                </div></td>
                <td>{l.markerCode ? <span className="badge badge-publish">{l.markerCode}</span> : <span style={{color:'var(--text-tertiary)'}}>—</span>}</td>
                <td><span className={`badge badge-${l.status?.toLowerCase()}`}>{l.status === 'PUBLISH' ? 'Published' : 'Draft'}</span></td>
                <td>{l.hasQuiz ? '✅' : '—'}</td>
                <td>{l.hasGamification ? '✅' : '—'}</td>
                <td style={{textAlign:'right'}}>
                  <div className="action-btns">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/lessons/${l.id}/edit`)}>✏️ Sửa</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo bài học mới" size="md">
        <form onSubmit={handleCreate} id="create-lesson-form">
          <div className="form-group"><label className="form-label">Tiêu đề *</label>
            <input className="form-input" placeholder="VD: Chiến thắng Điện Biên Phủ" value={form.title} onChange={e => setForm({...form, title: e.target.value})} autoFocus /></div>
          <div className="form-group"><label className="form-label">Mô tả</label>
            <textarea className="form-input form-textarea" placeholder="Mô tả ngắn..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo bài học'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
