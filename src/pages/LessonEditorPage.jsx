import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessonApi, markerApi, assetApi, quizApi, uploadApi, markerModelApi } from '../api/api';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import './LessonEditorPage.css';

const TABS = [
  { key: 'general', label: '📋 Nội dung bài học' },
  { key: 'markers', label: '📍 Markers' },
  { key: 'steps', label: '📝 Nội dung' },
  { key: 'quiz', label: '❓ Quiz' },
  { key: 'publish', label: '🚀 Publish' },
];

const STEP_TYPES = [
  { value: 'TEXT', label: '📝 Văn bản', icon: '📝' },
  { value: 'VIDEO', label: '🎬 Video', icon: '🎬' },
  { value: 'IMAGE_GALLERY', label: '🖼️ Bộ ảnh', icon: '🖼️' },
];

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
  const [uploading, setUploading] = useState(false);

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

      const [mkRes, stRes, mmRes] = await Promise.all([
        markerApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
        assetApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
        markerModelApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setMarkers(mkRes.data.data || []);
      setSteps(stRes.data.data || []);
      setAvailableMarkerModels(mmRes.data.data || []);

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
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.data.data;
      setForm(f => ({ ...f, thumbnailUrl: url }));
      showToast('Upload thumbnail thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
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
    try {
      const res = await uploadApi.uploadImage(file);
      setMarkerForm(f => ({ ...f, imageUrl: res.data.data }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
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
    setUploading(true);
    try {
      const res = await uploadApi.uploadVideo(file);
      setStepForm(f => ({ ...f, fileUrl: res.data.data }));
      showToast('Upload video thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploading(false); }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 4 - (stepForm.mediaUrls?.length || 0);
    if (files.length > remaining) { showToast(`Chỉ được thêm tối đa ${remaining} ảnh nữa`, 'warning'); return; }
    setUploading(true);
    try {
      const res = await uploadApi.uploadMultiImages(files);
      setStepForm(f => ({ ...f, mediaUrls: [...(f.mediaUrls||[]), ...res.data.data] }));
      showToast('Upload ảnh thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
    finally { setUploading(false); }
  };

  const removeGalleryImage = (idx) => {
    setStepForm(f => ({ ...f, mediaUrls: f.mediaUrls.filter((_, i) => i !== idx) }));
  };

  const fullUrl = (url) => url?.startsWith('/') ? `http://localhost:8080${url}` : url;

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
    try {
      const res = await uploadApi.uploadAudio(file);
      setMarkerForm(f => ({ ...f, previewAudioUrl: res.data.data }));
      showToast('Upload audio thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
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
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/lessons')}>← Quay lại</button>
        <h1 className="editor-title">{lesson.title}</h1>
        <span className={`badge badge-${lesson.status?.toLowerCase()}`}>
          {lesson.status === 'PUBLISH' ? 'Đã xuất bản' : 'Bản nháp'}
        </span>
      </div>

      <div className="editor-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`editor-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
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
              <div className="form-group"><label className="form-label">Thumbnail</label>
                <div className="thumb-upload-area">
                  {form.thumbnailUrl && <img src={form.thumbnailUrl.startsWith('/') ? `http://localhost:8080${form.thumbnailUrl}` : form.thumbnailUrl} alt="" className="thumb-preview" />}
                  <label className="btn btn-secondary btn-sm"><span>📷 Upload ảnh</span><input type="file" accept="image/*" onChange={handleThumbUpload} hidden /></label>
                  <input className="form-input" placeholder="Hoặc nhập URL" value={form.thumbnailUrl} onChange={e => setForm({...form, thumbnailUrl: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Mô tả</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Nội dung tổng quan</label>
              <textarea className="form-input form-textarea" style={{minHeight:180}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
            <div className="tab-actions"><button className="btn btn-primary" onClick={saveGeneral} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu thông tin'}</button></div>
          </div>
        )}

        {/* ===== TAB MARKERS ===== */}
        {tab === 'markers' && (
          <div className="tab-content animate-fade-in">
            <div className="tab-header"><h2>Markers ({markers.length})</h2>
              <button className="btn btn-primary btn-sm" onClick={openAddMarker}>＋ Thêm marker</button>
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
                      <span>🎮 Model: <strong>{m.previewModelCode || '—'}</strong></span>
                      <span>🎵 Audio: {m.previewAudioUrl ? <audio controls src={m.previewAudioUrl.startsWith('/') ? `http://localhost:8080${m.previewAudioUrl}` : m.previewAudioUrl} className="marker-audio" /> : <em>Chưa có</em>}</span>
                    </div>
                    <span className="marker-date">Tạo: {m.createdAt?.substring(0,10)}</span>
                  </div>
                  <div className="marker-detail-actions">
                    <button className="btn-icon" onClick={() => toggleMarkerActive(m.id)} title={m.active !== false ? 'Tắt' : 'Bật'}>{m.active !== false ? '🔴' : '🟢'}</button>
                    <button className="btn-icon" onClick={() => openEditMarker(m)} title="Sửa">✏️</button>
                    <button className="btn-icon" onClick={() => deleteMarker(m.id)} title="Xóa">🗑️</button>
                  </div>
                </div>
              ))}</div>}
          </div>
        )}

        {/* ===== TAB STEPS ===== */}
        {tab === 'steps' && (
          <div className="tab-content animate-fade-in">
            <div className="tab-header"><h2>Nội dung bài học ({steps.length} blocks)</h2>
              <button className="btn btn-primary btn-sm" onClick={openAddStep}>＋ Thêm block</button></div>
            {steps.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có nội dung. Thêm block đầu tiên!</p></div> :
              <div className="steps-list">{steps.map((s, i) => (
                <div key={s.id} className="step-card" style={{animationDelay:`${i*0.05}s`}}>
                  <div className="step-order">{(s.orderIndex ?? i) + 1}</div>
                  <div className="step-body">
                    <div className="step-type"><span className={`badge badge-${s.type?.toLowerCase()}`}>{STEP_TYPES.find(t=>t.value===s.type)?.label || s.type}</span></div>
                    {s.type === 'TEXT' && <div className="step-text-preview" dangerouslySetInnerHTML={{__html: s.content ? s.content.substring(0, 200) : '<em>Trống</em>'}} />}
                    {s.type === 'VIDEO' && (
                      <div className="step-video-preview">
                        {s.fileUrl && <video src={fullUrl(s.fileUrl)} className="step-video-thumb" preload="metadata" />}
                        {s.content && <p className="step-caption">{s.content.substring(0, 100)}</p>}
                      </div>
                    )}
                    {s.type === 'IMAGE_GALLERY' && (
                      <div className="step-gallery-preview">
                        <div className="step-gallery-thumbs">
                          {(s.mediaUrls||[]).slice(0,4).map((url, gi) => <img key={gi} src={fullUrl(url)} alt="" className="step-gallery-thumb" />)}
                        </div>
                        {s.content && <p className="step-caption">{s.content.substring(0, 100)}</p>}
                      </div>
                    )}
                  </div>
                  <div className="step-actions">
                    <button className="btn-icon" onClick={() => openEditStep(s)} title="Sửa">✏️</button>
                    <button className="btn-icon" onClick={() => deleteStep(s.id)} title="Xóa">🗑️</button>
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
                <div className="tab-header"><h2>📝 {quiz.title} ({quiz.questions?.length || 0} câu hỏi)</h2>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowQModal(true)}>＋ Thêm câu hỏi</button></div>
                {quiz.questions?.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có câu hỏi</p></div> :
                  <div className="questions-list">{quiz.questions.map((q, qi) => (
                    <div key={q.id} className="question-card">
                      <div className="question-header">
                        <span className="question-num">Câu {qi+1}</span>
                        <button className="btn-icon" onClick={() => deleteQuestion(q.id)} title="Xóa">🗑️</button>
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
                <span className="check-icon">{c.ok ? '✅' : '⚠️'}</span>
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
                <div><strong>Preview:</strong> {markers.some(m => m.previewModelCode) ? '✅' : '—'}</div>
                <div><strong>Trạng thái:</strong> {lesson.status}</div>
              </div>
            </div>
            <div className="publish-actions">
              {lesson.status !== 'PUBLISH' ?
                <button className="btn btn-primary btn-lg" onClick={() => handlePublish('PUBLISH')}>🚀 Xuất bản bài học</button> :
                <button className="btn btn-danger btn-lg" onClick={() => handlePublish('DRAFT')}>📝 Chuyển về nháp</button>}
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      <Modal isOpen={showMarkerModal} onClose={() => { setShowMarkerModal(false); setEditingMarker(null); }} title={editingMarker ? 'Sửa Marker' : 'Thêm Marker'} size="md">
        <form onSubmit={saveMarker}>
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
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Mã Marker</label>
              <input className="form-input" value={markerForm.markerCode} disabled /></div>
            <div className="form-group"><label className="form-label">Trạng thái</label>
              <label className="toggle-label"><input type="checkbox" checked={markerForm.active} onChange={e => setMarkerForm({...markerForm, active: e.target.checked})} /> <span>{markerForm.active ? '🟢 Active' : '🔴 Inactive'}</span></label></div>
          </div>
          <div className="form-group"><label className="form-label">Ảnh Marker</label>
            {markerForm.imageUrl && <img src={markerForm.imageUrl.startsWith('/') ? `http://localhost:8080${markerForm.imageUrl}` : markerForm.imageUrl} alt="" className="thumb-preview" style={{marginBottom:8}} />}
            <input className="form-input" value={markerForm.imageUrl} disabled /></div>
          <div className="form-group"><label className="form-label">Preview Model Code</label>
            <input className="form-input" value={markerForm.previewModelCode} disabled /></div>
          <div className="form-group"><label className="form-label">Preview Audio (optional)</label>
            <div className="audio-upload-area">
              {markerForm.previewAudioUrl && <audio controls src={markerForm.previewAudioUrl.startsWith('/') ? `http://localhost:8080${markerForm.previewAudioUrl}` : markerForm.previewAudioUrl} className="audio-player" />}
              <label className="btn btn-secondary btn-sm"><span>🎵 Upload audio</span><input type="file" accept="audio/*" onChange={handleMarkerAudioUpload} hidden /></label>
              <input className="form-input" placeholder="Hoặc nhập URL" value={markerForm.previewAudioUrl} onChange={e => setMarkerForm({...markerForm, previewAudioUrl: e.target.value})} />
            </div></div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => { setShowMarkerModal(false); setEditingMarker(null); }}>Hủy</button>
            <button type="submit" className="btn btn-primary">{editingMarker ? 'Cập nhật' : 'Tạo Marker'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={showStepModal} onClose={() => setShowStepModal(false)} title={editingStep ? 'Sửa Block' : 'Thêm Block Nội dung'} size="lg">
        <form onSubmit={saveStep}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Loại nội dung</label>
              <div className="step-type-picker">
                {STEP_TYPES.map(t => (
                  <button key={t.value} type="button" className={`step-type-btn ${stepForm.type === t.value ? 'active' : ''}`}
                    onClick={() => setStepForm({...stepForm, type: t.value, fileUrl:'', mediaUrls:[]})}>
                    <span className="step-type-icon">{t.icon}</span>
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
              <RichTextEditor value={stepForm.content} onChange={val => setStepForm({...stepForm, content: val})} minHeight={200} placeholder="Soạn nội dung bài học..." /></div>
          )}

          {/* VIDEO type */}
          {stepForm.type === 'VIDEO' && (
            <>
              <div className="form-group"><label className="form-label">Video (tối đa 5 phút)</label>
                <div className="video-upload-area">
                  {stepForm.fileUrl && <video controls src={fullUrl(stepForm.fileUrl)} className="video-preview-player" />}
                  <label className={`btn btn-secondary btn-sm ${uploading ? 'btn-disabled' : ''}`}>
                    <span>{uploading ? 'Đang upload...' : '🎬 Upload video'}</span>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} hidden disabled={uploading} />
                  </label>
                </div></div>
              <div className="form-group"><label className="form-label">Mô tả / Caption</label>
                <RichTextEditor value={stepForm.content} onChange={val => setStepForm({...stepForm, content: val})} minHeight={100} placeholder="Mô tả về video..." /></div>
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
                      <label className={`gallery-add ${uploading ? 'btn-disabled' : ''}`}>
                        <span>{uploading ? '...' : '＋'}</span>
                        <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} hidden disabled={uploading} />
                      </label>
                    )}
                  </div>
                </div></div>
              <div className="form-group"><label className="form-label">Mô tả</label>
                <RichTextEditor value={stepForm.content} onChange={val => setStepForm({...stepForm, content: val})} minHeight={100} placeholder="Mô tả về bộ ảnh..." /></div>
            </>
          )}

          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowStepModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>{editingStep ? 'Cập nhật' : 'Tạo Block'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={showQModal} onClose={() => setShowQModal(false)} title="Thêm câu hỏi" size="md">
        <form onSubmit={addQuestion}>
          <div className="form-group"><label className="form-label">Câu hỏi *</label>
            <textarea className="form-input form-textarea" value={qForm.questionText} onChange={e => setQForm({...qForm, questionText: e.target.value})} autoFocus /></div>
          <div className="form-group"><label className="form-label">Đáp án (chọn đáp án đúng)</label>
            {qForm.answers.map((a, i) => (
              <div key={i} className="answer-input-row">
                <button type="button" className={`answer-radio ${a.correct ? 'selected' : ''}`} onClick={() => setCorrectAnswer(i)}>{a.correct ? '●' : '○'}</button>
                <span className="answer-letter-input">{['A','B','C','D'][i]}</span>
                <input className="form-input" placeholder={`Đáp án ${['A','B','C','D'][i]}`} value={a.answerText}
                  onChange={e => { const ans = [...qForm.answers]; ans[i] = {...ans[i], answerText: e.target.value}; setQForm({...qForm, answers: ans}); }} />
              </div>
            ))}</div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowQModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm câu hỏi</button></div>
        </form>
      </Modal>

    </div>
  );
}
