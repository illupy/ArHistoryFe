import { useState, useRef, useCallback, useEffect } from 'react';
import './RichTextEditor.css';

const TOOLBAR_ACTIONS = [
  { cmd: 'bold', icon: '𝐁', title: 'Đậm' },
  { cmd: 'italic', icon: '𝐼', title: 'Nghiêng' },
  { cmd: 'underline', icon: 'U̲', title: 'Gạch chân' },
  { cmd: 'insertOrderedList', icon: '1.', title: 'Danh sách số' },
  { cmd: 'insertUnorderedList', icon: '•', title: 'Danh sách' },
  { cmd: 'formatBlock_H3', icon: 'H', title: 'Tiêu đề' },
];

export default function RichTextEditor({ value, onChange, placeholder = 'Nhập nội dung...', minHeight = 150 }) {
  const editorRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const isInternalChange = useRef(false);

  // Only set innerHTML when value changes externally (not from user typing)
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const execCmd = useCallback((action) => {
    if (action.startsWith('formatBlock_')) {
      const tag = action.replace('formatBlock_', '');
      document.execCommand('formatBlock', false, tag);
    } else {
      document.execCommand(action, false, null);
    }
    editorRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, text);
  }, []);

  return (
    <div className={`rte-container ${focused ? 'rte-focused' : ''}`}>
      <div className="rte-toolbar">
        {TOOLBAR_ACTIONS.map(a => (
          <button
            key={a.cmd}
            type="button"
            className="rte-btn"
            title={a.title}
            onMouseDown={e => { e.preventDefault(); execCmd(a.cmd.includes('formatBlock_') ? a.cmd : a.cmd); }}
          >
            {a.icon}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rte-content"
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight }}
        onInput={handleInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />
    </div>
  );
}

