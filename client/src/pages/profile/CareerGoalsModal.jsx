import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import {
  EditorProvider,
  Editor,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnNumberedList,
  BtnBulletList,
  BtnClearFormatting,
  Separator,
} from 'react-simple-wysiwyg';

const editorBox = {
  border: '1px solid #d1d5db',
  borderRadius: 8,
  overflow: 'hidden',
};

export default function CareerGoalsModal({ open, onClose, onSave, initialHtml = '' }) {
  if (!open) return null;

  const [html, setHtml] = useState(initialHtml || '');

  useEffect(() => {
    setHtml(initialHtml || '');
  }, [initialHtml, open]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    onSave?.(html || '');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <form
          noValidate
          onSubmit={handleSubmit}
          className="relative w-full max-w-[800px] rounded-2xl bg-white shadow-2xl border border-gray-200"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gray-900">Mục Tiêu Nghề Nghiệp</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="text-red-500 mr-1">*</span>Mục tiêu nghề nghiệp
            </label>

            <div style={editorBox}>
              <EditorProvider>
                <Editor
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  containerProps={{ style: { minHeight: 320 } }}
                >
                  <Toolbar>
                    <BtnBold />
                    <BtnItalic />
                    <BtnUnderline />
                    <Separator />
                    <BtnNumberedList />
                    <BtnBulletList />
                    <Separator />
                    <BtnClearFormatting />
                  </Toolbar>
                </Editor>
              </EditorProvider>
            </div>

            <div className="h-2" />
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur px-6 py-4 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}