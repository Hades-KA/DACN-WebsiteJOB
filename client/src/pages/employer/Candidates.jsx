// client/src/pages/employer/Candidates.jsx
import React, {
  useMemo,
  useState,
  useEffect,
  createContext,
  useContext,
} from 'react';
import { applicationService, cvService } from '../../services/api';
import { toast } from 'react-toastify';
import { Download, Edit2, Trash2, MessageCircle } from 'lucide-react';
import { useEmployerChat } from '../../contexts/EmployerChatContext';

// Nếu hủy từ danh sách (nút "Hủy" màu đỏ) thì chuyển sang rejected
const CANCEL_TARGET_STATUS = 'rejected';

// --- UTILS ---
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

const API_ROOT = String(import.meta?.env?.VITE_API_URL || 'http://localhost:5001')
  .replace(/\/$/, '')
  .replace(/\/api$/i, '');

const toAbsoluteUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_ROOT}${u.startsWith('/') ? '' : '/'}${u}`;
};

const clickAnchor = (href, fileName, newTab = false) => {
  if (!href) return;
  const a = document.createElement('a');
  a.href = href;
  if (fileName) a.download = fileName.replace(/\s+/g, '_');
  if (newTab) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const parseSkillsFlexible = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills
      .map((s) => {
        if (typeof s === 'string') return { name: s.trim(), level: '' };
        if (s && typeof s === 'object') {
          const name = s.name || s.label || s.skill || '';
          const level = s.level || s.proficiency || '';
          return { name: String(name).trim(), level: String(level || '').trim() };
        }
        return null;
      })
      .filter(Boolean)
      .filter((x) => x.name);
  }
  if (typeof skills === 'string') {
    const str = skills.trim();
    if (!str) return [];
    try {
      return parseSkillsFlexible(JSON.parse(str));
    } catch {
      return str.split(',').map((x) => ({ name: x.trim(), level: '' })).filter((x) => x.name);
    }
  }
  if (typeof skills === 'object') {
    return Object.entries(skills).map(([k, v]) => ({
      name: k,
      level: String(v || '').trim(),
    }));
  }
  return [];
};

// --- LOGIC LƯU TRỮ THEO USER ---
const getStorageKey = () => {
  try {
    const possibleKeys = ['user', 'currentUser', 'profile', 'employer', 'auth-storage'];
    let userId = null;
    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          userId = parsed.id || parsed._id || parsed.userId || parsed.user?.id;
          if (userId) break;
        } catch {}
      }
    }
    if (userId) return `interview_events_${userId}`;
  } catch (e) {
    console.error('Error getting user key', e);
  }
  return 'interview_events_guest';
};

// --- CONTEXT ---
const InterviewContext = createContext(null);

const InterviewProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [storageKey, setStorageKey] = useState(() => getStorageKey());

  useEffect(() => {
    const currentKey = getStorageKey();
    setStorageKey(currentKey);
    try {
      const saved = JSON.parse(localStorage.getItem(currentKey) || '[]');
      setEvents(Array.isArray(saved) ? saved : []);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(events));
    }
  }, [events, storageKey]);

  const addEvent = async (event) => {
    const existing = events.find((e) => e.applicationId === event.applicationId);
    if (existing) {
      toast.error('Ứng viên này đã có lịch phỏng vấn!');
      return false;
    }
    try {
      let interviewTime = null;
      if (event.dateKey && event.time) {
        const dt = new Date(`${event.dateKey}T${event.time}:00`);
        if (!isNaN(dt.getTime())) {
          interviewTime = dt.toISOString();
        }
      }

      // Khi tạo lịch: chuyển trạng thái sang interviewed và để backend gửi email mời
      await applicationService.updateApplicationStatus(event.applicationId, {
        status: 'interviewed',
        interviewTime,
        interviewMode: event.mode,
      });

      setEvents((prev) => [...prev, event]);
      setReloadTrigger((prev) => prev + 1);
      toast.success('Đã tạo lịch phỏng vấn và gửi email mời thành công!');
      return true;
    } catch (error) {
      toast.error(
        'Tạo lịch phỏng vấn thất bại: ' +
          (error?.response?.data?.message || error.message)
      );
      return false;
    }
  };

  const updateEvent = (eventId, updatedEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
    toast.success('Đã cập nhật lịch phỏng vấn!');
  };

  // XÓA LỊCH: chỉ xóa event, nếu là lịch cuối cùng thì đưa ứng viên về shortlisted
  const deleteEvent = async (eventId) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return false;

    try {
      const remainingEvents = events.filter(
        (e) => e.id !== eventId && e.applicationId === event.applicationId
      );

      setEvents((prev) => prev.filter((e) => e.id !== eventId));

      if (remainingEvents.length === 0) {
        // Không còn lịch nào cho ứng viên này → quay về trạng thái "đã mời"
        await applicationService.updateApplicationStatus(event.applicationId, {
          status: 'shortlisted',
          interviewTime: null,
          interviewMode: null,
        });
        toast.success(
          'Đã hủy lịch phỏng vấn. Ứng viên quay về trạng thái "Đã mời (chờ xếp lịch)".'
        );
      } else {
        toast.success('Đã xóa lịch phỏng vấn!');
      }

      setReloadTrigger((prev) => prev + 1);
      return true;
    } catch (error) {
      setEvents((prev) => [...prev, event]);
      toast.error(
        'Xóa lịch phỏng vấn thất bại: ' +
          (error?.response?.data?.message || error.message)
      );
      return false;
    }
  };

  const getEventsByApplication = (applicationId) =>
    events.filter((e) => e.applicationId === applicationId);

  const clearEventsByApplication = (applicationId) =>
    setEvents((prev) => prev.filter((e) => e.applicationId !== applicationId));

  const forceReload = () => setReloadTrigger((prev) => prev + 1);

  return (
    <InterviewContext.Provider
      value={{
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsByApplication,
        clearEventsByApplication,
        reloadTrigger,
        forceReload,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterview must be used within InterviewProvider');
  return context;
};

// --- ICONS ---
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
    <path
      d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const PhoneIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M14.5 6.5L16 8M16 8L18.5 10.5M16 8L13 11M19 15.5C19 18.5376 16.5376 21 13.5 21C10.4624 21 8 18.5376 8 15.5C8 13.5229 9.05263 11.7588 10.5 10.6875M16.5 3C18.9853 3 21 5.01472 21 7.5C21 9.2037 20.1566 10.7339 19 11.6875M12.5 3C10.0147 3 8 5.01472 8 7.5C8 8.44191 8.35824 9.30321 8.94132 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const LocationIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M19.5 10.5c0 4.142-7.5 11.5-7.5 11.5s-7.5-7.358-7.5-11.5a7.5 7.5 0 1115 0z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);
const GraduationCapIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M6 12v5c0 1.657 4.477 3 10 3s10-1.343 10-3v-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const BriefcaseIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-8 3h6M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const DollarIcon = ({ className = 'w-4 h-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 19.5c-4.142 0-7.5-3.358-7.5-7.5s3.358-7.5 7.5-7.5 7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5zM12 15V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M10 12h4m-2 5.5v-13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const CheckCircleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- SUB COMPONENTS ---

const Tabs = ({ active, onChange }) => {
  const tabs = useMemo(
    () => [
      { key: 'list', label: 'Danh sách ứng viên' },
      { key: 'interview', label: 'Lịch phỏng vấn' },
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
              active === t.key
                ? 'text-slate-900 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
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
const monthsVi = [
  'Th1',
  'Th2',
  'Th3',
  'Th4',
  'Th5',
  'Th6',
  'Th7',
  'Th8',
  'Th9',
  'Th10',
  'Th11',
  'Th12',
];

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

  const isInRange = (k) =>
    selStart &&
    selEnd &&
    (selStart < selEnd ? selStart : selEnd) <= k &&
    k <= (selStart < selEnd ? selEnd : selStart);

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
                  className={`relative h-24 border-t border-slate-200 first:border-l last:border-r ${
                    cell.inMonth ? 'bg-white' : 'bg-white text-slate-300'
                  } ${selected ? 'bg-blue-100/60' : ''} ${
                    hasEvent ? 'bg-indigo-50/50' : ''
                  } hover:bg-slate-50 cursor-pointer`}
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
                  {hasEvent && (
                    <span className="absolute left-2 bottom-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-semibold">
                      {eventsByDay[cell.key].length}
                    </span>
                  )}
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
                      <div
                        key={cell.key}
                        className={`relative h-8 border-t border-slate-100 first:border-l last:border-r ${
                          hasEvent ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <div className="pr-1 pt-1 flex justify-end">
                          <span
                            className={
                              isToday
                                ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-semibold'
                                : 'text-[11px] text-slate-700'
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
      })}
    </div>
  </div>
);

