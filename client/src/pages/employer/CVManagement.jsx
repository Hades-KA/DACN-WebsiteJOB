import React, { useEffect, useMemo, useState } from 'react';
import { applicationService, cvService } from '../../services/api';
import { toast } from 'react-toastify';
import {
  X, Check, XCircle, Download,
  Mail, Phone as PhoneIcon, MapPin, Briefcase,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react';

/* Helpers: chuẩn hóa URL tuyệt đối cho filePath/url */
const API_ROOT = (import.meta?.env?.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');
const toAbsoluteUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_ROOT}${u.startsWith('/') ? '' : '/'}${u}`;
};

/* Bộ lọc trạng thái */
const STATUS_FILTERS = [
  { value: 'all',       label: 'Tất cả trạng thái' },
  { value: 'new',       label: 'Mới' },
  { value: 'inprocess', label: 'Đang xử lý' },
  { value: 'accepted',  label: 'Đã nhận' },
  { value: 'rejected',  label: 'Từ chối' },
];

const STATUS_GROUPS = {
  new:       ['pending', 'reviewing'],
  inprocess: ['shortlisted', 'interviewed'],
  accepted:  ['accepted'],
  rejected:  ['rejected'],
};

const mapStatus = (k) => ({
  pending: 'Chờ duyệt',
  reviewing: 'Đang xem',
  shortlisted: 'Chọn sơ bộ',
  interviewed: 'Phỏng vấn',
  accepted: 'Được nhận',
  rejected: 'Từ chối',
}[k] || k);

function pillStatus(s) {
  const base = 'text-[11px] px-2 py-0.5 rounded-full ring-1 font-medium';
  switch (s) {
    case 'pending':     return `${base} bg-blue-50 text-blue-700 ring-blue-200`;
    case 'reviewing':   return `${base} bg-sky-50 text-sky-700 ring-sky-200`;
    case 'shortlisted': return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
    case 'interviewed': return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200`;
    case 'accepted':    return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    case 'rejected':    return `${base} bg-rose-50 text-rose-700 ring-rose-200`;
    default:            return `${base} bg-gray-50 text-gray-700 ring-gray-200`;
  }
}

