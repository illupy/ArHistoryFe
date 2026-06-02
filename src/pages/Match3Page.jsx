import { useState, useEffect } from 'react';
import { match3Api, uploadApi } from '../api/api';
import { showToast } from '../components/Toast';
import UploadProgressBar from '../components/UploadProgressBar';
import Modal from '../components/Modal';
import { Puzzle, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import './Match3Page.css';

export default function Match3Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ imageUrl1: '', imageUrl2: '', imageUrl3: '', note: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await match3Api.getAll();
      setItems(res.data.data || []);
    } catch { showToast('Không thể tải danh sách bộ 3 ảnh', 'error'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ imageUrl1: '', imageUrl2: '', imageUrl3: '', note: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      imageUrl1: item.imageUrl1 || '',
      imageUrl2: item.imageUrl2 || '',
      imageUrl3: item.imageUrl3 || '',
      note: item.note || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.imageUrl1.trim() || !form.imageUrl2.trim() || !form.imageUrl3.trim()) {
      showToast('Vui lòng upload đủ 3 ảnh', 'warning');
      return;
    }
    if (!form.note.trim()) {
      showToast('Vui lòng nhập ghi chú (note)', 'warning');
      return;
    }
    try {
      if (editing) {
        await match3Api.update(editing.id, form);
        showToast('Cập nhật bộ 3 ảnh thành công', 'success');
      } else {
        await match3Api.create(form);
        showToast('Tạo bộ 3 ảnh thành công', 'success');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa bộ 3 ảnh này?')) return;
    try {
      await match3Api.delete(id);
      showToast('Đã xóa', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      setForm(f => ({ ...f, [field]: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload ảnh thất bại', 'error'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="match3-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Puzzle size={24} style={{display:'inline', verticalAlign:'middle', marginRight:8}} /> Quản lý Match3 Game</h1>
          <p className="page-subtitle">Quản lý các bộ 3 ảnh dùng cho game Match3</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Thêm bộ 3 ảnh</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">Chưa có bộ 3 ảnh nào. Tạo bộ đầu tiên!</p>
        </div>
      ) : (
        <div className="match3-grid">
          {items.map(item => (
            <div key={item.id} className="match3-card">
              <div className="match3-card-images">
                <img src={item.imageUrl1} alt="Ảnh 1" className="match3-thumb" />
                <img src={item.imageUrl2} alt="Ảnh 2" className="match3-thumb" />
                <img src={item.imageUrl3} alt="Ảnh 3" className="match3-thumb" />
              </div>
              <div className="match3-card-note">
                <span className="match3-note-label">Note:</span>
                <span className="match3-note-text">{item.note}</span>
              </div>
              <div className="match3-card-actions">
                <button className="btn-icon" onClick={() => openEdit(item)} title="Sửa"><Pencil size={14} /></button>
                <button className="btn-icon" onClick={() => handleDelete(item.id)} title="Xóa"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} title={editing ? 'Sửa bộ 3 ảnh' : 'Thêm bộ 3 ảnh'} onClose={() => setShowModal(false)} size="lg">
        <form onSubmit={handleSave} className="match3-form">
          <div className="match3-form-images">
            {['imageUrl1', 'imageUrl2', 'imageUrl3'].map((field, idx) => (
              <div key={field} className="form-group match3-image-group">
                <label className="form-label">Ảnh {idx + 1} *</label>
                <div className="match3-image-upload">
                  {form[field] ? (
                    <img src={form[field]} alt={`Ảnh ${idx + 1}`} className="match3-preview-img" />
                  ) : (
                    <div className="match3-placeholder">Chưa có ảnh</div>
                  )}
                  <label className="btn btn-secondary btn-sm upload-btn">
                    <span>{uploading ? 'Đang upload...' : 'Upload'}</span>
                    <input type="file" accept="image/*" hidden onChange={e => handleImageUpload(e, field)} disabled={uploading} />
                  </label>
                  {uploading && <UploadProgressBar progress={uploadProgress} label="Đang upload ảnh..." />}
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú (Note) *</label>
            <textarea
              className="form-input match3-note-input"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="Nhập ghi chú hiển thị khi ghép đúng bộ 3 ảnh..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {editing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
