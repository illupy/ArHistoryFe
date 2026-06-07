import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessonApi, markerApi, assetApi, quizApi, uploadApi, markerModelApi, annotationApi } from '../api/api';
import { showToast } from '../components/Toast';
import UploadProgressBar from '../components/UploadProgressBar';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import { ClipboardList, MapPin, FileText, HelpCircle, Rocket, Type, Video, Images, ArrowLeft, Plus, Pencil, Trash2, Save, Upload, Music, CircleDot, Circle, CheckCircle2, AlertTriangle, Gamepad2, ToggleLeft, ToggleRight, Image as ImageIcon, BookMarked, Tag, Eye, Copy, ChevronDown, ChevronUp, ChevronRight, Box } from 'lucide-react';
import './LessonEditorPage.css';

const TABS = [
  { key: 'general', label: 'Nội dung bài học', icon: ClipboardList },
  { key: 'markers', label: 'Markers', icon: MapPin },
  { key: 'steps', label: 'Nội dung', icon: FileText },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle },
  { key: 'publish', label: 'Publish', icon: Rocket },
];

const STEP_TYPES = [
  { value: 'TEXT', label: 'Văn bản', icon: Type },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'IMAGE_GALLERY', label: 'Bộ ảnh', icon: Images },
];

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/<!--.*?-->/g, '').trim();
};

