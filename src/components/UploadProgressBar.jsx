import './UploadProgressBar.css';

/**
 * Upload progress bar component.
 * @param {number} progress - 0 to 100
 * @param {string} [label] - Optional label text (default: "Đang upload...")
 */
export default function UploadProgressBar({ progress = 0, label = 'Đang upload...' }) {
  if (progress <= 0) return null;

  return (
    <div className="upload-progress-container">
      <div className="upload-progress-label">
        <span>⬆ {label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="upload-progress-bar-outer">
        <div
          className="upload-progress-bar-inner"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
