import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessonApi, markerApi, assetApi, quizApi, uploadApi } from '../api/api';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import './LessonEditorPage.css';

const TABS = [
  { key: 'general', label: '📋 Thông tin chung' },
  { key: 'marker', label: '📍 Marker' },
  { key: 'preview', label: '👁️ Preview AR' },
  { key: 'steps', label: '📝 Nội dung' },
  { key: 'quiz', label: '❓ Quiz' },
  { key: 'publish', label: '🚀 Publish' },
];

const ASSET_TYPES = ['TEXT', 'IMAGE', 'AUDIO', 'MODEL_3D', 'ANIMATION'];

export default function LessonEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('general');
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General
  const [form, setForm] = useState({ title:'', description:'', content:'', thumbnailUrl:'' });

  // Preview AR
  const [previewForm, setPreviewForm] = useState({ previewModelCode:'', previewAudioUrl:'' });

  // Marker
  const [markers, setMarkers] = useState([]);
  const [markerForm, setMarkerForm] = useState({ markerCode:'', imageUrl:'' });
  const [showMarkerModal, setShowMarkerModal] = useState(false);

  // Steps
  const [steps, setSteps] = useState([]);
  const [stepForm, setStepForm] = useState({ type:'TEXT', content:'', fileUrl:'', orderIndex:0 });
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);

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
      setPreviewForm({ previewModelCode: d.previewModelCode||'', previewAudioUrl: d.previewAudioUrl||'' });

      const [mkRes, stRes] = await Promise.all([
        markerApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
        assetApi.getByLesson(id).catch(() => ({ data: { data: [] } })),
      ]);
      setMarkers(mkRes.data.data || []);
      setSteps(stRes.data.data || []);

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

  // ===== Preview Tab =====
  const savePreview = async () => {
    setSaving(true);
    try {
      await lessonApi.update(id, previewForm);
      showToast('Đã lưu preview AR', 'success');
      fetchAll();
    } catch { showToast('Lưu thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handlePreviewAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadApi.uploadAudio(file);
      setPreviewForm(f => ({ ...f, previewAudioUrl: res.data.data }));
      showToast('Upload audio thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
  };

  // ===== Marker Tab =====
  const createMarker = async (e) => {
    e.preventDefault();
    if (!markerForm.markerCode.trim()) { showToast('Nhập mã marker', 'warning'); return; }
    try {
      await markerApi.create({ lessonId: parseInt(id), ...markerForm });
      showToast('Tạo marker thành công', 'success');
      setShowMarkerModal(false);
      setMarkerForm({ markerCode:'', imageUrl:'' });
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Thất bại', 'error'); }
  };

  const handleMarkerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadApi.uploadImage(file);
      setMarkerForm(f => ({ ...f, imageUrl: res.data.data }));
      showToast('Upload ảnh marker thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
  };

  // ===== Steps Tab =====
  const openAddStep = () => {
    setEditingStep(null);
    setStepForm({ type:'TEXT', content:'', fileUrl:'', orderIndex: steps.length });
    setShowStepModal(true);
  };

  const openEditStep = (step) => {
    setEditingStep(step);
    setStepForm({ type: step.type||'TEXT', content: step.content||'', fileUrl: step.fileUrl||'', orderIndex: step.orderIndex||0 });
    setShowStepModal(true);
  };

  const saveStep = async (e) => {
    e.preventDefault();
    try {
      if (editingStep) {
        await assetApi.update(editingStep.id, stepForm);
        showToast('Cập nhật step thành công', 'success');
      } else {
        await assetApi.create({ lessonId: parseInt(id), ...stepForm });
        showToast('Tạo step thành công', 'success');
      }
      setShowStepModal(false);
      fetchAll();
    } catch { showToast('Thất bại', 'error'); }
  };

  const deleteStep = async (stepId) => {
    if (!confirm('Xóa step này?')) return;
    try {
      await assetApi.delete(stepId);
      showToast('Đã xóa step', 'success');
      fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const handleStepFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const isAudio = file.type.startsWith('audio');
      const res = isAudio ? await uploadApi.uploadAudio(file) : await uploadApi.uploadImage(file);
      setStepForm(f => ({ ...f, fileUrl: res.data.data }));
      showToast('Upload thành công', 'success');
    } catch { showToast('Upload thất bại', 'error'); }
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

  const checks = [
    { label: 'Thông tin chung', ok: !!lesson.title },
    { label: 'Marker', ok: markers.length > 0 },
    { label: 'Preview Audio', ok: !!lesson.previewAudioUrl },
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

        {/* ===== TAB MARKER ===== */}
        {tab === 'marker' && (
          <div className="tab-content animate-fade-in">
            <div className="tab-header"><h2>Markers ({markers.length})</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowMarkerModal(true)}>＋ Thêm marker</button></div>
            {markers.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có marker. Tạo marker đầu tiên!</p></div> :
              <div className="marker-grid">{markers.map(m => (
                <div key={m.id} className="marker-card">
                  {m.imageUrl && <img src={m.imageUrl.startsWith('/') ? `http://localhost:8080${m.imageUrl}` : m.imageUrl} alt="" className="marker-img" />}
                  <div className="marker-info"><strong>{m.markerCode}</strong><span className="marker-date">{m.createdAt?.substring(0,10)}</span></div>
                </div>
              ))}</div>}
          </div>
        )}

        {/* ===== TAB PREVIEW ===== */}
        {tab === 'preview' && (
          <div className="tab-content animate-fade-in">
            <div className="form-group"><label className="form-label">Preview Model Code</label>
              <input className="form-input" placeholder="VD: dien_bien_phu_3d" value={previewForm.previewModelCode} onChange={e => setPreviewForm({...previewForm, previewModelCode: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Preview Audio</label>
              <div className="audio-upload-area">
                {previewForm.previewAudioUrl && <audio controls src={previewForm.previewAudioUrl.startsWith('/') ? `http://localhost:8080${previewForm.previewAudioUrl}` : previewForm.previewAudioUrl} className="audio-player" />}
                <label className="btn btn-secondary btn-sm"><span>🎵 Upload audio</span><input type="file" accept="audio/*" onChange={handlePreviewAudioUpload} hidden /></label>
                <input className="form-input" placeholder="Hoặc nhập URL" value={previewForm.previewAudioUrl} onChange={e => setPreviewForm({...previewForm, previewAudioUrl: e.target.value})} />
              </div>
            </div>
            <div className="tab-actions"><button className="btn btn-primary" onClick={savePreview} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu Preview'}</button></div>
          </div>
        )}

        {/* ===== TAB STEPS ===== */}
        {tab === 'steps' && (
          <div className="tab-content animate-fade-in">
            <div className="tab-header"><h2>Nội dung bài học ({steps.length} steps)</h2>
              <button className="btn btn-primary btn-sm" onClick={openAddStep}>＋ Thêm step</button></div>
            {steps.length === 0 ? <div className="empty-state"><p className="empty-state-text">Chưa có step nào</p></div> :
              <div className="steps-list">{steps.map((s, i) => (
                <div key={s.id} className="step-card" style={{animationDelay:`${i*0.05}s`}}>
                  <div className="step-order">{(s.orderIndex ?? i) + 1}</div>
                  <div className="step-body">
                    <div className="step-type"><span className={`badge badge-${s.type?.toLowerCase()}`}>{s.type}</span></div>
                    <p className="step-content-preview">{s.content ? s.content.substring(0, 120) + (s.content.length > 120 ? '...' : '') : '(Không có nội dung text)'}</p>
                    {s.fileUrl && <span className="step-file">📎 {s.fileUrl}</span>}
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
                <div><strong>Markers:</strong> {markers.length}</div>
                <div><strong>Steps:</strong> {steps.length}</div>
                <div><strong>Quiz:</strong> {quiz ? `${quiz.questions?.length || 0} câu` : 'Chưa có'}</div>
                <div><strong>Preview Audio:</strong> {lesson.previewAudioUrl ? '✅' : '—'}</div>
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
      <Modal isOpen={showMarkerModal} onClose={() => setShowMarkerModal(false)} title="Thêm Marker" size="sm">
        <form onSubmit={createMarker}>
          <div className="form-group"><label className="form-label">Mã Marker *</label>
            <input className="form-input" value={markerForm.markerCode} onChange={e => setMarkerForm({...markerForm, markerCode: e.target.value})} autoFocus /></div>
          <div className="form-group"><label className="form-label">Ảnh Marker</label>
            <label className="btn btn-secondary btn-sm" style={{marginBottom:8}}><span>📷 Upload ảnh</span><input type="file" accept="image/*" onChange={handleMarkerImageUpload} hidden /></label>
            <input className="form-input" placeholder="Hoặc nhập URL" value={markerForm.imageUrl} onChange={e => setMarkerForm({...markerForm, imageUrl: e.target.value})} /></div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowMarkerModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Tạo Marker</button></div>
        </form>
      </Modal>

      <Modal isOpen={showStepModal} onClose={() => setShowStepModal(false)} title={editingStep ? 'Sửa Step' : 'Thêm Step'} size="md">
        <form onSubmit={saveStep}>
          <div className="form-group"><label className="form-label">Loại Asset</label>
            <select className="form-input" value={stepForm.type} onChange={e => setStepForm({...stepForm, type: e.target.value})}>
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Nội dung text</label>
            <textarea className="form-input form-textarea" value={stepForm.content} onChange={e => setStepForm({...stepForm, content: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">File đính kèm</label>
            <label className="btn btn-secondary btn-sm" style={{marginBottom:8}}><span>📎 Upload file</span><input type="file" onChange={handleStepFileUpload} hidden /></label>
            <input className="form-input" placeholder="URL file" value={stepForm.fileUrl} onChange={e => setStepForm({...stepForm, fileUrl: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Thứ tự</label>
            <input className="form-input" type="number" value={stepForm.orderIndex} onChange={e => setStepForm({...stepForm, orderIndex: parseInt(e.target.value)||0})} /></div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowStepModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">{editingStep ? 'Cập nhật' : 'Tạo Step'}</button></div>
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
