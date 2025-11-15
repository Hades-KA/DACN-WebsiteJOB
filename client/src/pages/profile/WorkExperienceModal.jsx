import React, { useEffect, useRef, useState } from 'react';

// RTE nhẹ không phụ thuộc package
function MiniRichTextEditor({ value, onChange, placeholder = '' }) {
  const editorRef = useRef(null);

  // Sync value -> DOM (khi mở modal hoặc đổi item)
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd, val) => {
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val ?? null);
    } catch {}
  };

  const applyHeader = (h) => {
    exec('formatBlock', h || 'P');
  };

  const makeLink = () => {
    const url = prompt('Nhập URL liên kết:', 'https://');
    if (!url) return;
    exec('createLink', url);
  };

  const clearFormat = () => {
    exec('removeFormat');
    exec('unlink');
  };

  const handleInput = () => {
    onChange?.(editorRef.current?.innerHTML || '');
  };

  const isEmpty = (html) => {
    const s = String(html || '').replace(/<br\s*\/?>/gi, '').replace(/<p>\s*<\/p>/gi, '').trim();
    return !s;
  };

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b bg-white">
        <select
          className="text-sm border rounded px-1 py-0.5"
          onChange={(e) => applyHeader(e.target.value)}
          defaultValue=""
        >
          <option value="">Normal</option>
          <option value="H1">H1</option>
          <option value="H2">H2</option>
          <option value="H3">H3</option>
        </select>

        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded" onClick={() => exec('bold')} title="Đậm">
          <b>B</b>
        </button>
        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded italic" onClick={() => exec('italic')} title="Nghiêng">
          I
        </button>
        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded underline" onClick={() => exec('underline')} title="Gạch chân">
          U
        </button>
        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded line-through" onClick={() => exec('strikeThrough')} title="Gạch giữa">
          S
        </button>

        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded" onClick={makeLink} title="Chèn liên kết">
          🔗
        </button>

        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded" onClick={() => exec('insertOrderedList')} title="Danh sách số">
          1.
        </button>
        <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded" onClick={() => exec('insertUnorderedList')} title="Danh sách chấm">
          •
        </button>

        <button type="button" className="ml-auto px-2 py-1 hover:bg-gray-100 rounded text-xs text-gray-600" onClick={clearFormat} title="Xóa định dạng">
          Clear
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        {isEmpty(value) && (
          <div className="pointer-events-none absolute left-3 top-2 text-gray-400 text-sm">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          className="min-h-[12rem] max-h-[40vh] overflow-auto p-3 outline-none"
          contentEditable
          onInput={handleInput}
        />
      </div>
    </div>
  );
}

export default function WorkExperienceModal({ open, onClose, onSave, initialData }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef(null);
  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title || '');
    setDescription(initialData?.description || '');
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = (e) => {
    e?.preventDefault?.();
    if (!title.trim()) return;
    onSave?.({ title: title.trim(), description });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Chỉnh Sửa Kinh Nghiệm Làm Việc' : 'Thêm Kinh Nghiệm Làm Việc'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100"
            aria-label="Đóng"
            title="Đóng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label htmlFor="we-title" className="block text-sm font-medium text-gray-700 mb-1">
              Chức Danh <span className="text-red-500">*</span>
            </label>
            <input
              id="we-title"
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Lập trình viên Front-End"
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô Tả
            </label>
            <MiniRichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Mô tả công việc, thành tựu, trách nhiệm..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className={`px-4 py-2 rounded-md text-white ${title.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'}`}
          >
            {isEditing ? 'Lưu thay đổi' : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  );
}