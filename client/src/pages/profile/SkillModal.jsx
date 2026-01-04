import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const LEVELS = [
  { value: 'basic',         label: 'Cơ bản',     cls: 'border-amber-300 text-amber-700 hover:bg-amber-50',   active: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'intermediate',  label: 'Trung cấp',  cls: 'border-teal-300 text-teal-700 hover:bg-teal-50',     active: 'bg-teal-100 text-teal-800 border-teal-300' },
  { value: 'advanced',      label: 'Cao cấp',    cls: 'border-sky-300 text-sky-700 hover:bg-sky-50',        active: 'bg-sky-100 text-sky-800 border-sky-300' },
  { value: 'expert',        label: 'Thành thạo', cls: 'border-violet-300 text-violet-700 hover:bg-violet-50',active: 'bg-violet-100 text-violet-800 border-violet-300' },
];

const toKey = (s) => (typeof s === 'string' ? s : (s?.name || '')).toLowerCase();

export default function SkillModal({
  open,
  onClose,
  onSave,
  initial = [],        // [{name, level}] hoặc ['React','NodeJS']
  suggestions = [],    // ['Giao tiếp','Làm việc nhóm',...]
}) {
  if (!open) return null; // early return TRƯỚC mọi hooks (để không đổi order hooks)

  const [selected, setSelected] = useState(Array.isArray(initial) ? initial : []);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [showMore, setShowMore] = useState(false);

  // Reset mỗi khi mở/modal thay initial
  useEffect(() => {
    setSelected(Array.isArray(initial) ? initial : []);
    setName('');
    setLevel('');
    setShowMore(false);
  }, [open, initial]);

  const selectedNames = useMemo(
    () => new Set(selected.map((s) => toKey(s))),
    [selected]
  );

  const canAdd = name.trim() !== '' && level;

  const addSkill = () => {
    if (!canAdd) return;
    const n = name.trim();
    setSelected((prev) => {
      const idx = prev.findIndex((s) => toKey(s) === n.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        const cur = typeof prev[idx] === 'string' ? { name: n, level } : prev[idx];
        copy[idx] = { ...cur, name: n, level };
        return copy;
      }
      return [...prev, { name: n, level }];
    });
    setName('');
    // có thể giữ level để thêm nhanh skill cùng level
  };

  const removeSkill = (n) => {
    const key = toKey(n);
    setSelected((prev) => prev.filter((s) => toKey(s) !== key));
  };

  const save = (e) => {
    e?.preventDefault?.();
    onSave?.(selected);
    onClose?.();
  };

  const shownSuggests = showMore ? suggestions : suggestions.slice(0, 16);
  const moreCount = Math.max(0, (suggestions?.length || 0) - shownSuggests.length);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <form onSubmit={save} className="relative w-full max-w-[720px] rounded-2xl bg-white shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gray-900">Thêm Kỹ Năng</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-500 mr-1">*</span>Tên Kỹ Năng
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên kỹ năng"
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-sm text-gray-700 font-medium">Mức Độ Thành Thạo</div>
                <div className="flex flex-wrap items-center gap-2">
                  {LEVELS.map((lv) => {
                    const active = level === lv.value;
                    return (
                      <button
                        key={lv.value}
                        type="button"
                        onClick={() => setLevel(lv.value)}
                        className={`px-3 py-1.5 rounded-md border text-sm transition ${active ? lv.active : lv.cls}`}
                      >
                        {lv.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addSkill}
                    disabled={!canAdd}
                    className={`px-3 py-1.5 rounded-md text-sm border transition ${
                      canAdd ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600' : 'border-gray-300 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>

            {/* Đã chọn */}
            {selected.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Kỹ năng đã chọn</div>
                <div className="flex flex-wrap gap-2">
                  {selected.map((s, i) => {
                    const n = typeof s === 'string' ? s : s.name;
                    const lv = typeof s === 'string' ? null : s.level;
                    return (
                      <span key={n + i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ring-1 ring-blue-200 bg-white">
                        <span className="text-sm text-gray-800 font-medium">{n}</span>
                        {lv && <span className="text-xs px-2 py-0.5 rounded-md border bg-gray-50 text-gray-700">
                          {LEVELS.find((x) => x.value === lv)?.label || lv}
                        </span>}
                        <button type="button" onClick={() => removeSkill(n)} className="ml-1 text-gray-400 hover:text-gray-600" title="Xóa">
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Đề xuất */}
            {suggestions.length > 0 && (
              <div className="mt-5">
                <div className="text-sm font-medium text-gray-700 mb-2">Kỹ Năng Được Đề Xuất</div>
                <div className="flex flex-wrap gap-2">
                  {shownSuggests.map((sg) => {
                    const active = selectedNames.has(String(sg).toLowerCase());
                    return (
                      <button
                        key={sg}
                        type="button"
                        onClick={() => setName(sg)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${
                          active ? 'bg-blue-100 text-blue-700 border-blue-200' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                        title={sg}
                      >
                        {sg}
                      </button>
                    );
                  })}
                </div>
                {moreCount > 0 && (
                  <button type="button" onClick={() => setShowMore(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                    Xem thêm ({moreCount} kỹ năng)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur px-6 py-4 border-t flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              Đóng
            </button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}