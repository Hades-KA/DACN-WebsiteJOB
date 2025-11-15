import React, { useMemo, useState, useEffect } from 'react';
import { applicationService } from '../../services/api';
import { toast } from 'react-toastify';

/* ============== Helpers ============== */
const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};
const fmtCurrency = (num) => {
  if (typeof num !== 'number' && typeof num !== 'string') return '';
  try {
    const numberValue = Number(String(num).replace(/,/g, ''));
    if (isNaN(numberValue)) return '';
    return numberValue.toLocaleString('vi-VN') + ' VND';
  } catch {
    return '';
  }
};

/* ============== Icons ============== */
const PlusIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const CloseIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const CalendarIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const ClockIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EmailIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const PhoneIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M14.5 6.5L16 8M16 8L18.5 10.5M16 8L13 11M19 15.5C19 18.5376 16.5376 21 13.5 21C10.4624 21 8 18.5376 8 15.5C8 13.5229 9.05263 11.7588 10.5 10.6875M16.5 3C18.9853 3 21 5.01472 21 7.5C21 9.2037 20.1566 10.7339 19 11.6875M12.5 3C10.0147 3 8 5.01472 8 7.5C8 8.44191 8.35824 9.30321 8.94132 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LocationIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M19.5 10.5c0 4.142-7.5 11.5-7.5 11.5s-7.5-7.358-7.5-11.5a7.5 7.5 0 1115 0z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const GraduationCapIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 12v5c0 1.657 4.477 3 10 3s10-1.343 10-3v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BriefcaseIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-8 3h6M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const DollarIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 19.5c-4.142 0-7.5-3.358-7.5-7.5s3.358-7.5 7.5-7.5 7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5zM12 15V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 12h4m-2 5.5v-13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const ChatIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M21 12a8.5 8.5 0 11-3.76-7.1L21 4l-1.9 2.7A8.47 8.47 0 0121 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ============== Tabs ============== */
const Tabs = ({ active, onChange }) => {
  const tabs = useMemo(
    () => [
      { key: 'list', label: 'Danh sách ứng viên' },
      { key: 'search', label: 'Tìm kiếm ứng viên' },
      { key: 'interview', label: 'Lịch phỏng vấn' },
      { key: 'pipeline', label: 'Theo dõi tiến độ' },
    ],
    []
  );
  return (
    <div className="px-6">
      <div className="flex gap-6 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`-mb-px pb-3 text-sm font-medium transition-colors ${
              active === t.key ? 'text-slate-900 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ============== Search Tab (inline giống ảnh) ============== */
const SearchTab = ({ jobPosts = [], cities = [], levels = [], jobTypes = [] }) => {
  const [filters, setFilters] = useState({ jobPost: '', city: '', level: '', jobType: '' });
  const [results, setResults] = useState([]);

  const toOption = (x) => {
    if (typeof x === 'string') return { value: x, label: x };
    const value = x?.id ?? x?.value ?? '';
    const label = x?.title ?? x?.name ?? x?.label ?? String(value);
    return { value: String(value), label: String(label || '') };
  };

  const search = (f) => {
    // TODO: call API -> setResults(data)
    setResults([]);
  };

  const update = (k) => (e) => {
    const next = { ...filters, [k]: e.target.value };
    setFilters(next);
    search(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {/* Filters inline y chang bố cục */}
        <div className="p-4 border-b border-slate-200">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <select
                value={filters.jobPost}
                onChange={update('jobPost')}
                disabled={!jobPosts.length}
                className="h-10 w-full px-3 rounded-md border border-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {jobPosts.length ? 'Chọn tin tuyển dụng' : 'Bạn chưa có tin tuyển dụng'}
                </option>
                {jobPosts.map((jp) => {
                  const o = toOption(jp);
                  return (
                    <option key={`${o.value}-${o.label}`} value={o.value}>
                      {o.label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <select value={filters.city} onChange={update('city')} className="h-10 w-full px-3 rounded-md border border-slate-300">
                <option value="">Tỉnh thành</option>
                {cities.map((c) => (
                  <option key={c?.id ?? c} value={c?.id ?? c}>
                    {c?.name ?? c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select value={filters.level} onChange={update('level')} className="h-10 w-full px-3 rounded-md border border-slate-300">
                <option value="">Cấp bậc</option>
                {levels.map((l) => (
                  <option key={l?.id ?? l} value={l?.id ?? l}>
                    {l?.name ?? l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select value={filters.jobType} onChange={update('jobType')} className="h-10 w-full px-3 rounded-md border border-slate-300">
                <option value="">Loại công việc</option>
                {jobTypes.map((t) => (
                  <option key={t?.id ?? t} value={t?.id ?? t}>
                    {t?.name ?? t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bảng kết quả */}
        <div>
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 text-sm font-medium text-slate-600 bg-slate-50 px-4 py-2 border-b border-slate-200">
            <div>Họ tên</div>
            <div>Kinh nghiệm</div>
            <div>Học vấn</div>
            <div className="text-right">Độ phù hợp</div>
          </div>

          {results.length ? (
            <ul className="divide-y divide-slate-200">
              {results.map((r) => (
                <li key={r.id} className="grid grid-cols-[2fr,1fr,1fr,1fr] items-center gap-4 px-4 py-3">
                  <div className="text-slate-900">{r.name}</div>
                  <div className="text-slate-700">{r.experience}</div>
                  <div className="text-slate-700">{r.education}</div>
                  <div className="text-right">
                    <span className="inline-block text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-50">{r.match}%</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-16 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <svg className="mx-auto mb-2 w-10 h-10 opacity-60" viewBox="0 0 24 24" fill="none">
                  <path d="M6 7h12M6 11h12M6 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="text-sm">No data</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============== Lịch phỏng vấn (Việt hóa) ============== */
function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay()); // CN-first
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, key: toKey(d), inMonth: d.getMonth() === month });
  }
  const matrix = [];
  for (let r = 0; r < 6; r++) matrix.push(cells.slice(r * 7, r * 7 + 7));
  return matrix;
}
const weekdaysVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const monthsVi = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

const MonthView = ({ year, month, todayKey, eventsByDay, onCreateRange }) => {
  const [dragging, setDragging] = useState(false);
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const isInRange = (k) => {
    if (!selStart || !selEnd) return false;
    const a = selStart < selEnd ? selStart : selEnd;
    const b = selStart < selEnd ? selEnd : selStart;
    return a <= k && k <= b;
  };

  const endDrag = (key) => {
    if (!dragging) return;
    const a = selStart < key ? selStart : key;
    const b = selStart < key ? key : selStart;
    onCreateRange?.(a, b);
    setDragging(false);
  };

  return (
    <div className="px-2 pb-4">
      <div className="grid grid-cols-7 text-xs text-slate-500 px-1 pt-3 pb-2">
        {weekdaysVi.map((w) => (
          <div key={w} className="text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-rows-6">
        {matrix.map((row, i) => (
          <div key={i} className="grid grid-cols-7">
            {row.map((cell) => {
              const selected = isInRange(cell.key);
              const isToday = cell.inMonth && cell.key === todayKey;
              const hasEvent = (eventsByDay[cell.key]?.length || 0) > 0;
              return (
                <div
                  key={cell.key}
                  onMouseDown={() => {
                    setSelStart(cell.key);
                    setSelEnd(cell.key);
                    setDragging(true);
                  }}
                  onMouseEnter={() => {
                    if (dragging) setSelEnd(cell.key);
                  }}
                  onMouseUp={() => endDrag(cell.key)}
                  className={`relative h-24 border-t border-slate-200 first:border-l last:border-r
                    ${cell.inMonth ? 'bg-white' : 'bg-white text-slate-300'}
                    ${selected ? 'bg-blue-100/60' : ''}
                    ${hasEvent ? 'bg-indigo-50/50' : ''}
                    hover:bg-slate-50 cursor-pointer
                  `}
                >
                  <div className="p-2 flex justify-end">
                    <span
                      className={
                        isToday
                          ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold'
                          : 'text-xs text-slate-700'
                      }
                    >
                      {cell.date.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const YearView = ({ year, todayKey, eventsByDay }) => (
  <div className="p-3">
    <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-3 sm:grid-cols-2">
      {monthsVi.map((m, idx) => {
        const matrix = getMonthMatrix(year, idx);
        return (
          <div key={m} className="border border-slate-200 rounded-lg bg-white">
            <div className="px-3 py-2 text-sm font-medium border-b border-slate-200">
              {m} {year}
            </div>
            <div className="px-1 pt-2">
              <div className="grid grid-cols-7 text-[11px] text-slate-500">
                {weekdaysVi.map((w) => (
                  <div key={w} className="text-center">
                    {w}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-1 pb-2">
              {matrix.map((row, i) => (
                <div key={i} className="grid grid-cols-7">
                  {row.map((cell) => {
                    const isToday = cell.inMonth && cell.key === todayKey;
                    const hasEvent = (eventsByDay[cell.key]?.length || 0) > 0;
                    return (
                      <div key={cell.key} className={`relative h-8 border-t border-slate-100 first:border-l last:border-r ${hasEvent ? 'bg-indigo-50/50' : ''}`}>
                        <div className="pr-1 pt-1 flex justify-end">
                          <span className={isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-semibold' : 'text-[11px] text-slate-700'}>
                            {cell.date.getDate()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* ============== Modal Lên lịch phỏng vấn (dọc, VN) ============== */
function InterviewFormModal({ open, onClose, defaultDateKey, onSubmit, applications = [] }) {
  const [applicationId, setApplicationId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDateKey || toKey(new Date()));
  const [time, setTime] = useState('');
  const [mode, setMode] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setApplicationId('');
      setTitle('');
      setDate(defaultDateKey || toKey(new Date()));
      setTime('');
      setMode('');
      setLocation('');
      setNote('');
    }
  }, [open, defaultDateKey]);

  const times = useMemo(() => {
    const arr = [];
    for (let h = 7; h <= 21; h++) for (let m = 0; m < 60; m += 30) arr.push(`${pad(h)}:${pad(m)}`);
    return arr;
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!applicationId || !title.trim() || !date || !time || !mode || !location.trim()) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc (*)');
      return;
    }
    onSubmit?.({ id: uid(), applicationId, title: title.trim(), dateKey: date, time, mode, location: location.trim(), note });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
            <div className="font-semibold">Lên lịch phỏng vấn</div>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
              <CloseIcon />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Đơn ứng tuyển
              </label>
              <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)} className="h-10 px-3 rounded-md border border-slate-300">
                <option value="">Chọn đơn ứng tuyển</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label || a.name || a.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Tiêu đề
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 px-3 rounded-md border border-slate-300" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Ngày phỏng vấn
              </label>
              <div className="relative">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-full pl-3 pr-9 rounded-md border border-slate-300" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <CalendarIcon />
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Thời gian
              </label>
              <div className="relative">
                <select value={time} onChange={(e) => setTime(e.target.value)} className="h-10 w-full pl-3 pr-9 rounded-md border border-slate-300">
                  <option value="">Chọn thời gian</option>
                  {times.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <ClockIcon />
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Hình thức
              </label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="h-10 px-3 rounded-md border border-slate-300">
                <option value="">Chọn</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Địa điểm
              </label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="h-10 px-3 rounded-md border border-slate-300" placeholder="Nhập địa điểm phỏng vấn" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Ghi chú</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[100px] px-3 py-2 rounded-md border border-slate-300" />
            </div>
          </div>
          <div className="px-6 py-3 border-t border-slate-200">
            <button type="submit" className="px-4 h-10 rounded-md bg-blue-600 text-white hover:bg-blue-700">
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============== Modal chi tiết ứng viên (giữ nguyên cấu trúc) ============== */
function CandidateDetailModal({ open, onClose, application }) {
  const [activeTab, setActiveTab] = useState('personal');
  useEffect(() => { if (open) setActiveTab('personal'); }, [open]);
  if (!open || !application) return null;

  const candidate = application.candidate || {};
  const job = application.job || {};
  const profile = candidate.profile || candidate.cv || {};
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const certificates = Array.isArray(profile.certificates) ? profile.certificates : [];

  const DetailItem = ({ icon, label, children }) => (
    <div className="flex gap-3 text-sm items-center">
      <div className="w-5 flex-shrink-0">{icon}</div>
      <div className="text-slate-500 w-32 flex-shrink-0">{label}:</div>
      <div className="text-slate-800 font-medium break-words">{children || 'Chưa cập nhật'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col">
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <img
                src={candidate.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name || 'A')}&background=random`}
                alt={candidate.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{candidate.name}</h3>
                <p className="text-sm text-slate-600">{job.title}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 p-1 -mr-1">
              <CloseIcon />
            </button>
          </div>

          <div className="px-6 border-b border-slate-200">
            <div className="flex gap-6">
              <button onClick={() => setActiveTab('personal')} className={`-mb-px py-3 text-sm font-medium transition-colors ${activeTab === 'personal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Thông tin cá nhân</button>
              <button onClick={() => setActiveTab('experience')} className={`-mb-px py-3 text-sm font-medium transition-colors ${activeTab === 'experience' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Kinh nghiệm làm việc</button>
              <button onClick={() => setActiveTab('interview')} className={`-mb-px py-3 text-sm font-medium transition-colors ${activeTab === 'interview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Lịch phỏng vấn</button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {activeTab === 'personal' && (
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-8">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">Thông tin liên hệ</h4>
                    <div className="space-y-4">
                      <DetailItem icon={<EmailIcon />} label="Email">{candidate.email}</DetailItem>
                      <DetailItem icon={<PhoneIcon />} label="Số điện thoại">{candidate.phone}</DetailItem>
                      <DetailItem icon={<LocationIcon />} label="Địa chỉ">{profile.address}</DetailItem>
                      <DetailItem icon={<CalendarIcon />} label="Ngày sinh">{fmtDate(profile.dob)}</DetailItem>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">Học vấn & Kinh nghiệm</h4>
                    <div className="space-y-4">
                      <DetailItem icon={<GraduationCapIcon />} label="Trình độ học vấn">{profile.educationLevel}</DetailItem>
                      <DetailItem icon={<BriefcaseIcon />} label="Kinh nghiệm">{profile.experienceLevel}</DetailItem>
                      <DetailItem icon={<DollarIcon />} label="Mức lương mong muốn">{fmtCurrency(profile.desiredSalary)}</DetailItem>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">Kỹ năng</h4>
                    {Array.isArray(skills) && skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <span key={index} className="px-3 py-1 text-sm font-medium rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                            {skill.name}{skill.level ? ` - ${skill.level.toUpperCase()}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : <p className="text-sm text-slate-500">Chưa cập nhật kỹ năng.</p>}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">Chứng chỉ</h4>
                    {Array.isArray(certificates) && certificates.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                        {certificates.map((cert, index) => <li key={index}>{cert.name}</li>)}
                      </ul>
                    ) : <p className="text-sm text-slate-500">Chưa có chứng chỉ.</p>}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'experience' && <div className="text-center text-slate-500 py-10">Mục Kinh nghiệm làm việc đang được phát triển.</div>}
            {activeTab === 'interview' && <div className="text-center text-slate-500 py-10">Mục Lịch phỏng vấn đang được phát triển.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== Danh sách ứng viên (đã chỉnh style giống video) ============== */
const AcceptedListTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal chi tiết
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const getAcceptedAt = (a) => {
    if (a.acceptedAt) return a.acceptedAt;
    try {
      const hist = JSON.parse(a.statusHistory || '[]');
      for (let i = hist.length - 1; i >= 0; i--) if (hist[i]?.to === 'accepted') return hist[i].at;
    } catch {}
    return a.updatedAt || a.createdAt || null;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr('');
      try {
        const res = await applicationService.getApplications({ status: 'accepted', limit: 300 });
        const list = res?.data?.data || res?.data || [];
        const norm = list.map((a) => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt,
          acceptedAt: getAcceptedAt(a),
          candidate: a.candidate || {},
          job: a.job || {},
        }));
        setItems(norm);
      } catch (e) {
        setErr(e?.response?.data?.message || 'Không tải được danh sách ứng viên đã nhận.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = items.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setDetailModalOpen(true);
  };

  const handleUnaccept = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy chấp nhận ứng viên này?')) return;
    try {
      await applicationService.updateApplicationStatus(id, 'reviewing');
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success('Đã hủy chấp nhận ứng viên.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Hủy nhận thất bại.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden bg-white">
        {/* Header row giống style mẫu */}
        <div className="grid grid-cols-[2fr,2fr,1.5fr,1.5fr] gap-4 text-sm font-medium text-slate-600 bg-slate-50 px-6 py-2 border-b border-slate-200">
          <div>Ứng viên</div>
          <div>Vị trí ứng tuyển</div>
          <div>Ngày chấp nhận</div>
          <div className="text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded" />)}
          </div>
        ) : err ? (
          <div className="p-4 text-amber-800 bg-amber-50">{err}</div>
        ) : pageItems.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-500">Chưa có ứng viên được chấp nhận</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {pageItems.map((it) => (
              <li key={it.id} className="grid grid-cols-[2fr,2fr,1.5fr,1.5fr] items-center gap-4 px-6 py-4">
                {/* Ứng viên: tên + phone + email (email trong pill) */}
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{it.candidate?.name || '-'}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <PhoneIcon /> {it.candidate?.phone || ''}
                    </span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <EmailIcon />
                      <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 truncate">
                        {it.candidate?.email || ''}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Vị trí ứng tuyển: chip xanh nhạt giống video */}
                <div className="min-w-0">
                  <span className="inline-block max-w-full truncate text-xs px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                    {it.job?.title || '-'}
                  </span>
                </div>

                {/* Ngày chấp nhận: icon lịch + dd/mm/yyyy */}
                <div className="text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon />
                    {fmtDate(it.acceptedAt) || '-'}
                  </span>
                </div>

                {/* Thao tác: Xem chi tiết (primary) + Chat (outline + icon) */}
                <div className="text-right space-x-2">
                  <button onClick={() => handleViewDetails(it)} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
                    Xem chi tiết
                  </button>
                  <button onClick={() => { /* TODO: open chat */ }} className="px-3 py-2 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 inline-flex items-center gap-1">
                    <ChatIcon /> Chat
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Phân trang giống style mẫu */}
      {Math.max(1, Math.ceil(items.length / PAGE_SIZE)) > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            className="h-8 w-8 grid place-items-center rounded border border-slate-300 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            aria-label="Trang trước"
          >
            ‹
          </button>
          <div className="h-8 min-w-[2rem] grid place-items-center rounded border border-slate-300 text-sm px-2">
            {pageSafe}
          </div>
          <button
            className="h-8 w-8 grid place-items-center rounded border border-slate-300 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(items.length / PAGE_SIZE)), p + 1))}
            disabled={pageSafe >= Math.max(1, Math.ceil(items.length / PAGE_SIZE))}
            aria-label="Trang sau"
          >
            ›
          </button>
        </div>
      )}

      {/* Modal chi tiết */}
      <CandidateDetailModal open={isDetailModalOpen} onClose={() => setDetailModalOpen(false)} application={selectedApplication} />
    </div>
  );
};

/* ============== Tab Lịch phỏng vấn (gắn modal) ============== */
const InterviewTab = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState('month');
  const [todayKey, setTodayKey] = useState(toKey(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTodayKey(toKey(new Date())), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const [events, setEvents] = useState([]);
  const eventsByDay = useMemo(() => {
    const m = {};
    for (const e of events) {
      if (!m[e.dateKey]) m[e.dateKey] = [];
      m[e.dateKey].push(e);
    }
    return m;
  }, [events]);

  const [open, setOpen] = useState(false);
  const [defaultDateKey, setDefaultDateKey] = useState(toKey(new Date()));
  const openCreate = (key) => { setDefaultDateKey(key); setOpen(true); };
  const createRange = (aKey) => openCreate(aKey);
  const onSubmit = (payload) => { setEvents((s) => [...s, payload]); setOpen(false); };

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => cur - 2 + i);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Lịch phỏng vấn</div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="h-9 px-2 rounded-md border border-slate-300 text-sm">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(+e.target.value)} className="h-9 px-2 rounded-md border border-slate-300 text-sm" disabled={view === 'year'}>
            {monthsVi.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <button onClick={() => setView('month')} className={`h-9 px-3 rounded-md text-sm border ${view === 'month' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-50'}`}>Tháng</button>
          <button onClick={() => setView('year')} className={`h-9 px-3 rounded-md text-sm border ${view === 'year' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-50'}`}>Năm</button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {view === 'month' ? (
          <MonthView year={year} month={month} todayKey={todayKey} eventsByDay={eventsByDay} onCreateRange={createRange} />
        ) : (
          <YearView year={year} todayKey={todayKey} eventsByDay={eventsByDay} />
        )}
      </div>

      <button onClick={() => openCreate(toKey(new Date()))} className="fixed right-6 bottom-6 z-40 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg grid place-items-center hover:bg-indigo-700" title="Tạo lịch phỏng vấn">
        <PlusIcon />
      </button>

      <InterviewFormModal open={open} onClose={() => setOpen(false)} defaultDateKey={defaultDateKey} onSubmit={onSubmit} applications={[]} />
    </div>
  );
};

/* ============== Main Page ============== */
export default function Candidates() {
  const [active, setActive] = useState('list');

  // Dữ liệu chọn lọc (truyền khi có API)
  const jobPosts = [];
  const cities = [];
  const levels = [];
  const jobTypes = [];

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-6">
      <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 pt-5 pb-2">
          <div className="text-base font-semibold text-slate-900 mb-3">Quản lý ứng viên</div>
        </div>
        <Tabs active={active} onChange={setActive} />
        <div className="py-4">
          {active === 'list' && <div className="px-6"><AcceptedListTab /></div>}
          {active === 'search' && <div className="px-6"><SearchTab jobPosts={jobPosts} cities={cities} levels={levels} jobTypes={jobTypes} /></div>}
          {active === 'interview' && <div className="px-6"><InterviewTab /></div>}
          {active === 'pipeline' && <div className="px-6 py-10 text-sm text-slate-500">Theo dõi tiến độ (đang cập nhật)</div>}
        </div>
      </div>
    </div>
  );
}