export default function LessonEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('general');
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General
  const [form, setForm] = useState({ title:'', description:'', content:'', thumbnailUrl:'' });

  // Marker
  const [markers, setMarkers] = useState([]);
  const [markerForm, setMarkerForm] = useState({ markerCode:'', imageUrl:'', previewModelCode:'', previewAudioUrl:'', active: true });
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [editingMarker, setEditingMarker] = useState(null);
  const [availableMarkerModels, setAvailableMarkerModels] = useState([]);
  const [showMarkerModelPicker, setShowMarkerModelPicker] = useState(false);
  const [selectedMarkerModel, setSelectedMarkerModel] = useState(null);

  // Steps
  const [steps, setSteps] = useState([]);
  const [stepForm, setStepForm] = useState({ type:'TEXT', content:'', fileUrl:'', orderIndex:0, mediaUrls:[] });
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Annotations (lesson-level)
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [lessonAnnotations, setLessonAnnotations] = useState([]);
  const [annotationForm, setAnnotationForm] = useState({
    keyword: '', title: '', description: '', annotationType: 'IMAGE',
    mediaUrl: '', modelCode: '', orderIndex: 0
  });
  const [showAnnotationModelPicker, setShowAnnotationModelPicker] = useState(false);
  const [annotationsCollapsed, setAnnotationsCollapsed] = useState(false);

  // Ref for RichTextEditor to insert annotation tags
  const activeEditorRef = useRef(null);

  // Quiz
  const [quiz, setQuiz] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [showQModal, setShowQModal] = useState(false);
  const [qForm, setQForm] = useState({
    questionText: '',
    answers: [
      { answerText: '', correct: true },
      { answerText: '', correct: false },
      { answerText: '', correct: false },
      { answerText: '', correct: false },
    ],
  });

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await lessonApi.getById(id);
      const d = res.data.data;
      setLesson(d);
      setForm({ title: d.title||'', description: d.description||'', content: d.content||'', thumbnailUrl: d.thumbnailUrl||'' });

      const [mkRes, stRes, mmRes, annRes] = await Promise.all([
        markerApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
        assetApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
        markerModelApi.getAll().catch(() => ({ data: { data: [] } })),
        annotationApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
      ]);
      setMarkers(mkRes.data.data || []);
      setSteps(stRes.data.data || []);
      setAvailableMarkerModels(mmRes.data.data || []);
      setLessonAnnotations(annRes.data.data || []);

      try {
        const qRes = await quizApi.getByLesson(id);
        setQuiz(qRes.data.data);
      } catch { setQuiz(null); }
    } catch {
      showToast('Không thể tải bài học', 'error');
    } finally { setLoading(false); }
  };

  // ===== General Tab =====
  const saveGeneral = async () => {
    setSaving(true);
    try {
      await lessonApi.update(id, form);
      showToast('Đã lưu thông tin chung', 'success');
      fetchAll();
    } catch { showToast('Lưu thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handleThumbUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField('thumbnail');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      const url = res.data.data;
      setForm(f => ({ ...f, thumbnailUrl: url }));
      showToast('Upload thumbnail thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  // ===== Marker Edit/Delete =====
  const openEditMarker = (m) => {
    setEditingMarker(m);
    setMarkerForm({ markerCode: m.markerCode||'', imageUrl: m.imageUrl||'', previewModelCode: m.previewModelCode||'', previewAudioUrl: m.previewAudioUrl||'', active: m.active !== false });
    // Find if this marker matches an available marker-model
    const matched = availableMarkerModels.find(mm => mm.markerCode === m.markerCode);
    setSelectedMarkerModel(matched || null);
    setShowMarkerModal(true);
  };

  const openAddMarker = () => {
    setEditingMarker(null);
    setMarkerForm({ markerCode:'', imageUrl:'', previewModelCode:'', previewAudioUrl:'', active: true });
    setSelectedMarkerModel(null);
    setShowMarkerModal(true);
  };

  const selectMarkerModelForForm = (mm) => {
    setSelectedMarkerModel(mm);
    setMarkerForm(f => ({
      ...f,
      markerCode: mm.markerCode,
      imageUrl: mm.imageUrl,
      previewModelCode: mm.previewModelCode || '',
    }));
  };

  // ===== Marker Tab =====
  const saveMarker = async (e) => {
    e.preventDefault();
    if (!selectedMarkerModel && !editingMarker) { showToast('Vui lòng chọn bộ Marker-Model từ hệ thống', 'warning'); return; }
    if (!markerForm.markerCode.trim()) { showToast('Nhập mã marker', 'warning'); return; }
    try {
      if (editingMarker) {
        await markerApi.update(editingMarker.id, markerForm);
        showToast('Cập nhật marker thành công', 'success');
      } else {
        await markerApi.create({ lessonId: parseInt(id), ...markerForm });
        showToast('Tạo marker thành công', 'success');
      }
      setShowMarkerModal(false);
      setMarkerForm({ markerCode:'', imageUrl:'', previewModelCode:'', previewAudioUrl:'', active: true });
      setEditingMarker(null);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Thất bại', 'error'); }
  };

  const handleMarkerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField('marker-image');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      setMarkerForm(f => ({ ...f, imageUrl: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  // ===== Steps Tab =====
  const openAddStep = () => {
    setEditingStep(null);
    setStepForm({ type:'TEXT', content:'', fileUrl:'', orderIndex: steps.length, mediaUrls:[] });
    setShowStepModal(true);
  };

  const openEditStep = (step) => {
    setEditingStep(step);
    setStepForm({ type: step.type||'TEXT', content: step.content||'', fileUrl: step.fileUrl||'', orderIndex: step.orderIndex||0, mediaUrls: step.mediaUrls||[] });
    setShowStepModal(true);
  };

  const saveStep = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...stepForm };
      if (payload.type !== 'IMAGE_GALLERY') payload.mediaUrls = [];
      if (payload.type !== 'VIDEO') payload.fileUrl = '';
      if (editingStep) {
        await assetApi.update(editingStep.id, payload);
        showToast('Cập nhật thành công', 'success');
      } else {
        await assetApi.create({ lessonId: parseInt(id), ...payload });
        showToast('Tạo block thành công', 'success');
      }
      setShowStepModal(false);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Thất bại', 'error'); }
  };

  const deleteStep = async (stepId) => {
    if (!confirm('Xóa block này?')) return;
    try {
      await assetApi.delete(stepId);
      showToast('Đã xóa', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField('step-video');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadVideo(file, (pct) => setUploadProgress(pct));
      setStepForm(f => ({ ...f, fileUrl: res.data.data }));
      showToast('Upload video thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 4 - (stepForm.mediaUrls?.length || 0);
    if (files.length > remaining) { showToast(`Chỉ được thêm tối đa ${remaining} ảnh nữa`, 'warning'); return; }
    setUploadingField('step-gallery');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadMultiImages(files, (pct) => setUploadProgress(pct));
      setStepForm(f => ({ ...f, mediaUrls: [...(f.mediaUrls||[]), ...res.data.data] }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  const removeGalleryImage = (idx) => {
    setStepForm(f => ({ ...f, mediaUrls: f.mediaUrls.filter((_, i) => i !== idx) }));
  };

  const fullUrl = (url) => url?.startsWith('/') ? `http://localhost:8080${url}` : url;

  // ===== Annotation Handlers (lesson-level) =====
  const openAddAnnotation = () => {
    setEditingAnnotation(null);
    setAnnotationForm({ keyword: '', title: '', description: '', annotationType: 'IMAGE', mediaUrl: '', modelCode: '', orderIndex: 0 });
    setShowAnnotationModelPicker(false);
    setShowAnnotationModal(true);
  };

  const openEditAnnotation = (ann) => {
    setEditingAnnotation(ann);
    setAnnotationForm({
      keyword: ann.keyword || '', title: ann.title || '', description: ann.description || '',
      annotationType: ann.annotationType || 'IMAGE', mediaUrl: ann.mediaUrl || '',
      modelCode: ann.modelCode || '', orderIndex: ann.orderIndex || 0
    });
    setShowAnnotationModelPicker(false);
    setShowAnnotationModal(true);
  };

  const saveAnnotation = async (e) => {
    e.preventDefault();
    if (!annotationForm.keyword.trim()) { showToast('Nhập từ khóa chú thích', 'warning'); return; }
    if (annotationForm.annotationType === 'IMAGE' && !annotationForm.mediaUrl) { showToast('Vui lòng upload ảnh', 'warning'); return; }
    if (annotationForm.annotationType === 'MODEL' && !annotationForm.modelCode) { showToast('Vui lòng chọn Model 3D', 'warning'); return; }
    try {
      if (editingAnnotation) {
        await annotationApi.update(editingAnnotation.id, annotationForm);
        showToast('Cập nhật chú thích thành công', 'success');
      } else {
        await annotationApi.create(id, annotationForm);
        showToast('Tạo chú thích thành công', 'success');
      }
      setShowAnnotationModal(false);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Thất bại', 'error'); }
  };

  const deleteAnnotation = async (annId) => {
    if (!confirm('Xóa chú thích này?')) return;
    try {
      await annotationApi.delete(annId);
      showToast('Đã xóa chú thích', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const ANNOTATION_TYPES = [
    { value: 'IMAGE', label: 'Hình ảnh', icon: ImageIcon },
    { value: 'MODEL', label: 'Model 3D', icon: Box },
  ];

  const handleAnnotationImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField('annotation-image');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadImage(file, (pct) => setUploadProgress(pct));
      setAnnotationForm(f => ({ ...f, mediaUrl: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  const selectAnnotationModel = (mm) => {
    setAnnotationForm(f => ({ ...f, modelCode: mm.previewModelCode || mm.markerCode }));
    setShowAnnotationModelPicker(false);
  };
  // Convert [ann:id] → styled chip spans for editor display
  const annToHtml = (html) => {
    if (!html) return html;
    return html.replace(/\[ann:(\d+)\]/g, (_, id) => {
      const ann = lessonAnnotations.find(a => String(a.id) === id);
      const keyword = ann ? ann.keyword : `#${id}`;
      return `<span class="ann-tag" data-ann-id="${id}" contenteditable="false">${keyword}</span>`;
    });
  };

  // Convert styled spans back → [ann:id] for DB storage
  const htmlToAnn = (html) => {
    if (!html) return html;
    return html.replace(/<span[^>]*data-ann-id="(\d+)"[^>]*>[^<]*<\/span>/g, '[ann:$1]');
  };

  const insertAnnotationTag = (ann) => {
    if (activeEditorRef.current) {
      const chipHtml = `<span class="ann-tag" data-ann-id="${ann.id}" contenteditable="false">${ann.keyword}</span>&nbsp;`;
      activeEditorRef.current.insertText(chipHtml);
      showToast(`Đã chèn chú thích "${ann.keyword}"`, 'success');
    } else {
      navigator.clipboard.writeText(`[ann:${ann.id}]`).then(() => {
        showToast(`Đã copy [ann:${ann.id}]`, 'success');
      });
    }
  };

  // ===== Quiz Tab =====
  const createQuiz = async () => {
    if (!quizTitle.trim()) { showToast('Nhập tiêu đề quiz', 'warning'); return; }
    try {
      await quizApi.create({ lessonId: parseInt(id), title: quizTitle });
      showToast('Tạo quiz thành công', 'success');
      setQuizTitle('');
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Thất bại', 'error'); }
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.questionText.trim()) { showToast('Nhập câu hỏi', 'warning'); return; }
    if (qForm.answers.some(a => !a.answerText.trim())) { showToast('Điền đủ 4 đáp án', 'warning'); return; }
    try {
      await quizApi.addQuestion(quiz.id, qForm);
      showToast('Thêm câu hỏi thành công', 'success');
      setShowQModal(false);
      setQForm({ questionText:'', answers: [
        { answerText:'', correct:true },{ answerText:'', correct:false },
        { answerText:'', correct:false },{ answerText:'', correct:false },
      ]});
      fetchAll();
    } catch { showToast('Thất bại', 'error'); }
  };

  const deleteQuestion = async (qId) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
      await quizApi.deleteQuestion(qId);
      showToast('Đã xóa câu hỏi', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const deleteQuiz = async () => {
    if (!confirm('Xóa toàn bộ quiz và tất cả câu hỏi?')) return;
    try {
      await quizApi.delete(quiz.id);
      showToast('Đã xóa quiz', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const setCorrectAnswer = (idx) => {
    setQForm(f => ({
      ...f,
      answers: f.answers.map((a, i) => ({ ...a, correct: i === idx })),
    }));
  };

  // ===== Publish Tab =====
  const handlePublish = async (status) => {
    try {
      await lessonApi.updateStatus(id, status);
      showToast(status === 'PUBLISH' ? 'Đã xuất bản!' : 'Đã chuyển về nháp', 'success');
      fetchAll();
    } catch { showToast('Thất bại', 'error'); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;
  if (!lesson) return <div className="empty-state"><p>Không tìm thấy bài học</p></div>;

  const deleteMarker = async (markerId) => {
    if (!confirm('Xóa marker này?')) return;
    try {
      await markerApi.delete(markerId);
      showToast('Đã xóa marker', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const toggleMarkerActive = async (markerId) => {
    try {
      await markerApi.toggleActive(markerId);
      showToast('Đã cập nhật trạng thái', 'success');
      fetchAll();
    } catch { showToast('Thất bại', 'error'); }
  };

  const handleMarkerAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField('marker-audio');
    setUploadProgress(0);
    try {
      const res = await uploadApi.uploadAudio(file, (pct) => setUploadProgress(pct));
      setMarkerForm(f => ({ ...f, previewAudioUrl: res.data.data }));
      showToast('Upload audio thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploadingField(null); setUploadProgress(0); }
  };

  const checks = [
    { label: 'Thông tin chung', ok: !!lesson.title },
    { label: 'Marker', ok: markers.length > 0 },
    { label: 'Markers có preview', ok: markers.some(m => m.previewModelCode) },
    { label: 'Nội dung (≥1 step)', ok: steps.length > 0 },
    { label: 'Quiz', ok: !!quiz },
  ];

  return (
    <div className="editor-page animate-fade-in">
      <div className="editor-top-bar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/lessons')}><ArrowLeft size={14} /> Quay lại</button>
        <h1 className="editor-title">{lesson.title}</h1>
        <span className={`badge badge-${lesson.status?.toLowerCase()}`}>
          {lesson.status === 'PUBLISH' ? 'Đã xuất bản' : 'Bản nháp'}
        </span>
      </div>

      <div className="editor-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`editor-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {<t.icon size={14} />} {t.label}
          </button>
        ))}
      </div>

      <div className="editor-body">
        {/* ===== TAB GENERAL ===== */}
        {tab === 'general' && (
          <div className="tab-content animate-fade-in">
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Tiêu đề *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              {/* <div className="form-group"><label className="form-label">Thumbnail</label>
                <div className="thumb-upload-area">
                  {form.thumbnailUrl && <img src={form.thumbnailUrl.startsWith('/') ? `http://localhost:8080${form.thumbnailUrl}` : form.thumbnailUrl} alt="" className="thumb-preview" />}
                  <label className={`btn btn-secondary btn-sm ${uploadingField && uploadingField !== 'thumbnail' ? 'btn-disabled' : ''}`}>
                    <span>{uploadingField === 'thumbnail' ? 'Đang upload...' : <><Upload size={12} /> Upload ảnh</>}</span>
                    <input type="file" accept="image/*" onChange={handleThumbUpload} hidden disabled={!!uploadingField} />
                  </label>
                  {uploadingField === 'thumbnail' && <UploadProgressBar progress={uploadProgress} label="Đang upload thumbnail..." />}
                  <input className="form-input" placeholder="Hoặc nhập URL" value={form.thumbnailUrl} onChange={e => setForm({...form, thumbnailUrl: e.target.value})} />
                </div>
              </div> */}
            </div>
            <div className="form-group"><label className="form-label">Mô tả</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Nội dung tổng quan</label>
              <textarea className="form-input form-textarea" style={{minHeight:180}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
            <div className="tab-actions"><button className="btn btn-primary" onClick={saveGeneral} disabled={saving}>{saving ? 'Đang lưu...' : <><Save size={14} /> Lưu thông tin</>}</button></div>
          </div>
        )}

        {/* ===== TAB MARKERS ===== */}
        {tab === 'markers' && (
          <div className="tab-content animate-fade-in">
            <div className="tab-header"><h2>Markers ({markers.length})</h2>
              <button className="btn btn-primary btn-sm" onClick={openAddMarker}><Plus size={14} /> Thêm marker</button>
            </div>
            {markers.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có marker. Tạo marker đầu tiên!</p></div> :
              <div className="marker-list">{markers.map(m => (
                <div key={m.id} className={`marker-detail-card ${m.active === false ? 'marker-inactive' : ''}`}>
                  <div className="marker-detail-left">
                    {m.imageUrl && <img src={m.imageUrl.startsWith('/') ? `http://localhost:8080${m.imageUrl}` : m.imageUrl} alt="" className="marker-detail-img" />}
                  </div>
                  <div className="marker-detail-body">
                    <div className="marker-detail-header">
                      <strong className="marker-code">{m.markerCode}</strong>
                      <span className={`badge ${m.active !== false ? 'badge-publish' : 'badge-draft'}`}>{m.active !== false ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="marker-detail-fields">
                      <span><Gamepad2 size={12} /> Model: <strong>{m.previewModelCode || '—'}</strong></span>
                      <span><Music size={12} /> Audio: {m.previewAudioUrl ? <audio controls src={m.previewAudioUrl.startsWith('/') ? `http://localhost:8080${m.previewAudioUrl}` : m.previewAudioUrl} className="marker-audio" /> : <em>Chưa có</em>}</span>
                    </div>
                    <span className="marker-date">Tạo: {m.createdAt?.substring(0,10)}</span>
                  </div>
                  <div className="marker-detail-actions">
                    <button className="btn-icon" onClick={() => toggleMarkerActive(m.id)} title={m.active !== false ? 'Tắt' : 'Bật'}>{m.active !== false ? <ToggleRight size={16} color="var(--success)" /> : <ToggleLeft size={16} color="var(--text-tertiary)" />}</button>
                    <button className="btn-icon" onClick={() => openEditMarker(m)} title="Sửa"><Pencil size={14} /></button>
                    <button className="btn-icon" onClick={() => deleteMarker(m.id)} title="Xóa"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}</div>}
          </div>
        )}

        {/* ===== TAB STEPS ===== */}
        {tab === 'steps' && (
          <div className="tab-content animate-fade-in">
            {/* Lesson Annotations Panel — collapsible, for viewing/managing */}
            <div className={`lesson-annotations-panel ${annotationsCollapsed ? 'collapsed' : ''}`}>
              <div className="lesson-annotations-header" onClick={() => setAnnotationsCollapsed(!annotationsCollapsed)} style={{cursor:'pointer'}}>
                <div className="lesson-annotations-title">
                  {annotationsCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <BookMarked size={16} />
                  <h3>Chú thích bài học ({lessonAnnotations.length})</h3>
                </div>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); openAddAnnotation(); }}><Plus size={14} /> Thêm</button>
              </div>
              {!annotationsCollapsed && (
                <>
                  {lessonAnnotations.length === 0 ? (
                    <div className="lesson-annotations-empty">
                      <p>Chưa có chú thích. Thêm chú thích để gắn vào nội dung bài học.</p>
                    </div>
                  ) : (
                    <div className="lesson-annotations-list">
                      {lessonAnnotations.map(ann => (
                        <div key={ann.id} className="lesson-annotation-card">
                          <div className="lesson-annotation-info">
                            <div className="lesson-annotation-icon">
                              {ann.annotationType === 'IMAGE' ? <ImageIcon size={16} /> : <Box size={16} />}
                            </div>
                            <div className="lesson-annotation-details">
                              <span className="lesson-annotation-keyword">{ann.keyword}</span>
                              <span className={`annotation-chip-type type-${ann.annotationType?.toLowerCase()}`}>{ann.annotationType === 'IMAGE' ? 'Ảnh' : 'Model 3D'}</span>
                            </div>
                            {ann.annotationType === 'IMAGE' && ann.mediaUrl && (
                              <img src={ann.mediaUrl} alt="" className="lesson-annotation-thumb" />
                            )}
                            {ann.annotationType === 'MODEL' && ann.modelCode && (
                              <span className="lesson-annotation-model-code">{ann.modelCode}</span>
                            )}
                          </div>
                          <div className="lesson-annotation-actions always-visible">
                            <button className="btn-icon" onClick={() => openEditAnnotation(ann)} title="Sửa"><Pencil size={12} /></button>
                            <button className="btn-icon" onClick={() => deleteAnnotation(ann.id)} title="Xóa"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="lesson-annotations-hint">
                    <span>💡 Mở modal chỉnh sửa block để chèn chú thích vào nội dung</span>
                  </div>
                </>
              )}
            </div>

            <div className="tab-header"><h2>Nội dung bài học ({steps.length} blocks)</h2>
              <button className="btn btn-primary btn-sm" onClick={openAddStep}><Plus size={14} /> Thêm block</button></div>
            {steps.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có nội dung. Thêm block đầu tiên!</p></div> :
              <div className="steps-list">{steps.map((s, i) => (
                <div key={s.id} className="step-card" style={{animationDelay:`${i*0.05}s`}}>
                  <div className="step-order">{(s.orderIndex ?? i) + 1}</div>
                  <div className="step-body">
                    <div className="step-type"><span className={`badge badge-${s.type?.toLowerCase()}`}>{(() => { const ST = STEP_TYPES.find(t=>t.value===s.type); return ST ? <><ST.icon size={12} /> {ST.label}</> : s.type; })()}</span></div>
                    {s.type === 'TEXT' && <div className="step-text-preview" dangerouslySetInnerHTML={{__html: s.content || '<em>Trống</em>'}} />}
                    {s.type === 'VIDEO' && (
                      <div className="step-video-preview">
                        {s.fileUrl && <video src={fullUrl(s.fileUrl)} className="step-video-thumb" preload="metadata" />}
                        {s.content && <div className="step-text-preview" dangerouslySetInnerHTML={{__html: s.content}} />}
                      </div>
                    )}
                    {s.type === 'IMAGE_GALLERY' && (
                      <div className="step-gallery-preview">
                        <div className="step-gallery-thumbs">
                          {(s.mediaUrls||[]).slice(0,4).map((url, gi) => <img key={gi} src={fullUrl(url)} alt="" className="step-gallery-thumb" />)}
                        </div>
                        {s.content && <div className="step-text-preview" dangerouslySetInnerHTML={{__html: s.content}} />}
                      </div>
                    )}
                  </div>
                  <div className="step-actions">
                    <button className="btn-icon" onClick={() => openEditStep(s)} title="Sửa"><Pencil size={14} /></button>
                    <button className="btn-icon" onClick={() => deleteStep(s.id)} title="Xóa"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}</div>}
          </div>
        )}

        {/* ===== TAB QUIZ ===== */}
        {tab === 'quiz' && (
          <div className="tab-content animate-fade-in">
            {!quiz ? (
              <div className="quiz-create-box">
                <h2>Tạo Quiz cho bài học</h2>
                <div className="quiz-create-row">
                  <input className="form-input" placeholder="Tiêu đề quiz" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
                  <button className="btn btn-primary" onClick={createQuiz}>Tạo Quiz</button>
                </div>
              </div>
            ) : (
              <>
                <div className="tab-header"><h2><FileText size={18} style={{display:'inline', verticalAlign:'middle', marginRight:6}} /> {quiz.title} ({quiz.questions?.length || 0} câu hỏi)</h2>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowQModal(true)}><Plus size={14} /> Thêm câu hỏi</button>
                    <button className="btn btn-danger btn-sm" onClick={deleteQuiz}><Trash2 size={14} /> Xóa Quiz</button>
                  </div>
                </div>
                {quiz.questions?.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có câu hỏi</p></div> :
                  <div className="questions-list">{quiz.questions.map((q, qi) => (
                    <div key={q.id} className="question-card">
                      <div className="question-header">
                        <span className="question-num">Câu {qi+1}</span>
                        <button className="btn-icon" onClick={() => deleteQuestion(q.id)} title="Xóa"><Trash2 size={14} /></button>
                      </div>
                      <p className="question-text">{q.question}</p>
                      <div className="answers-grid">{q.answers?.map((a, ai) => (
                        <div key={a.id || ai} className={`answer-item ${a.correct ? 'correct' : ''}`}>
                          <span className="answer-letter">{['A','B','C','D'][ai]}</span>
                          <span>{a.content}</span>
                          {a.correct && <span className="answer-check">✓</span>}
                        </div>
                      ))}</div>
                    </div>
                  ))}</div>}
              </>
            )}
          </div>
        )}

        {/* ===== TAB PUBLISH ===== */}
        {tab === 'publish' && (
          <div className="tab-content animate-fade-in">
            <h2 className="publish-title">Kiểm tra trước khi xuất bản</h2>
            <div className="publish-checklist">{checks.map((c, i) => (
              <div key={i} className={`check-item ${c.ok ? 'check-ok' : 'check-missing'}`}>
                <span className="check-icon">{c.ok ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}</span>
                <span>{c.label}</span>
                <span className="check-status">{c.ok ? 'Hoàn thành' : 'Thiếu'}</span>
              </div>
            ))}</div>
            <div className="publish-summary">
              <h3>Tóm tắt bài học</h3>
              <div className="summary-grid">
                <div><strong>Tiêu đề:</strong> {lesson.title}</div>
                <div><strong>Markers:</strong> {markers.length} ({markers.filter(m => m.active !== false).length} active)</div>
                <div><strong>Steps:</strong> {steps.length}</div>
                <div><strong>Quiz:</strong> {quiz ? `${quiz.questions?.length || 0} câu` : 'Chưa có'}</div>
                <div><strong>Preview:</strong> {markers.some(m => m.previewModelCode) ? <CheckCircle2 size={14} color="var(--success)" /> : '—'}</div>
                <div><strong>Trạng thái:</strong> {lesson.status}</div>
              </div>
            </div>
            <div className="publish-actions">
              {lesson.status !== 'PUBLISH' ?
                <button className="btn btn-primary btn-lg" onClick={() => handlePublish('PUBLISH')}><Rocket size={16} /> Xuất bản bài học</button> :
                <button className="btn btn-danger btn-lg" onClick={() => handlePublish('DRAFT')}><FileText size={16} /> Chuyển về nháp</button>}
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      <Modal isOpen={showMarkerModal} onClose={() => { setShowMarkerModal(false); setEditingMarker(null); }} title={editingMarker ? 'Sửa Marker' : 'Thêm Marker'} size="md">
        <form onSubmit={saveMarker}>
          {/* Step 1: Select marker-model */}
          <div className="form-group">
            <label className="form-label">Chọn bộ Marker-Model từ hệ thống *</label>
            {selectedMarkerModel ? (
              <div className="selected-mm-card">
                <div className="selected-mm-info">
                  {selectedMarkerModel.imageUrl && <img src={selectedMarkerModel.imageUrl} alt="" className="selected-mm-img" />}
                  <div>
                    <strong>{selectedMarkerModel.markerCode}</strong>
                    {selectedMarkerModel.previewModelCode && <span className="selected-mm-code">Model: {selectedMarkerModel.previewModelCode}</span>}
                  </div>
                </div>
                {!editingMarker && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedMarkerModel(null); setMarkerForm(f => ({ ...f, markerCode:'', imageUrl:'', previewModelCode:'' })); }}>Đổi</button>}
              </div>
            ) : (
              <div className="mm-select-list">
                {availableMarkerModels.length === 0 ? <p className="text-muted">Chưa có bộ marker-model nào. Liên hệ Admin để thêm.</p> :
                  availableMarkerModels.map(mm => (
                    <div key={mm.id} className="mm-select-item" onClick={() => selectMarkerModelForForm(mm)}>
                      {mm.imageUrl && <img src={mm.imageUrl} alt="" className="mm-select-img" />}
                      <div className="mm-select-info">
                        <strong>{mm.markerCode}</strong>
                        {mm.previewModelCode && <span>Model: {mm.previewModelCode}</span>}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Step 2: Auto-populated info from selected model */}
          {(selectedMarkerModel || editingMarker) && (
            <div className="marker-info-card">
              <div className="marker-info-header">Thông tin Marker (tự động từ model đã chọn)</div>
              <div className="marker-info-grid">
                <div className="marker-info-item">
                  <span className="marker-info-label">Mã Marker</span>
                  <span className="marker-info-value">{markerForm.markerCode || '—'}</span>
                </div>
                <div className="marker-info-item">
                  <span className="marker-info-label">Model Code</span>
                  <span className="marker-info-value">{markerForm.previewModelCode || '—'}</span>
                </div>
              </div>
              {(selectedMarkerModel?.imageUrl || markerForm.imageUrl) && (
                <div className="marker-info-image">
                  <span className="marker-info-label">Ảnh Marker</span>
                  <img src={selectedMarkerModel?.imageUrl || fullUrl(markerForm.imageUrl)} alt="" />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Editable fields */}
          {(selectedMarkerModel || editingMarker) && (
            <div className="marker-editable-section">
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <button type="button" className={`marker-toggle ${markerForm.active ? 'marker-toggle-on' : ''}`} onClick={() => setMarkerForm({...markerForm, active: !markerForm.active})}>
                  <span className="marker-toggle-track">
                    <span className="marker-toggle-thumb"></span>
                  </span>
                  <span className="marker-toggle-text">{markerForm.active ? 'Active' : 'Inactive'}</span>
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Preview Audio (tuỳ chọn)</label>
                <div className="audio-upload-area">
                  {markerForm.previewAudioUrl && <audio controls src={markerForm.previewAudioUrl.startsWith('/') ? `http://localhost:8080${markerForm.previewAudioUrl}` : markerForm.previewAudioUrl} className="audio-player" />}
                  <label className={`btn btn-secondary btn-sm ${uploadingField && uploadingField !== 'marker-audio' ? 'btn-disabled' : ''}`}>
                    <span>{uploadingField === 'marker-audio' ? 'Đang upload...' : <><Music size={12} /> Upload audio</>}</span>
                    <input type="file" accept="audio/*" onChange={handleMarkerAudioUpload} hidden disabled={!!uploadingField} />
                  </label>
                  {uploadingField === 'marker-audio' && <UploadProgressBar progress={uploadProgress} label="Đang upload audio..." />}
                  <input className="form-input" placeholder="Hoặc nhập URL" value={markerForm.previewAudioUrl} onChange={e => setMarkerForm({...markerForm, previewAudioUrl: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => { setShowMarkerModal(false); setEditingMarker(null); }}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!selectedMarkerModel && !editingMarker}>{editingMarker ? 'Cập nhật' : 'Tạo Marker'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={showStepModal} onClose={() => setShowStepModal(false)} title={editingStep ? 'Sửa Block' : 'Thêm Block Nội dung'} size="xl">
        <div className="step-modal-layout">
          {/* Left: Form */}
          <form onSubmit={saveStep} className="step-modal-form">
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Loại nội dung</label>
                <div className="step-type-picker">
                  {STEP_TYPES.map(t => (
                    <button key={t.value} type="button" className={`step-type-btn ${stepForm.type === t.value ? 'active' : ''}`}
                      onClick={() => setStepForm({...stepForm, type: t.value, fileUrl:'', mediaUrls:[]})}>
                      <span className="step-type-icon">{<t.icon size={16} />}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div></div>
              <div className="form-group"><label className="form-label">Thứ tự</label>
                <input className="form-input" type="number" value={stepForm.orderIndex} onChange={e => setStepForm({...stepForm, orderIndex: parseInt(e.target.value)||0})} /></div>
            </div>

            {/* TEXT type */}
            {stepForm.type === 'TEXT' && (
              <div className="form-group"><label className="form-label">Nội dung văn bản</label>
                <RichTextEditor ref={activeEditorRef} value={annToHtml(stepForm.content)} onChange={val => setStepForm({...stepForm, content: htmlToAnn(val)})} minHeight={200} placeholder="Soạn nội dung bài học..." /></div>
            )}

            {/* VIDEO type */}
            {stepForm.type === 'VIDEO' && (
              <>
                <div className="form-group"><label className="form-label">Video (tối đa 5 phút)</label>
                  <div className="video-upload-area">
                    {stepForm.fileUrl && <video controls src={fullUrl(stepForm.fileUrl)} className="video-preview-player" />}
                    <label className={`btn btn-secondary btn-sm ${uploadingField && uploadingField !== 'step-video' ? 'btn-disabled' : ''}`}>
                      <span>{uploadingField === 'step-video' ? 'Đang upload...' : <><Upload size={12} /> Upload video</>}</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} hidden disabled={!!uploadingField} />
                    </label>
                    {uploadingField === 'step-video' && <UploadProgressBar progress={uploadProgress} label="Đang upload video..." />}
                  </div></div>
                <div className="form-group"><label className="form-label">Mô tả / Caption</label>
                  <RichTextEditor ref={activeEditorRef} value={annToHtml(stepForm.content)} onChange={val => setStepForm({...stepForm, content: htmlToAnn(val)})} minHeight={100} placeholder="Mô tả về video..." /></div>
              </>
            )}

            {/* IMAGE_GALLERY type */}
            {stepForm.type === 'IMAGE_GALLERY' && (
              <>
                <div className="form-group"><label className="form-label">Ảnh (tối đa 4 ảnh)</label>
                  <div className="gallery-upload-area">
                    <div className="gallery-grid">
                      {(stepForm.mediaUrls||[]).map((url, gi) => (
                        <div key={gi} className="gallery-item">
                          <img src={fullUrl(url)} alt="" className="gallery-item-img" />
                          <button type="button" className="gallery-remove" onClick={() => removeGalleryImage(gi)}>×</button>
                        </div>
                      ))}
                      {(stepForm.mediaUrls||[]).length < 4 && (
                        <label className={`gallery-add ${uploadingField && uploadingField !== 'step-gallery' ? 'btn-disabled' : ''}`}>
                          <span>{uploadingField === 'step-gallery' ? '...' : '＋'}</span>
                          <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} hidden disabled={!!uploadingField} />
                        </label>
                      )}
                    </div>
                    {uploadingField === 'step-gallery' && <UploadProgressBar progress={uploadProgress} label="Đang upload ảnh..." />}
                  </div></div>
                <div className="form-group"><label className="form-label">Mô tả</label>
                  <RichTextEditor ref={activeEditorRef} value={annToHtml(stepForm.content)} onChange={val => setStepForm({...stepForm, content: htmlToAnn(val)})} minHeight={100} placeholder="Mô tả về bộ ảnh..." /></div>
              </>
            )}

            <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowStepModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={!!uploadingField}>{editingStep ? 'Cập nhật' : 'Tạo Block'}</button></div>
          </form>

          {/* Right: Annotation sidebar */}
          {lessonAnnotations.length > 0 && (
            <div className="step-modal-annotations">
              <div className="step-modal-ann-header">
                <BookMarked size={14} />
                <span>Chú thích ({lessonAnnotations.length})</span>
              </div>
              <div className="step-modal-ann-list">
                {lessonAnnotations.map(ann => (
                  <button key={ann.id} type="button" className="step-modal-ann-item" onClick={() => insertAnnotationTag(ann)}
                    title={`Chèn [ann:${ann.id}] — ${ann.keyword}`}>
                    <span className="step-modal-ann-icon">
                      {ann.annotationType === 'IMAGE' ? <ImageIcon size={12} /> : <Box size={12} />}
                    </span>
                    <span className="step-modal-ann-keyword">{ann.keyword}</span>
                    <Copy size={10} className="step-modal-ann-copy" />
                  </button>
                ))}
              </div>
              <div className="step-modal-ann-hint">Click để chèn vào vị trí cursor</div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={showQModal} onClose={() => setShowQModal(false)} title="Thêm câu hỏi" size="md">
        <form onSubmit={addQuestion}>
          <div className="form-group"><label className="form-label">Câu hỏi *</label>
            <textarea className="form-input form-textarea" value={qForm.questionText} onChange={e => setQForm({...qForm, questionText: e.target.value})} autoFocus /></div>
          <div className="form-group"><label className="form-label">Đáp án (chọn đáp án đúng)</label>
            {qForm.answers.map((a, i) => (
              <div key={i} className="answer-input-row">
                <button type="button" className={`answer-radio ${a.correct ? 'selected' : ''}`} onClick={() => setCorrectAnswer(i)}>{a.correct ? <CircleDot size={14} /> : <Circle size={14} />}</button>
                <span className="answer-letter-input">{['A','B','C','D'][i]}</span>
                <input className="form-input" placeholder={`Đáp án ${['A','B','C','D'][i]}`} value={a.answerText}
                  onChange={e => { const ans = [...qForm.answers]; ans[i] = {...ans[i], answerText: e.target.value}; setQForm({...qForm, answers: ans}); }} />
              </div>
            ))}</div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowQModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm câu hỏi</button></div>
        </form>
      </Modal>

      {/* ===== ANNOTATION MODAL ===== */}
      <Modal isOpen={showAnnotationModal} onClose={() => { setShowAnnotationModal(false); setEditingAnnotation(null); }} title={editingAnnotation ? 'Sửa Chú thích' : 'Thêm Chú thích'} size="md">
        <form onSubmit={saveAnnotation}>
          <div className="form-group">
            <label className="form-label">Từ khóa chú thích (keyword) *</label>
            <input className="form-input" value={annotationForm.keyword} onChange={e => setAnnotationForm({...annotationForm, keyword: e.target.value})} placeholder="VD: Ngô Quyền, cọc gỗ..." autoFocus />
          </div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Tiêu đề</label>
              <input className="form-input" value={annotationForm.title} onChange={e => setAnnotationForm({...annotationForm, title: e.target.value})} placeholder="Tiêu đề hiển thị" />
            </div>
            <div className="form-group"><label className="form-label">Thứ tự</label>
              <input className="form-input" type="number" value={annotationForm.orderIndex} onChange={e => setAnnotationForm({...annotationForm, orderIndex: parseInt(e.target.value)||0})} />
            </div>
          </div>
          <div className="form-group"><label className="form-label">Loại chú thích *</label>
            <div className="annotation-type-picker">
              {ANNOTATION_TYPES.map(t => (
                <button key={t.value} type="button" className={`step-type-btn ${annotationForm.annotationType === t.value ? 'active' : ''}`}
                  onClick={() => setAnnotationForm({...annotationForm, annotationType: t.value, mediaUrl: '', modelCode: ''})}>
                  <span className="step-type-icon"><t.icon size={16} /></span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* IMAGE type */}
          {annotationForm.annotationType === 'IMAGE' && (
            <div className="form-group"><label className="form-label">Ảnh minh họa *</label>
              <div className="annotation-media-area">
                {annotationForm.mediaUrl && <img src={annotationForm.mediaUrl} alt="" className="annotation-media-preview" />}
                <label className={`btn btn-secondary btn-sm ${uploadingField && uploadingField !== 'annotation-image' ? 'btn-disabled' : ''}`}>
                  <span>{uploadingField === 'annotation-image' ? 'Đang upload...' : <><Upload size={12} /> Upload ảnh</>}</span>
                  <input type="file" accept="image/*" onChange={handleAnnotationImageUpload} hidden disabled={!!uploadingField} />
                </label>
                {uploadingField === 'annotation-image' && <UploadProgressBar progress={uploadProgress} label="Đang upload ảnh..." />}
                <input className="form-input" placeholder="Hoặc nhập URL ảnh" value={annotationForm.mediaUrl} onChange={e => setAnnotationForm({...annotationForm, mediaUrl: e.target.value})} />
              </div>
            </div>
          )}

          {/* MODEL type — dropdown picker from marker models */}
          {annotationForm.annotationType === 'MODEL' && (
            <div className="form-group"><label className="form-label">Chọn Model 3D *</label>
              {annotationForm.modelCode ? (
                <div className="selected-mm-card">
                  <div className="selected-mm-info">
                    <Box size={20} />
                    <div>
                      <strong>{annotationForm.modelCode}</strong>
                      <span className="selected-mm-code">Model 3D</span>
                    </div>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAnnotationForm(f => ({...f, modelCode: ''})); setShowAnnotationModelPicker(true); }}>Đổi</button>
                </div>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAnnotationModelPicker(!showAnnotationModelPicker)} style={{marginBottom: 8}}>
                    <ChevronDown size={14} /> Chọn từ danh sách Marker-Model
                  </button>
                  {showAnnotationModelPicker && (
                    <div className="mm-select-list">
                      {availableMarkerModels.length === 0 ? <p className="text-muted">Chưa có bộ marker-model nào.</p> :
                        availableMarkerModels.filter(mm => mm.previewModelCode).map(mm => (
                          <div key={mm.id} className="mm-select-item" onClick={() => selectAnnotationModel(mm)}>
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

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowAnnotationModal(false); setEditingAnnotation(null); }}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!!uploadingField}>{editingAnnotation ? 'Cập nhật' : 'Tạo Chú thích'}</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
