import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, lessonApi } from '../api/api';
import { showToast } from '../components/Toast';
import { BarChart3, BookOpen, CheckCircle2, FileEdit, MapPin, HelpCircle, Gamepad2, Plus } from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentLessons, setRecentLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, lessonsRes] = await Promise.all([
        dashboardApi.getStats(),
        lessonApi.getAll(),
      ]);
      setStats(statsRes.data.data);
      const all = lessonsRes.data.data || [];
      setRecentLessons(all.slice(0, 5));
    } catch {
      showToast('Không thể tải dữ liệu dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;
  }

  const statCards = [
    { icon: <BookOpen size={20} />, value: stats?.totalLessons || 0, label: 'Tổng bài học', color: 'var(--accent-primary)' },
    { icon: <CheckCircle2 size={20} />, value: stats?.publishedLessons || 0, label: 'Đã xuất bản', color: 'var(--success)' },
    { icon: <FileEdit size={20} />, value: stats?.draftLessons || 0, label: 'Bản nháp', color: 'var(--text-tertiary)' },
    { icon: <MapPin size={20} />, value: stats?.totalMarkers || 0, label: 'Markers', color: '#8B5CF6' },
    { icon: <HelpCircle size={20} />, value: stats?.totalQuizzes || 0, label: 'Quizzes', color: 'var(--info)' },
  ];

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><BarChart3 size={24} style={{display:'inline', verticalAlign:'middle', marginRight:8}} /> Dashboard</h1>
          <p className="page-subtitle">Tổng quan nội dung học liệu AR lịch sử.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/lessons')}>
          <Plus size={16} /> Tạo bài học mới
        </button>
      </div>

      <div className="dash-stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className="dash-stat-card" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="dash-stat-icon" style={{ color: s.color }}>{s.icon}</div>
            <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Bài học gần đây</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/lessons')}>Xem tất cả →</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentLessons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={40} /></div>
              <p className="empty-state-text">Chưa có bài học nào</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Trạng thái</th>
                  <th>Marker</th>
                  <th>Quiz</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recentLessons.map((l) => (
                  <tr key={l.id}>
                    <td>{l.title}</td>
                    <td>
                      <span className={`badge badge-${l.status?.toLowerCase()}`}>
                        {l.status === 'PUBLISH' ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </td>
                    <td>{l.markerCode || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td>{l.hasQuiz ? <CheckCircle2 size={16} color="var(--success)" /> : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/lessons/${l.id}/edit`)}>
                        Chỉnh sửa →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
