import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessonApi, markerApi, uploadApi, quizApi, gameApi } from '../api/api';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';
import './LessonDetailPage.css';

export default function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [game, setGame] = useState(null);

  // Marker modal
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerForm, setMarkerForm] = useState({ markerCode: '', imageUrl: '' });
  const [creatingMarker, setCreatingMarker] = useState(false);

  // Audio upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLesson();
  }, [id]);

  const fetchLesson = async () => {
    setLoading(true);
    try {
      // Get all lessons and find by ID
      const res = await lessonApi.getAll();
      const allLessons = res.data.data || [];
      const found = allLessons.find(l => l.id === parseInt(id));
      if (found) {
        setLesson(found);
        // Try to load quiz and game
        try {
          const quizRes = await quizApi.getByLesson(found.id);
          setQuiz(quizRes.data.data);
        } catch { /* no quiz */ }
        try {
          const gameRes = await gameApi.getByLesson(found.id);
          setGame(gameRes.data.data);
        } catch { /* no game */ }
      }
    } catch {
      showToast('Không thể tải thông tin bài học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarker = async (e) => {
    e.preventDefault();
    if (!markerForm.markerCode.trim() || !markerForm.imageUrl.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin marker', 'warning');
      return;
    }
    setCreatingMarker(true);
    try {
      await markerApi.create({
        lessonId: parseInt(id),
        markerCode: markerForm.markerCode,
        imageUrl: markerForm.imageUrl,
      });
      showToast('Tạo marker thành công!', 'success');
      setShowMarkerModal(false);
      setMarkerForm({ markerCode: '', imageUrl: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Tạo marker thất bại', 'error');
    } finally {
      setCreatingMarker(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadAudio(file);
      showToast(`Upload thành công: ${res.data.data}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload thất bại', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <p className="empty-state-text">Không tìm thấy bài học</p>
        <button className="btn btn-secondary" onClick={() => navigate('/lessons')}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="lesson-detail-page">
      <div className="detail-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/lessons')}>
          ← Quay lại
        </button>
      </div>

      {/* Lesson Info */}
      <div className="detail-hero">
        {lesson.thumbnailUrl && (
          <img src={lesson.thumbnailUrl} alt={lesson.title} className="detail-thumbnail" />
        )}
        <div className="detail-info">
          <h1 className="detail-title">{lesson.title}</h1>
          <p className="detail-description">{lesson.description || 'Chưa có mô tả'}</p>
          <div className="detail-meta">
            <span className={`badge badge-${lesson.status?.toLowerCase()}`}>
              {lesson.status === 'PUBLISH' ? 'Đã xuất bản' : 'Bản nháp'}
            </span>
            <span className="detail-id">ID: {lesson.id}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {lesson.content && (
        <div className="card detail-section">
          <div className="card-header">
            <h2 className="card-title">📄 Nội dung</h2>
          </div>
          <div className="card-body">
            <div className="detail-content">{lesson.content}</div>
          </div>
        </div>
      )}

      {/* Actions grid */}
      <div className="detail-actions-grid">
        {/* Create Marker */}
        <div className="action-card" onClick={() => setShowMarkerModal(true)}>
          <div className="action-icon">📍</div>
          <div className="action-title">Tạo Marker</div>
          <p className="action-desc">Gán marker AR cho bài học này</p>
        </div>

        {/* Upload Audio */}
        <label className="action-card" htmlFor="audio-upload">
          <div className="action-icon">{uploading ? '⏳' : '🎵'}</div>
          <div className="action-title">{uploading ? 'Đang upload...' : 'Upload Audio'}</div>
          <p className="action-desc">Tải lên file audio cho bài học</p>
          <input
            type="file"
            id="audio-upload"
            accept="audio/*"
            onChange={handleAudioUpload}
            disabled={uploading}
            hidden
          />
        </label>

        {/* Quiz Info */}
        <div className="action-card action-card-info">
          <div className="action-icon">{quiz ? '✅' : '❓'}</div>
          <div className="action-title">Quiz</div>
          <p className="action-desc">
            {quiz ? `${quiz.title || 'Quiz'} — ${quiz.questions?.length || 0} câu hỏi` : 'Chưa có quiz'}
          </p>
        </div>

        {/* Gamification Info */}
        <div className="action-card action-card-info">
          <div className="action-icon">{game ? '🎮' : '🎲'}</div>
          <div className="action-title">Gamification</div>
          <p className="action-desc">
            {game ? `${game.title || 'Game'} — ${game.templateType}` : 'Chưa có game'}
          </p>
        </div>
      </div>

      {/* Marker Modal */}
      <Modal
        isOpen={showMarkerModal}
        onClose={() => setShowMarkerModal(false)}
        title="Tạo Marker AR"
        size="sm"
      >
        <form onSubmit={handleCreateMarker} id="create-marker-form">
          <div className="form-group">
            <label className="form-label" htmlFor="marker-code">Mã Marker *</label>
            <input
              id="marker-code"
              className="form-input"
              placeholder="VD: DBP_1954"
              value={markerForm.markerCode}
              onChange={(e) => setMarkerForm({ ...markerForm, markerCode: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="marker-image">URL Ảnh Marker *</label>
            <input
              id="marker-image"
              className="form-input"
              placeholder="https://example.com/marker.png"
              value={markerForm.imageUrl}
              onChange={(e) => setMarkerForm({ ...markerForm, imageUrl: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowMarkerModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={creatingMarker}>
              {creatingMarker ? 'Đang tạo...' : 'Tạo Marker'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