function InterviewFormModal({
  open,
  onClose,
  defaultDateKey,
  onSubmit,
  applications = [],
  editEvent = null,
}) {
  const [applicationId, setApplicationId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDateKey || toKey(new Date()));
  const [time, setTime] = useState('');
  const [mode, setMode] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setApplicationId(editEvent.applicationId || '');
        setTitle(editEvent.title || '');
        setDate(editEvent.dateKey || defaultDateKey || toKey(new Date()));
        setTime(editEvent.time || '');
        setMode(editEvent.mode || '');
        setLocation(editEvent.location || '');
        setNote(editEvent.note || '');
      } else {
        setApplicationId('');
        setTitle('');
        setDate(defaultDateKey || toKey(new Date()));
        setTime('');
        setMode('');
        setLocation('');
        setNote('');
      }
    }
  }, [open, defaultDateKey, editEvent]);

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
    onSubmit?.(
      {
        id: editEvent?.id || uid(),
        applicationId,
        title: title.trim(),
        dateKey: date,
        time,
        mode,
        location: location.trim(),
        note,
      },
      editEvent ? 'edit' : 'create'
    );
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="w-full max-w-xl rounded-lg bg-white shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
            <div className="font-semibold">
              {editEvent ? 'Chỉnh sửa lịch phỏng vấn' : 'Lên lịch phỏng vấn'}
            </div>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
              <CloseIcon />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Đơn ứng tuyển
              </label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="h-10 px-3 rounded-md border border-slate-300"
                disabled={!!editEvent}
              >
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
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 px-3 rounded-md border border-slate-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Ngày phỏng vấn
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 w-full pl-3 pr-9 rounded-md border border-slate-300"
                />
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
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-10 w-full pl-3 pr-9 rounded-md border border-slate-300"
                >
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
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="h-10 px-3 rounded-md border border-slate-300"
              >
                <option value="">Chọn</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">
                <span className="text-rose-500 mr-1">*</span>Địa điểm
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 px-3 rounded-md border border-slate-300"
                placeholder="Nhập địa điểm phỏng vấn"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px] px-3 py-2 rounded-md border border-slate-300"
              />
            </div>
          </div>
          <div className="px-6 py-3 border-t border-slate-200 flex gap-2">
            <button
              type="submit"
              className="px-4 h-10 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {editEvent ? 'Cập nhật' : 'Xác nhận'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CandidateDetailModal({ open, onClose, application, onStatusChange }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const { getEventsByApplication, updateEvent, deleteEvent } = useInterview();

  useEffect(() => {
    if (open) setActiveTab('personal');
  }, [open]);

  const candidateRaw = application?.candidate || {};
  const jobRaw = application?.job || {};
  const cvObj = application?.cv || null;
  const EXP_START = '<!--WF_EXP_START-->';
  const EXP_END = '<!--WF_EXP_END-->';
  const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(String(s || ''));
  const extractExpFromGoals = (html = '') => {
    const m = String(html).match(new RegExp(`${EXP_START}([\\s\\S]*?)${EXP_END}`));
    if (!m) return [];
    try {
      const arr = JSON.parse(m[1] || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };
  const parseExpArrayLike = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const j = JSON.parse(v);
        return Array.isArray(j) ? j : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const profile = useMemo(
    () => ({
      address: candidateRaw.address || candidateRaw.location || '',
      dob: candidateRaw.birthdate || candidateRaw.dob || candidateRaw.dateOfBirth || null,
      educationLevel: candidateRaw.degree || candidateRaw.education || '',
      experienceLevel: candidateRaw.experienceBand || candidateRaw.experience || '',
      desiredSalary: candidateRaw.expectedSalary ?? candidateRaw.salary ?? '',
      skills: parseSkillsFlexible(candidateRaw.skills),
      certificates: Array.isArray(candidateRaw.certificates) ? candidateRaw.certificates : [],
    }),
    [candidateRaw]
  );
  const workExps = useMemo(() => {
    let arr =
      parseExpArrayLike(candidateRaw.workExperiences) ||
      parseExpArrayLike(candidateRaw.experiences) ||
      [];
    if (!arr.length && candidateRaw.careerGoals) {
      arr = extractExpFromGoals(candidateRaw.careerGoals);
    }
    return (arr || [])
      .map((x) => ({
        title: (x?.title || '').trim(),
        description: x?.description || '',
      }))
      .filter((x) => x.title || x.description);
  }, [candidateRaw]);

  const myEvents = useMemo(() => {
    if (!application?.id) return [];
    return getEventsByApplication(application.id);
  }, [application?.id, getEventsByApplication]);

  const isOpen = Boolean(open && application);
  if (!isOpen) return null;

  const candidate = candidateRaw;
  const job = jobRaw;
  const skills = profile.skills;

  const DetailItem = ({ icon, label, children }) => (
    <div className="flex gap-3 text-sm items-center">
      <div className="w-5 flex-shrink-0">{icon}</div>
      <div className="text-slate-500 w-32 flex-shrink-0">{label}:</div>
      <div className="text-slate-800 font-medium break-words">{children || 'Chưa cập nhật'}</div>
    </div>
  );
  const onViewCv = async () => {
    try {
      const url = cvObj?.url || (cvObj?.filePath ? toAbsoluteUrl(cvObj.filePath) : '');
      if (url) {
        clickAnchor(url, cvObj?.fileName || 'CV.pdf', true);
        return;
      }
      if (cvObj?.id) {
        const res = await cvService.downloadCV(cvObj.id);
        const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
        clickAnchor(blobUrl, cvObj?.fileName || 'CV.pdf');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
      toast.info('Không tìm thấy CV đính kèm.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Không mở được CV đính kèm');
    }
  };
  const handleEdit = (event) => {
    setEditingEvent(event);
    setEditModalOpen(true);
  };
  const handleDelete = async (eventId) => {
    if (!window.confirm('Bạn có chắc muốn xóa lịch phỏng vấn này?')) return;
    const success = await deleteEvent(eventId);
    if (success) {
      onClose();
      if (onStatusChange) setTimeout(() => onStatusChange(), 300);
    }
  };
  const handleSubmitEdit = (payload) => {
    updateEvent(payload.id, payload);
    setEditModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <img
                  src={
                    candidate.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      candidate.name || 'A'
                    )}&background=random`
                  }
                  alt={candidate.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{candidate.name}</h3>
                  <p className="text-sm text-slate-600">{candidate.position || job.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 p-1 -mr-1"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="px-6 border-b border-slate-200">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`-mb-px py-3 text-sm font-medium transition-colors ${
                    activeTab === 'personal'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Thông tin cá nhân
                </button>
                <button
                  onClick={() => setActiveTab('experience')}
                  className={`-mb-px py-3 text-sm font-medium transition-colors ${
                    activeTab === 'experience'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Kinh nghiệm làm việc
                </button>
                <button
                  onClick={() => setActiveTab('interview')}
                  className={`-mb-px py-3 text-sm font-medium transition-colors ${
                    activeTab === 'interview'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Lịch phỏng vấn{' '}
                  {myEvents.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-blue-600 text-white font-semibold">
                      {myEvents.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`-mb-px py-3 text-sm font-medium transition-colors ${
                    activeTab === 'attachments'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tài liệu đính kèm
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {activeTab === 'personal' && (
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">
                        Thông tin liên hệ
                      </h4>
                      <div className="space-y-4">
                        <DetailItem icon={<EmailIcon />} label="Email">
                          {candidate.email}
                        </DetailItem>
                        <DetailItem icon={<PhoneIcon />} label="Số điện thoại">
                          {candidate.phone}
                        </DetailItem>
                        <DetailItem icon={<LocationIcon />} label="Địa chỉ">
                          {profile.address}
                        </DetailItem>
                        <DetailItem icon={<CalendarIcon />} label="Ngày sinh">
                          {fmtDate(profile.dob)}
                        </DetailItem>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">
                        Học vấn & Kinh nghiệm
                      </h4>
                      <div className="space-y-4">
                        <DetailItem icon={<GraduationCapIcon />} label="Trình độ học vấn">
                          {profile.educationLevel}
                        </DetailItem>
                        <DetailItem icon={<BriefcaseIcon />} label="Kinh nghiệm">
                          {profile.experienceLevel}
                        </DetailItem>
                        <DetailItem icon={<DollarIcon />} label="Mức lương mong muốn">
                          {fmtCurrency(profile.desiredSalary)}
                        </DetailItem>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">Kỹ năng</h4>
                      {Array.isArray(skills) && skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 text-sm font-medium rounded-md bg-sky-100 text-sky-800 border border-sky-200"
                            >
                              {skill.name}
                              {skill.level ? ` - ${String(skill.level).toUpperCase()}` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Chưa cập nhật kỹ năng.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'experience' && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">
                    Kinh nghiệm làm việc
                  </h4>
                  {workExps.length > 0 ? (
                    <div className="space-y-6">
                      {workExps.map((exp, idx) => (
                        <div
                          key={idx}
                          className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="font-semibold text-slate-900">
                            {exp.title || `Kinh nghiệm #${idx + 1}`}
                          </div>
                          {exp.description ? (
                            looksLikeHtml(exp.description) ? (
                              <div
                                className="mt-2 prose prose-sm max-w-none text-slate-700"
                                dangerouslySetInnerHTML={{ __html: exp.description }}
                              />
                            ) : (
                              <div className="mt-2 text-slate-700 whitespace-pre-wrap">
                                {exp.description}
                              </div>
                            )
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      Chưa cập nhật kinh nghiệm làm việc.
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'attachments' && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">
                    Tài liệu đính kèm
                  </h4>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="text-sm text-slate-700">
                      {cvObj?.fileName ? (
                        <span>
                          CV: <span className="font-medium">{cvObj.fileName}</span>
                        </span>
                      ) : (
                        <span>Không có CV đính kèm</span>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={onViewCv}
                        disabled={!cvObj}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          cvObj
                            ? 'hover:bg-slate-50 text-slate-800'
                            : 'opacity-60 cursor-not-allowed text-slate-400'
                        }`}
                        title={cvObj ? 'Xem CV đính kèm' : 'Không có CV đính kèm'}
                      >
                        <Download className="w-4 h-4" />
                        Xem CV đính kèm
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'interview' && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2">
                    Lịch phỏng vấn
                  </h4>
                  {myEvents.length ? (
                    <ul className="space-y-3">
                      {myEvents.map((ev) => (
                        <li
                          key={ev.id}
                          className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium text-slate-900">{ev.title}</div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(ev);
                                }}
                                className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(ev.id);
                                }}
                                className="p-1.5 rounded hover:bg-rose-100 text-rose-600 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{ev.dateKey}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ClockIcon className="w-4 h-4" />
                              <span>{ev.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <LocationIcon className="w-4 h-4" />
                              <span>{ev.location || '—'}</span>
                            </div>
                            <div>
                              <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                                {ev.mode === 'online'
                                  ? 'Online'
                                  : ev.mode === 'offline'
                                  ? 'Offline'
                                  : '—'}
                              </span>
                            </div>
                          </div>
                          {ev.note && (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-sm text-slate-500">
                              <strong>Ghi chú:</strong> {ev.note}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-10">
                      <div className="text-slate-400 mb-2">
                        <CalendarIcon className="w-12 h-12 mx-auto opacity-50" />
                      </div>
                      <div className="text-sm text-slate-500">Chưa có lịch phỏng vấn.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {editModalOpen && (
        <InterviewFormModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingEvent(null);
          }}
          defaultDateKey={editingEvent?.dateKey}
          onSubmit={(payload) => handleSubmitEdit(payload)}
          applications={[]}
          editEvent={editingEvent}
        />
      )}
    </>
  );
}

const AcceptedListTab = () => {
  const { openWithApplication } = useEmployerChat();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [hireLoadingId, setHireLoadingId] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const { reloadTrigger, clearEventsByApplication } = useInterview();

  const getAcceptedAt = (a) => {
    if (a.acceptedAt) return a.acceptedAt;
    try {
      const hist = JSON.parse(a.statusHistory || '[]');
      for (let i = hist.length - 1; i >= 0; i--)
        if (hist[i]?.to === 'shortlisted') return hist[i].at;
    } catch {}
    return a.updatedAt || a.createdAt || null;
  };
  const getHiredAt = (a) => {
    if (a.hiredAt) return a.hiredAt;
    try {
      const hist = JSON.parse(a.statusHistory || '[]');
      for (let i = hist.length - 1; i >= 0; i--)
        if (hist[i]?.to === 'accepted') return hist[i].at;
    } catch {}
    return null;
  };
  const getInterviewedAt = (a) => {
    if (a.interviewedAt) return a.interviewedAt;
    try {
      const hist = JSON.parse(a.statusHistory || '[]');
      for (let i = hist.length - 1; i >= 0; i--)
        if (hist[i]?.to === 'interviewed') return hist[i].at;
    } catch {}
    return null;
  };

  const loadData = async () => {
    setLoading(true);
    setErr('');
    try {
      const [shortlistedRes, interviewedRes, acceptedRes] = await Promise.all([
        applicationService.getApplications({ status: 'shortlisted', limit: 300 }),
        applicationService.getApplications({ status: 'interviewed', limit: 300 }),
        applicationService.getApplications({ status: 'accepted', limit: 300 }),
      ]);

      const allList = [
        ...(shortlistedRes?.data?.data || shortlistedRes?.data || []),
        ...(interviewedRes?.data?.data || interviewedRes?.data || []),
        ...(acceptedRes?.data?.data || acceptedRes?.data || []),
      ];

      setItems(
        allList.map((a) => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt,
          acceptedAt: getAcceptedAt(a),
          interviewedAt: getInterviewedAt(a),
          hiredAt: getHiredAt(a),
          candidate: a.candidate || {},
          job: a.job || {},
          cv: a.cv || null,
          statusHistory: a.statusHistory || '[]',
        }))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || 'Không tải được danh sách ứng viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reloadTrigger]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = items.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setDetailModalOpen(true);
  };
  const handleStatusChange = () => {
    loadData();
  };
  const handleHire = async (id) => {
    if (!window.confirm('Xác nhận trúng tuyển ứng viên này?')) return;
    setHireLoadingId(id);
    try {
      await applicationService.updateApplicationStatus(id, 'accepted');
      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: 'accepted', hiredAt: new Date().toISOString() } : x
        )
      );
      toast.success('Đã chuyển sang trạng thái "Đã nhận"');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Cập nhật thất bại.');
    } finally {
      setHireLoadingId(null);
    }
  };
  const handleCancel = async (application) => {
    if (!window.confirm('Xác nhận TỪ CHỐI và hủy lịch phỏng vấn?')) return;
    setCancelLoadingId(application.id);
    try {
      clearEventsByApplication?.(application.id);
      await applicationService.updateApplicationStatus(application.id, CANCEL_TARGET_STATUS);
      setItems((prev) => prev.filter((x) => x.id !== application.id));
      toast.success('Đã hủy lịch và từ chối ứng viên.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Hủy thất bại.');
    } finally {
      setCancelLoadingId(null);
    }
  };

  const handleChat = (application) => {
    openWithApplication(application);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'shortlisted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Đã mời (chờ xếp lịch)
          </span>
        );
      case 'interviewed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Đã có lịch phỏng vấn
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã nhận
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="grid grid-cols-[2fr,1.5fr,1fr,1fr,2.8fr] gap-4 text-xs font-semibold text-slate-500 bg-slate-50/80 px-6 py-3 border-b border-slate-200 uppercase tracking-wider">
            <div>Ứng viên</div>
            <div>Vị trí</div>
            <div>Trạng thái</div>
            <div>Ngày</div>
            <div className="text-right">Thao tác</div>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-md" />
              ))}
            </div>
          ) : err ? (
            <div className="p-6 text-center text-amber-800 bg-amber-50">{err}</div>
          ) : pageItems.length === 0 ? (
            <div className="px-6 py-12 text-center flex flex-col items-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <BriefcaseIcon className="w-8 h-8 text-slate-300" />
              </div>
              <p>Chưa có ứng viên nào trong danh sách</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pageItems.map((it) => {
                const isAccepted = it.status === 'accepted';
                return (
                  <li
                    key={it.id}
                    className="grid grid-cols-[2fr,1.5fr,1fr,1fr,2.8fr] items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate text-sm">
                        {it.candidate?.name || 'Không tên'}
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                        <div
                          className="flex items-center gap-1.5 truncate"
                          title={it.candidate?.email}
                        >
                          <EmailIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{it.candidate?.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{it.candidate?.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium truncate max-w-full border border-slate-200">
                        {it.job?.title || '-'}
                      </span>
                    </div>
                    <div>{getStatusBadge(it.status)}</div>
                    <div className="text-sm text-slate-600 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      {fmtDate(it.acceptedAt) || '-'}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {/* Chat */}
                      <button
                        onClick={() => handleChat(it)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Nhắn tin"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {/* Chi tiết */}
                      <button
                        onClick={() => handleViewDetails(it)}
                        className="h-8 px-3 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-sm transition-colors"
                      >
                        Chi tiết
                      </button>

                      {!isAccepted ? (
                        <>
                          {/* Trúng tuyển */}
                          <button
                            onClick={() => handleHire(it.id)}
                            disabled={hireLoadingId === it.id}
                            className="h-8 px-3 rounded-md text-xs font-medium text-white shadow-sm flex items-center gap-1 transition-colors bg-emerald-600 hover:bg-emerald-700"
                            title="Xác nhận trúng tuyển"
                          >
                            {hireLoadingId === it.id ? (
                              <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></span>
                            ) : (
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                            )}
                            Trúng tuyển
                          </button>

                          {/* Hủy (từ chối luôn) */}
                          <button
                            onClick={() => handleCancel(it)}
                            disabled={cancelLoadingId === it.id}
                            className="h-8 px-3 rounded-md bg-rose-50 text-rose-600 text-xs font-medium border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            {cancelLoadingId === it.id ? '...' : 'Hủy'}
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-end justify-center min-w-[90px]">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Đã nhận
                          </span>
                          {it.hiredAt && (
                            <span className="text-[10px] text-slate-400 mt-1 font-medium tracking-tight">
                              Ngày: {fmtDate(it.hiredAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 grid place-items-center rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 bg-white text-slate-600"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
            >
              ‹
            </button>
            <span className="text-sm font-medium text-slate-600 px-2">Trang {pageSafe}</span>
            <button
              className="h-8 w-8 grid place-items-center rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 bg-white text-slate-600"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
            >
              ›
            </button>
          </div>
        )}
        <CandidateDetailModal
          open={isDetailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          application={selectedApplication}
          onStatusChange={handleStatusChange}
        />
      </div>
    </>
  );
};

const InterviewTab = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState('month');
  const [todayKey, setTodayKey] = useState(toKey(new Date()));
  const { events, addEvent, reloadTrigger } = useInterview();
  const [appOptions, setAppOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [defaultDateKey, setDefaultDateKey] = useState(toKey(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTodayKey(toKey(new Date())), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Lấy các ứng viên đã mời (shortlisted) nhưng chưa có lịch trong calendar
        const res = await applicationService.getApplications({ status: 'shortlisted', limit: 300 });
        const list = res?.data?.data || res?.data || [];
        const existingAppIds = new Set(events.map((e) => e.applicationId));
        const availableApps = list.filter((a) => !existingAppIds.has(a.id));
        const opts = availableApps.map((a) => ({
          id: a.id,
          label: `${a.candidate?.name || a.candidate?.email || 'Ứng viên'} • ${
            a.job?.title || 'Vị trí'
          }`,
          name: a.candidate?.name || '',
          jobTitle: a.job?.title || '',
        }));
        if (alive) setAppOptions(opts);
      } catch (e) {
        console.error('Load applications for InterviewTab failed:', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [events, reloadTrigger]);

  const eventsByDay = useMemo(() => {
    const m = {};
    for (const e of events) {
      if (!m[e.dateKey]) m[e.dateKey] = [];
      m[e.dateKey].push(e);
    }
    return m;
  }, [events]);

  const openCreate = (key) => {
    setDefaultDateKey(key);
    setOpen(true);
  };
  const createRange = (aKey) => openCreate(aKey);
  const onSubmit = async (payload, action) => {
    if (action === 'create') {
      const success = await addEvent(payload);
      if (success) setOpen(false);
    }
  };
  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => cur - 2 + i);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Lịch phỏng vấn
          <span className="ml-2 text-xs text-slate-400">({events.length} lịch)</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="h-9 px-2 rounded-md border border-slate-300 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="h-9 px-2 rounded-md border border-slate-300 text-sm"
            disabled={view === 'year'}
          >
            {monthsVi.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={() => setView('month')}
            className={`h-9 px-3 rounded-md text-sm border ${
              view === 'month'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            Tháng
          </button>
          <button
            onClick={() => setView('year')}
            className={`h-9 px-3 rounded-md text-sm border ${
              view === 'year'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            Năm
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {view === 'month' ? (
          <MonthView
            year={year}
            month={month}
            todayKey={todayKey}
            eventsByDay={eventsByDay}
            onCreateRange={createRange}
          />
        ) : (
          <YearView year={year} todayKey={todayKey} eventsByDay={eventsByDay} />
        )}
      </div>
      <button
        onClick={() => openCreate(toKey(new Date()))}
        className="fixed right-6 bottom-6 z-40 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg grid place-items-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          appOptions.length > 0
            ? 'Tạo lịch phỏng vấn'
            : 'Không có ứng viên đã mời hoặc tất cả đã có lịch'
        }
        disabled={appOptions.length === 0}
      >
        <PlusIcon />
      </button>
      <InterviewFormModal
        open={open}
        onClose={() => setOpen(false)}
        defaultDateKey={defaultDateKey}
        onSubmit={onSubmit}
        applications={appOptions}
      />
    </div>
  );
};

function CandidatesContent() {
  const [active, setActive] = useState('list');

  return (
    <div className="w-full bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm ring-1 ring-slate-200">
      <div className="px-6 pt-6 pb-4">
        <div className="text-2xl font-semibold tracking-tight text-slate-900">
          Quản lý ứng viên
        </div>
        <div className="text-sm text-slate-500 mt-1">
          Logic: Hiển thị những ứng viên bạn đã mời (shortlisted), đã có lịch phỏng vấn (interviewed) và đã nhận (accepted).
        </div>
      </div>
      <Tabs active={active} onChange={setActive} />
      <div className="pb-6">
        {active === 'list' && (
          <div className="px-6 pt-4">
            <AcceptedListTab />
          </div>
        )}
        {active === 'interview' && (
          <div className="px-6 pt-4">
            <InterviewTab />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Candidates() {
  return (
    <InterviewProvider>
      <CandidatesContent />
    </InterviewProvider>
  );
}