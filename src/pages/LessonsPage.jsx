import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessonApi } from '../api/api';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import { BookOpen, CheckCircle2, FileEdit, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import './LessonsPage.css';

const ITEMS_PER_PAGE = 10;

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', content: '', thumbnailUrl: '' });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterQuiz, setFilterQuiz] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus, filterQuiz]);

  const publishedCount = lessons.filter(l => l.status === 'PUBLISH').length;
  const draftCount = lessons.filter(l => l.status === 'DRAFT').length;

  return (
    <div className="lessons-page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><BookOpen size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> Bài học</h1>
          <p className="page-subtitle">Quản lý tất cả bài học AR lịch sử trong hệ thống của bạn.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="btn-create-lesson">
          <Plus size={16} /> Tạo bài học mới
        </button>
      </div>

      {/* Stats */}
      <div className="lessons-stats">
        <div className="stat-card">
          <div className="stat-icon stat-icon-amber"><BookOpen size={20} /></div>
          <div>
            <div className="stat-value">{lessons.length}</div>
            <div className="stat-label">Tổng bài học</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle2 size={20} /></div>
          <div>
            <div className="stat-value">{publishedCount}</div>
            <div className="stat-label">Đã xuất bản</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><FileEdit size={20} /></div>
          <div>
            <div className="stat-value">{draftCount}</div>
            <div className="stat-label">Bản nháp</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="lessons-filters">
        <div className="filter-search-wrap ">
          <Search size={16} className="filter-search-icon" />
          <input className="form-input filter-search" placeholder="Tìm theo tên bài học..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
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
            filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><BookOpen size={40} /></div><p className="empty-state-text">Không tìm thấy bài học</p></div> :
              <table className="data-table" id="lessons-table">
                <thead><tr>
                  <th style={{ width: '40px' }}>#</th><th>Tiêu đề</th><th>Marker</th><th>Trạng thái</th><th>Quiz</th><th>Game</th><th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr></thead>
                <tbody>{paginatedItems.map((l, i) => (
                  <tr key={l.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <td style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{(safeCurrentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                    <td><div className="lesson-title-cell">
                      {l.thumbnailUrl && <img src={l.thumbnailUrl.startsWith('/') ? `http://localhost:8080${l.thumbnailUrl}` : l.thumbnailUrl} alt="" className="lesson-thumb" />}
                      <span className="lesson-title-text">{l.title}</span>
                    </div></td>
                    <td>{l.markerCode ? <span className="badge badge-publish">{l.markerCode}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td><span className={`badge badge-${l.status?.toLowerCase()}`}>{l.status === 'PUBLISH' ? <><span className="badge-dot badge-dot-green"></span> PUBLISHED</> : 'DRAFT'}</span></td>
                    <td>{l.hasQuiz ? <CheckCircle2 size={18} color="var(--success)" /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td>{l.hasGamification ? <CheckCircle2 size={18} color="var(--success)" /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-btns">
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/lessons/${l.id}/edit`)}><Pencil size={12} /> Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Hiển thị {paginatedItems.length} trong tổng số {filtered.length} bài học
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn pagination-arrow"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-btn ${page === safeCurrentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-btn pagination-arrow"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo bài học mới" size="md">
        <form onSubmit={handleCreate} id="create-lesson-form">
          <div className="form-group"><label className="form-label">Tiêu đề *</label>
            <input className="form-input" placeholder="VD: Chiến thắng Điện Biên Phủ" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /></div>
          <div className="form-group"><label className="form-label">Mô tả</label>
            <textarea className="form-input form-textarea" placeholder="Mô tả ngắn..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo bài học'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
