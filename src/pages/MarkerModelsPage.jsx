import { useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useFBX, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { markerModelApi, uploadApi } from '../api/api';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Crosshair, Plus, Pencil, Trash2, Upload, Image, Package } from 'lucide-react';
import './MarkerModelsPage.css';

function FBXModel({ url }) {
  const fbx = useFBX(url);

  useMemo(() => {
    // Ensure all meshes have a visible material if missing
    fbx.traverse((child) => {
      if (child.isMesh) {
        if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
          child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        }
      }
    });

    // Auto-scale based on bounding box
    const box = new THREE.Box3().setFromObject(fbx);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2 / maxDim; // normalize to ~2 units
      fbx.scale.setScalar(scale);
    }

    // Center the model
    const center = box.getCenter(new THREE.Vector3());
    fbx.position.sub(center.multiplyScalar(fbx.scale.x));
  }, [fbx]);

  return <primitive object={fbx} />;
}

function ModelViewer({ url }) {
  if (!url) return <div className="model-placeholder">Chưa có model 3D</div>;
  return (
    <div className="model-viewer-container">
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <Center>
            <FBXModel url={url} />
          </Center>
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  );
}

export default function MarkerModelsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ markerCode: '', modelUrl: '', imageUrl: '', previewModelCode: '' });
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await markerModelApi.getAll();
      setItems(res.data.data || []);
    } catch { showToast('Không thể tải danh sách marker-model', 'error'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ markerCode: '', modelUrl: '', imageUrl: '', previewModelCode: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      markerCode: item.markerCode || '',
      modelUrl: item.modelUrl || '',
      imageUrl: item.imageUrl || '',
      previewModelCode: item.previewModelCode || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.markerCode.trim()) { showToast('Nhập mã marker', 'warning'); return; }
    if (!form.modelUrl.trim()) { showToast('Upload file FBX model', 'warning'); return; }
    if (!form.imageUrl.trim()) { showToast('Upload ảnh marker', 'warning'); return; }
    try {
      if (editing) {
        await markerModelApi.update(editing.id, form);
        showToast('Cập nhật thành công', 'success');
      } else {
        await markerModelApi.create(form);
        showToast('Tạo marker-model thành công', 'success');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Thất bại', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa marker-model này?')) return;
    try {
      await markerModelApi.delete(id);
      showToast('Đã xóa', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const handleModelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.fbx')) {
      showToast('Chỉ chấp nhận file định dạng .fbx', 'warning');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadApi.uploadModel(file);
      setForm(f => ({ ...f, modelUrl: res.data.data }));
      showToast('Upload model thành công', 'success');
    } catch { showToast('Upload model thất bại', 'error'); }
    finally { setUploading(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      setForm(f => ({ ...f, imageUrl: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload ảnh thất bại', 'error'); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="marker-models-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Crosshair size={24} style={{display:'inline', verticalAlign:'middle', marginRight:8}} /> Quản lý Marker</h1>
          <p className="page-subtitle">Quản lý bộ Marker - Model 3D dùng cho bài học AR</p>
        </div>
        {isAdmin() && (
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Thêm marker-model</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">Chưa có marker-model nào. {isAdmin() ? 'Tạo bộ đầu tiên!' : ''}</p>
        </div>
      ) : (
        <div className="marker-model-grid">
          {items.map(item => (
            <div key={item.id} className="marker-model-card" onClick={() => setPreviewItem(item)}>
              <div className="mm-card-model">
                <ModelViewer url={item.modelUrl} />
              </div>
              <div className="mm-card-image">
                {item.imageUrl && <img src={item.imageUrl} alt={item.markerCode} />}
              </div>
              <div className="mm-card-info">
                <strong className="mm-card-code">{item.markerCode}</strong>
                {item.previewModelCode && <span className="mm-card-preview-code">Preview: {item.previewModelCode}</span>}
                <span className="mm-card-meta">Tạo bởi: {item.createdBy} — {item.createdAt?.substring(0, 10)}</span>
              </div>
              {isAdmin() && (
                <div className="mm-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" onClick={() => openEdit(item)} title="Sửa"><Pencil size={14} /></button>
                  <button className="btn-icon" onClick={() => handleDelete(item.id)} title="Xóa"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal isOpen={!!previewItem} title={`Preview: ${previewItem?.markerCode || ''}`} onClose={() => setPreviewItem(null)}>
        {previewItem && (
          <div className="mm-preview-modal">
            <div className="mm-preview-model">
              <ModelViewer url={previewItem.modelUrl} />
            </div>
            <div className="mm-preview-image">
              <img src={previewItem.imageUrl} alt={previewItem.markerCode} />
            </div>
            <div className="mm-preview-info">
              <p><strong>Mã marker:</strong> {previewItem.markerCode}</p>
              <p><strong>Preview Model Code:</strong> {previewItem.previewModelCode || '—'}</p>
              <p><strong>Tạo bởi:</strong> {previewItem.createdBy}</p>
              <p><strong>Ngày tạo:</strong> {previewItem.createdAt?.substring(0, 10)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} title={editing ? 'Sửa Marker-Model' : 'Thêm Marker-Model'} onClose={() => setShowModal(false)} size="lg">
          <form onSubmit={handleSave} className="mm-form">
            <div className="form-group">
              <label className="form-label">Mã Marker *</label>
              <input className="form-input" value={form.markerCode} onChange={e => setForm({ ...form, markerCode: e.target.value })} placeholder="VD: marker_bach_dang" />
            </div>

            <div className="form-group">
              <label className="form-label">File Model 3D (.fbx) *</label>
              <label className="btn btn-secondary btn-sm upload-btn">
                <span>{uploading ? 'Đang upload...' : 'Upload FBX'}</span>
                <input type="file" accept=".fbx" onChange={handleModelUpload} hidden disabled={uploading} />
              </label>
              {form.modelUrl && (
                <div className="mm-form-model-preview">
                  <ModelViewer url={form.modelUrl} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Ảnh Marker *</label>
              <label className="btn btn-secondary btn-sm upload-btn">
                <span>{uploading ? 'Đang upload...' : 'Upload ảnh'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden disabled={uploading} />
              </label>
              {form.imageUrl && <img src={form.imageUrl} alt="marker" className="mm-form-img-preview" />}
            </div>

            <div className="form-group">
              <label className="form-label">Preview Model Code</label>
              <input className="form-input" value={form.previewModelCode} onChange={e => setForm({ ...form, previewModelCode: e.target.value })} placeholder="Mã dùng cho app AR preview" />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={uploading}>{editing ? 'Cập nhật' : 'Tạo mới'}</button>
            </div>
          </form>
      </Modal>
    </div>
  );
}