const parseSkills = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') {
    try { const p = JSON.parse(skills); if (Array.isArray(p)) return p; } catch {}
    return skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const fmtDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}`;
};

export default function EmployerCVs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('new'); // Mặc định hiển thị tab "Mới" để dễ thấy hiệu ứng
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [active, setActive] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Load tất cả đơn (server lọc theo employer từ token)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await applicationService.getApplications({ status: 'all', limit: 300 });
        const list = res?.data?.data || res?.data || [];
        const norm = list.map(a => {
          // CV từ include
          const cvFromInclude = a.cv ? {
            id: a.cv.id || a.cv._id,
            fileName: a.cv.fileName || a.cv.name,
            filePath: a.cv.filePath,
            url: a.cv.url ? toAbsoluteUrl(a.cv.url) : (a.cv.filePath ? toAbsoluteUrl(a.cv.filePath) : ''),
          } : null;
          // CV từ metadata trong application
          const cvFromMeta = (!a.cv && (a.cvId || a.cvName || a.cvFilePath)) ? {
            id: a.cvId || null,
            fileName: a.cvName || null,
            filePath: a.cvFilePath || null,
            url: a.cvFilePath ? toAbsoluteUrl(a.cvFilePath) : '',
          } : null;
          // Fallback CV từ hồ sơ ứng viên (users.cvUrl/cvName)
          const cvFromCandidate = (!cvFromInclude && !cvFromMeta && a.candidate?.cvUrl)
            ? { id: null, fileName: a.candidate.cvName || 'CV.pdf', filePath: a.candidate.cvUrl, url: toAbsoluteUrl(a.candidate.cvUrl) }
            : null;

          return {
            id: a.id || a._id,
            status: a.status || 'pending',
            createdAt: a.createdAt || a.appliedAt || a.createdAt,
            job: { id: a.job?.id || a.job?._id, title: a.job?.title, location: a.job?.location },
            candidate: {
              id: a.candidate?.id || a.candidate?._id,
              name: a.candidate?.name || 'Ứng viên',
              email: a.candidate?.email || '',
              phone: a.candidate?.phone || '',
              location: a.candidate?.location || '',
              avatar: a.candidate?.avatar || '',
              position: a.candidate?.position || '',
              about: a.candidate?.about || '',
              skills: a.candidate?.skills || [],
              experience: a.candidate?.experience || '',
              education: a.candidate?.education || '',
              cvUrl: a.candidate?.cvUrl || null,
              cvName: a.candidate?.cvName || null,
            },
            coverLetter: a.coverLetter || '',
            statusHistory: a.statusHistory || '[]',
            cv: cvFromInclude || cvFromMeta || cvFromCandidate || null,
          };
        });
        setItems(norm);
      } catch (e) {
        setError(e?.response?.data?.message || 'Không tải được danh sách CV/ứng viên.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    return items.filter(it => {
      const okStatus = status === 'all'
        ? true
        : (STATUS_GROUPS[status] ? STATUS_GROUPS[status].includes(it.status) : it.status === status);
      if (!okStatus) return false;
      if (!q) return true;
      const hay = [
        it.candidate?.name, it.candidate?.email, it.candidate?.phone,
        it.candidate?.location, it.job?.title, it.job?.location
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const clickAnchor = (href, fileName, newTab = false) => {
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    if (fileName) a.download = fileName.replace(/\s+/g, '_');
    if (newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  
  const onDownloadCV = async (cvArg, candidateId) => {
    // ... (Giữ nguyên logic tải CV của bạn)
  };

  // ++ HÀM ĐƯỢC SỬA ++
  const updateStatus = async (appId, next) => {
    try {
      setUpdating(true);
      const res = await applicationService.updateApplicationStatus(appId, next);
      const data = res?.data?.data || res?.data || {};
      
      // Cập nhật lại status của item trong danh sách tổng
      setItems(prev => prev.map(it => it.id === appId ? { ...it, status: data.status, statusHistory: data.statusHistory || it.statusHistory } : it));
      
      // Không cần cập nhật `active` vì nó sẽ được đóng ngay sau đây
      // setActive(prev => prev ? { ...prev, status: data.status, statusHistory: data.statusHistory || prev.statusHistory } : prev);
      
      toast.success('Cập nhật trạng thái thành công');
      
      // ++ SỬA LỖI: Tự động đóng Modal sau khi cập nhật thành công ++
      // Điều này sẽ làm người dùng thấy ngay danh sách đã được làm mới ở phía sau.
      setActive(null);

    } catch (e) {
      toast.error(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm ring-1 ring-slate-200 p-6">
      <div className="text-2xl font-semibold mb-4 tracking-tight text-slate-900">Quản lý hồ sơ ứng viên</div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative w-full sm:w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white ring-1 ring-slate-200 shadow-inner placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Tìm kiếm theo tên/email/số điện thoại"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="px-3 py-2 rounded-lg bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition sm:w-[220px]"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_FILTERS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[96px] rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">{error}</div>
        ) : pageItems.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg">
            Không có CV nào phù hợp điều kiện lọc.
          </div>
        ) : (
          <div className="space-y-3">
            {pageItems.map((it) => (
              <CVRow
                key={it.id}
                item={it}
                onOpen={() => setActive(it)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-end text-sm text-slate-600">
        <div className="flex items-center gap-4">
          <div>Tổng {filtered.length} hồ sơ</div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">{pageSafe} / {totalPages}</span>
            <button
              className="px-2 py-1 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {active && (
        <DetailModal
          app={active}
          onClose={() => setActive(null)}
          onDownload={() => onDownloadCV(active.cv, active.candidate?.id)}
          onAccept={() => updateStatus(active.id, 'accepted')}
          onReject={() => updateStatus(active.id, 'rejected')}
          updating={updating}
        />
      )}
    </div>
  );
}

/* Các component con CVRow, Avatar, Cell, DetailModal giữ nguyên như trong file của bạn */
/* ... */
function CVRow({ item, onOpen }) {
  const name = item.candidate?.name || 'Ứng viên';
  const email = item.candidate?.email || '—';
  const phone = item.candidate?.phone || '—';
  const address = item.candidate?.location || '—';
  const jobTitle = item.job?.title || '—';
  const jobLoc = item.job?.location || '';
  const status = item.status || 'pending';

  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 p-4 hover:shadow-md transition cursor-pointer"
      onClick={onOpen}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition" />
      <div className="flex items-start gap-4">
        <Avatar name={name} src={item.candidate?.avatar} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-[17px] text-slate-900 truncate">{name}</div>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  {jobTitle}{jobLoc ? ` • ${jobLoc}` : ''}
                </span>
                <span className={pillStatus(status)}>{mapStatus(status)}</span>
              </div>

              <div className="mt-2 text-sm text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-inner outline outline-1 outline-slate-200"
      />
    );
  }
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-700 flex items-center justify-center font-semibold text-lg ring-2 ring-white outline outline-1 outline-slate-200">
      {letter}
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 text-slate-900 font-medium min-h-[20px]">{value || '—'}</div>
    </div>
  );
}

function DetailModal({ app, onClose, onDownload, onAccept, onReject, updating }) {
  const c = app?.candidate || {};
  const skills = parseSkills(c?.skills);
  let history = [];
  try { history = JSON.parse(app?.statusHistory || '[]'); } catch { history = []; }

  const hasCv = !!app?.cv;
  const dob = c?.dob ? new Date(c.dob) : null;
  const dobStr = dob ? `${dob.getDate()}/${dob.getMonth() + 1}/${dob.getFullYear()}` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur border-b">
          <div>
            <div className="text-lg font-semibold tracking-tight">Chi tiết hồ sơ ứng viên</div>
            <div className="text-xs text-slate-500">Thông tin cá nhân & chuyên môn</div>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[80vh] overflow-auto">
          {/* Cá nhân */}
          <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden mb-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <Cell label="Họ và tên" value={c?.name} />
              <Cell label="Email" value={c?.email} />
              <Cell label="Số điện thoại" value={c?.phone} />
              <Cell label="Địa chỉ" value={c?.location} />
              <Cell label="Ngày sinh" value={dobStr} />
              <Cell label="Giới tính" value={c?.gender} />
            </div>
          </div>

          {/* Chuyên môn */}
          <div className="mb-8">
            <div className="text-lg font-semibold mb-3">Thông tin chuyên môn</div>
            <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <Cell label="Vị trí mong muốn" value={c?.position} />
                <Cell label="Kinh nghiệm" value={c?.experience} />
                <Cell label="Học vấn" value={c?.education} />
                <Cell label="Thư giới thiệu" value={app?.coverLetter || '—'} />
              </div>
            </div>
          </div>

          {/* Kỹ năng + Tải CV */}
          <div className="mb-8">
            <div className="text-lg font-semibold mb-3">Kỹ năng</div>
            {skills.length ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Chưa cập nhật kỹ năng</div>
            )}

            <div className="mt-4">
              <button
                onClick={onDownload}
                disabled={!hasCv}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasCv ? 'hover:bg-slate-50 text-slate-800' : 'opacity-60 cursor-not-allowed text-slate-400'
                }`}
                title={hasCv ? 'Tải CV đính kèm' : 'Không có CV đính kèm'}
              >
                <Download className="w-4 h-4" /> Tải CV đính kèm
              </button>
            </div>
          </div>

          {/* Lịch sử ứng tuyển */}
          <div className="mb-2">
            <div className="text-lg font-semibold mb-3">Lịch sử ứng tuyển</div>

            <div className="flex items-start gap-3">
              <div className="relative pt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      {app.job?.title || 'Vị trí'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Trạng thái: <span className="text-blue-600 font-medium">{mapStatus(app.status)}</span>
                    </div>
                    <div className="text-sm text-slate-400">Ngày ứng tuyển: {fmtDateTime(app.createdAt)}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onAccept}
                      disabled={updating || app.status === 'accepted'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Chấp nhận
                    </button>
                    <button
                      onClick={onReject}
                      disabled={updating || app.status === 'rejected'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              let history = [];
              try { history = JSON.parse(app?.statusHistory || '[]'); } catch { history = []; }
              return history.length > 0 ? history.map((h, i) => (
                <div key={i} className="mt-4 flex items-start gap-3">
                  <div className="relative pt-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{h.title || app.job?.title}</div>
                    <div className="text-sm text-slate-600">
                      Trạng thái: {mapStatus(h.to)} • {fmtDateTime(h.at)}
                    </div>
                  </div>
                </div>
              )) : null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}