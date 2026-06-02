import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useFBX, useGLTF, Center, Bounds, useBounds, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { markerModelApi, uploadApi } from '../api/api';
import { showToast } from '../components/Toast';
import UploadProgressBar from '../components/UploadProgressBar';
import Modal from '../components/Modal';
import { Crosshair, Plus, Pencil, Trash2, Upload, Image, Package, Loader } from 'lucide-react';
import './MarkerModelsPage.css';

function FBXModel({ url }) {
  const fbx = useFBX(url);

  useMemo(() => {
    fbx.traverse((child) => {
      if (child.isMesh) {
        if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
          child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [fbx]);

  return <primitive object={fbx} />;
}

function GLBModel({ url }) {
  const { scene } = useGLTF(url);

  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
          child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}

function isGLB(url) {
  return /\.glb(\?|$)/i.test(url) || /\.gltf(\?|$)/i.test(url);
}

/* Auto-fit camera to model once loaded */
function AutoFit({ children }) {
  const bounds = useBounds();
  useEffect(() => {
    bounds.refresh().clip().fit();
  }, [children]);
  return <>{children}</>;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#ddd" wireframe />
    </mesh>
  );
}

function ModelViewer({ url }) {
  if (!url) return <div className="model-placeholder">Chưa có model 3D</div>;
  const ModelComponent = isGLB(url) ? GLBModel : FBXModel;
  return (
    <div className="model-viewer-container">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }} shadows>
        <color attach="background" args={['#e2e2e2']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-3, -2, -3]} intensity={0.3} />
        <hemisphereLight groundColor="#e0e0e0" intensity={0.4} />
        <Suspense fallback={<LoadingFallback />}>
          <Bounds fit clip observe margin={1.5}>
            <AutoFit>
              <Center>
                <ModelComponent url={url} />
              </Center>
            </AutoFit>
          </Bounds>
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate makeDefault />
        {/* Subtle ground shadow plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <shadowMaterial transparent opacity={0.15} />
        </mesh>
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
  const [uploadProgress, setUploadProgress] = useState(0);
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
    const name = file.name.toLowerCase();
    if (!name.endsWith('.fbx') && !name.endsWith('.glb') && !name.endsWith('.gltf')) {
      showToast('Chỉ chấp nhận file .fbx, .glb hoặc .gltf', 'warning');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadModel(file, (pct) => setUploadProgress(pct));
      setForm(f => ({ ...f, modelUrl: res.data.data }));
      showToast('Upload model thành công', 'success');
    } catch { showToast('Upload model thất bại', 'error'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      setForm(f => ({ ...f, imageUrl: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload ảnh thất bại', 'error'); }
    finally { setUploading(false); setUploadProgress(0); }
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
              <div className="mm-card-thumbnail">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.markerCode} />
                  : <div className="mm-card-no-image"><Package size={32} /><span>Chưa có ảnh</span></div>
                }
              </div>
              <div className="mm-card-info">
                <strong className="mm-card-code">{item.markerCode}</strong>
                {item.previewModelCode && <span className="mm-card-preview-code">Preview: {item.previewModelCode}</span>}
                <span className="mm-card-meta">Tạo bởi: {item.createdBy} — {item.createdAt?.substring(0, 10)}</span>
                {item.modelUrl && <span className="mm-card-model-badge"><Package size={12} /> Model 3D</span>}
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
              <label className="form-label">File Model 3D (.fbx / .glb) *</label>
              <label className="btn btn-secondary btn-sm upload-btn">
                <span>{uploading ? 'Đang upload...' : 'Upload Model'}</span>
                <input type="file" accept=".fbx,.glb,.gltf" onChange={handleModelUpload} hidden disabled={uploading} />
              </label>
              {uploading && <UploadProgressBar progress={uploadProgress} label="Đang upload model..." />}
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
              {uploading && <UploadProgressBar progress={uploadProgress} label="Đang upload ảnh..." />}
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
