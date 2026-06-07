import { useState, useEffect } from 'react';
import { match3Api, uploadApi, markerModelApi } from '../api/api';
import { showToast } from '../components/Toast';
import UploadProgressBar from '../components/UploadProgressBar';
import Modal from '../components/Modal';
import { Puzzle, Plus, Pencil, Trash2, Upload, Type, Image as ImageIcon, Box, ChevronDown } from 'lucide-react';
import './Match3Page.css';

const NOTE_TYPES = [
  { value: 'TEXT', label: 'Văn bản', icon: Type },
  { value: 'IMAGE', label: 'Hình ảnh', icon: ImageIcon },
  { value: 'MODEL', label: 'Model 3D', icon: Box },
];

export default function Match3Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    imageUrl1: '', imageUrl2: '', imageUrl3: '', note: '',
    noteType: 'TEXT', noteMediaUrl: '', noteModelCode: ''
  });
  const [uploadingField, setUploadingField] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [availableModels, setAvailableModels] = useState([]);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [res, mmRes] = await Promise.all([
        match3Api.getAll(),
        markerModelApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setItems(res.data.data || []);
      setAvailableModels(mmRes.data.data || []);
    } catch { showToast('Không thể tải danh sách bộ 3 ảnh', 'error'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ imageUrl1: '', imageUrl2: '', imageUrl3: '', note: '', noteType: 'TEXT', noteMediaUrl: '', noteModelCode: '' });
    setShowModelPicker(false);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      imageUrl1: item.imageUrl1 || '',
      imageUrl2: item.imageUrl2 || '',
      imageUrl3: item.imageUrl3 || '',
      note: item.note || '',
      noteType: item.noteType || 'TEXT',
      noteMediaUrl: item.noteMediaUrl || '',
      noteModelCode: item.noteModelCode || '',
    });
    setShowModelPicker(false);
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
    if (form.noteType === 'IMAGE' && !form.noteMediaUrl) {
      showToast('Vui lòng upload ảnh thông báo', 'warning');
      return;
    }
    if (form.noteType === 'MODEL' && !form.noteModelCode) {
      showToast('Vui lòng chọn Model 3D', 'warning');
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
    setUploadingField(field);
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      setForm(f => ({ ...f, [field]: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload ảnh thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  const handleNoteImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField('note-image');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      setForm(f => ({ ...f, noteMediaUrl: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  const selectModel = (mm) => {
    setForm(f => ({ ...f, noteModelCode: mm.previewModelCode || mm.markerCode }));
    setShowModelPicker(false);
  };

  const getNoteTypeLabel = (type) => {
    const t = NOTE_TYPES.find(n => n.value === type);
    return t ? t.label : type || 'Văn bản';
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
                <div className="match3-note-header">
                  <span className="match3-note-label">Note:</span>
                  <span className={`match3-note-type-badge type-${(item.noteType || 'TEXT').toLowerCase()}`}>{getNoteTypeLabel(item.noteType)}</span>
                </div>
                <span className="match3-note-text">{item.note}</span>
                {item.noteType === 'IMAGE' && item.noteMediaUrl && (
                  <img src={item.noteMediaUrl} alt="" className="match3-note-thumb" />
                )}
                {item.noteType === 'MODEL' && item.noteModelCode && (
                  <span className="match3-note-model"><Box size={12} /> {item.noteModelCode}</span>
                )}
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
            {['imageUrl1', 'imageUrl2', 'imageUrl3'].map((field, idx) => {
              const isUploadingThis = uploadingField === field;
              return (
                <div key={field} className="form-group match3-image-group">
                  <label className="form-label">Ảnh {idx + 1} *</label>
                  <div className="match3-image-upload">
                    {form[field] ? (
                      <img src={form[field]} alt={`Ảnh ${idx + 1}`} className="match3-preview-img" />
                    ) : (
                      <div className="match3-placeholder">Chưa có ảnh</div>
                    )}
                    <label className={`btn btn-secondary btn-sm upload-btn ${uploadingField && !isUploadingThis ? 'upload-btn-disabled' : ''}`}>
                      <span>{isUploadingThis ? 'Đang upload...' : 'Upload'}</span>
                      <input type="file" accept="image/*" hidden onChange={e => handleImageUpload(e, field)} disabled={!!uploadingField} />
                    </label>
                    {isUploadingThis && <UploadProgressBar progress={uploadProgress} label="Đang upload ảnh..." />}
                  </div>
                </div>
              );
            })}
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

          {/* Note Type Picker */}
          <div className="form-group">
            <label className="form-label">Loại thông báo kèm theo</label>
            <div className="match3-note-type-picker">
              {NOTE_TYPES.map(t => (
                <button key={t.value} type="button"
                  className={`step-type-btn ${form.noteType === t.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, noteType: t.value, noteMediaUrl: '', noteModelCode: '' })}>
                  <span className="step-type-icon"><t.icon size={16} /></span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* IMAGE note */}
          {form.noteType === 'IMAGE' && (
            <div className="form-group">
              <label className="form-label">Ảnh thông báo *</label>
              <div className="annotation-media-area">
                {form.noteMediaUrl && <img src={form.noteMediaUrl} alt="" className="annotation-media-preview" />}
                <label className={`btn btn-secondary btn-sm ${uploadingField && uploadingField !== 'note-image' ? 'btn-disabled' : ''}`}>
                  <span>{uploadingField === 'note-image' ? 'Đang upload...' : <><Upload size={12} /> Upload ảnh</>}</span>
                  <input type="file" accept="image/*" onChange={handleNoteImageUpload} hidden disabled={!!uploadingField} />
                </label>
                {uploadingField === 'note-image' && <UploadProgressBar progress={uploadProgress} label="Đang upload ảnh..." />}
                <input className="form-input" placeholder="Hoặc nhập URL ảnh" value={form.noteMediaUrl} onChange={e => setForm({ ...form, noteMediaUrl: e.target.value })} />
              </div>
            </div>
          )}

          {/* MODEL note */}
          {form.noteType === 'MODEL' && (
            <div className="form-group">
              <label className="form-label">Chọn Model 3D *</label>
              {form.noteModelCode ? (
                <div className="selected-mm-card">
                  <div className="selected-mm-info">
                    <Box size={20} />
                    <div>
                      <strong>{form.noteModelCode}</strong>
                      <span className="selected-mm-code">Model 3D</span>
                    </div>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setForm(f => ({...f, noteModelCode: ''})); setShowModelPicker(true); }}>Đổi</button>
                </div>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModelPicker(!showModelPicker)} style={{marginBottom: 8}}>
                    <ChevronDown size={14} /> Chọn từ danh sách Marker-Model
                  </button>
                  {showModelPicker && (
                    <div className="mm-select-list">
                      {availableModels.length === 0 ? <p className="text-muted">Chưa có bộ marker-model nào.</p> :
                        availableModels.filter(mm => mm.previewModelCode).map(mm => (
                          <div key={mm.id} className="mm-select-item" onClick={() => selectModel(mm)}>
                            {mm.imageUrl && <img src={mm.imageUrl} alt="" className="mm-select-img" />}
                            <div className="mm-select-info">
                              <strong>{mm.previewModelCode || mm.markerCode}</strong>
                              <span>Marker: {mm.markerCode}</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!!uploadingField}>
              {editing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
