import React, { useEffect, useMemo, useState } from 'react';
import api, { applicationService, cvService } from '../../services/api';
import { toast } from 'react-toastify';
import {
  X, Check, Download,
  Mail, Phone as PhoneIcon, MapPin, Briefcase,
  Search, ChevronLeft, ChevronRight, Award
} from 'lucide-react';

const API_ROOT = String(import.meta?.env?.VITE_API_URL || 'http://localhost:5001')
  .replace(/\/$/, '')
  .replace(/\/api$/i, '');

const toAbsoluteUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_ROOT}${u.startsWith('/') ? '' : '/'}${u}`;
};

const PROFILE_PATHS = (() => {
  const raw = import.meta?.env?.VITE_USER_DETAIL_PATHS;
  if (!raw) return [];
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
})();

const STATUS_FILTERS = [
  { value: 'all',       label: 'Tất cả trạng thái' },
  { value: 'new',       label: 'Mới' },
  { value: 'inprocess', label: 'Đang xử lý' },
];

const STATUS_GROUPS = {
  new:       ['pending', 'reviewing'],
  inprocess: ['shortlisted', 'interviewed'],
};

const mapStatus = (k) => ({
  pending: 'Chờ duyệt',
  reviewing: 'Đang xem',
  shortlisted: 'Sơ tuyển',
  interviewed: 'Phỏng vấn',
  accepted: 'Trúng tuyển',
  rejected: 'Từ chối',
}[k] || k);

const levelVi = (lv) => (
  lv === 'basic' ? 'Cơ bản' :
  lv === 'intermediate' ? 'Trung cấp' :
  lv === 'advanced' ? 'Cao cấp' :
  lv === 'expert' ? 'Thành thạo' : (lv || '')
);

const parseSkills = (skills) => {
  if (!skills) return [];

  if (typeof skills === 'string') {
    const str = skills.trim();
    if (!str) return [];
    try { return parseSkills(JSON.parse(str)); } catch {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  if (Array.isArray(skills)) {
    return skills
      .map((s) => {
        if (typeof s === 'string') return s.trim();
        if (s && typeof s === 'object') {
          const name = s.name || s.label || s.skill || '';
          const lv = levelVi(s.level || s.proficiency);
          return [name, lv ? `(${lv})` : ''].filter(Boolean).join(' ').trim();
        }
        return String(s || '').trim();
      })
      .filter(Boolean);
  }

  if (typeof skills === 'object') {
    return Object.entries(skills)
      .map(([k, v]) => [k, v ? `(${levelVi(v)})` : ''].filter(Boolean).join(' '))
      .filter(Boolean);
  }

  return [];
};

function parseListDeep(raw) {
  if (raw == null) return [];
  let v = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof v === 'string') {
      try { 
        v = JSON.parse(v); 
        continue; 
      } catch { 
        break; 
      }
    }
    break;
  }
  return Array.isArray(v) ? v : [];
}

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

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mo}/${yyyy}`;
};

const fmtSalary = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  try {
    return num.toLocaleString('vi-VN') + ' VND';
  } catch {
    return String(num) + ' VND';
  }
};

const genderVi = (g) => {
  const s = String(g || '').trim().toLowerCase();
  if (!s) return '—';
  if (['male', 'nam', 'm', '1'].includes(s)) return 'Nam';
  if (['female', 'nữ', 'nu', 'f', '2'].includes(s)) return 'Nữ';
  return 'Khác';
};

const maritalVi = (m) => {
  const s = String(m || '').trim().toLowerCase();
  if (!s) return '—';
  if (['single', 'doc than', 'độc thân', 'chua ket hon', '0'].includes(s)) return 'Độc thân';
  if (['married', 'da ket hon', 'đã kết hôn', '1'].includes(s)) return 'Đã kết hôn';
  return '—';
};

const firstOf = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '');

export default function EmployerCVs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingScores, setLoadingScores] = useState(false);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [active, setActive] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await applicationService.getApplications({ status: 'all', limit: 300 });
        const list = res?.data?.data || res?.data || [];

        const norm = list.map(a => {
          const cand = a.candidate || {};

          const candidate = {
            id: firstOf(cand.userId, cand.candidateId, cand.id, cand._id),
            name: firstOf(cand.name, [cand.firstName, cand.lastName].filter(Boolean).join(' '), 'Ứng viên'),
            email: firstOf(cand.email, cand.mail, ''),
            phone: firstOf(cand.phone, cand.mobile, ''),
            location: firstOf(cand.location, cand.city, cand.province, ''),
            address: firstOf(cand.address, cand.street, cand.fullAddress, ''),
            avatar: firstOf(cand.avatar, cand.photoUrl, ''),
            position: firstOf(cand.position, cand.title, ''),
            level: cand.level || '',
            workType: cand.workType || '',
            degree: firstOf(cand.degree, cand.education, ''),
            industry: cand.industry || '',
            category: firstOf(cand.jobCategory, cand.category, ''),
            experience: firstOf(cand.experienceBand, cand.experience, ''),
            expectedSalary: firstOf(cand.expectedSalary, cand.salary, ''),
            birthdate: firstOf(cand.birthdate, cand.dob, cand.dateOfBirth, null),
            gender: firstOf(cand.gender, cand.sex, ''),
            maritalStatus: firstOf(cand.maritalStatus, cand.relationshipStatus, ''),
            skills: cand.skills || [],
            cvUrl: firstOf(cand.cvUrl, cand.cv, null),
            cvName: firstOf(cand.cvName, 'CV.pdf'),
          };

          const cvFromInclude = a.cv ? {
            id: a.cv.id || a.cv._id,
            fileName: a.cv.fileName || a.cv.name || candidate.cvName,
            filePath: a.cv.filePath,
            url: a.cv.url ? toAbsoluteUrl(a.cv.url) : (a.cv.filePath ? toAbsoluteUrl(a.cv.filePath) : ''),
          } : null;

          const cvFromMeta = (!a.cv && (a.cvId || a.cvName || a.cvFilePath)) ? {
            id: a.cvId || null,
            fileName: a.cvName || candidate.cvName,
            filePath: a.cvFilePath || null,
            url: a.cvFilePath ? toAbsoluteUrl(a.cvFilePath) : '',
          } : null;

          const cvFromCandidate = (!cvFromInclude && !cvFromMeta && candidate.cvUrl)
            ? { id: null, fileName: candidate.cvName, filePath: candidate.cvUrl, url: toAbsoluteUrl(candidate.cvUrl) }
            : null;

          return {
            id: a.id || a._id,
            status: a.status || 'pending',
            createdAt: a.createdAt || a.appliedAt || a.createdAt,
            job: { id: a.job?.id || a.job?._id, title: a.job?.title, location: a.job?.location },
            candidate,
            coverLetter: a.coverLetter || '',
            statusHistory: a.statusHistory || '[]',
            cv: cvFromInclude || cvFromMeta || cvFromCandidate || null,
            aiScore: null,
          };
        });

        setItems(norm);
        loadScores(norm);
      } catch (e) {
        setError(e?.response?.data?.message || 'Không tải được danh sách CV/ứng viên.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadScores = async (applications) => {
    setLoadingScores(true);
    try {
      const withScores = await Promise.all(
        applications.map(async (app) => {
          try {
            const scoreRes = await api.get(`/applications/${app.id}/score`, {
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' },
            });
            return { 
              ...app, 
              aiScore: scoreRes.data?.data || null 
            };
          } catch (error) {
            console.warn(`Failed to get score for ${app.id}:`, error?.response?.status || error?.message);
            return { ...app, aiScore: null };
          }
        })
      );
      setItems(withScores);
      
      console.log('=== DEBUG: Tất cả CV sau khi load điểm ===');
      console.table(withScores.map(it => ({
        name: it.candidate?.name,
        score: it.aiScore?.scoreTotal || 0,
        missingMustHave: parseListDeep(it.aiScore?.missingMustHave || []).length,
        passed: it.aiScore && it.aiScore.scoreTotal >= 50
      })));
      
    } catch (e) {
      console.error('Load scores error:', e);
    } finally {
      setLoadingScores(false);
    }
  };

  const matched = useMemo(() => {
    const result = items.filter(it => {
      if (['shortlisted', 'interviewed', 'accepted'].includes(it.status)) return false;
      
      if (!it.aiScore) return false;
      const score = Number(it.aiScore.scoreTotal || 0);
      return score >= 50;
    });
    
    console.log('=== CV phù hợp (≥50% và chưa duyệt sơ tuyển) ===', result.length);
    return result;
  }, [items]);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    const result = matched.filter(it => {
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
    
    return result.sort((a, b) => {
      const scoreA = Number(a.aiScore?.scoreTotal || 0);
      const scoreB = Number(b.aiScore?.scoreTotal || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.candidate?.name || '').localeCompare(b.candidate?.name || '');
    });
  }, [matched, query, status]);

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

  const onDownloadCV = async (cvArg) => {
    try {
      const url = cvArg?.url || (cvArg?.filePath ? toAbsoluteUrl(cvArg.filePath) : '');
      if (url) {
        clickAnchor(url, cvArg?.fileName || 'CV.pdf', true);
        return;
      }
      if (cvArg?.id) {
        const res = await cvService.downloadCV(cvArg.id);
        const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
        clickAnchor(blobUrl, cvArg?.fileName || 'CV.pdf');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
      toast.info('Không tìm thấy CV đính kèm.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Tải CV thất bại');
    }
  };

  const updateStatus = async (appId, next) => {
    try {
      setUpdating(true);
      
      const targetStatus = next;
      
      const res = await applicationService.updateApplicationStatus(appId, targetStatus);
      const data = res?.data?.data || res?.data || {};
      
      setItems(prev =>
        prev.map(it =>
          it.id === appId ? { ...it, status: data.status || targetStatus, statusHistory: data.statusHistory || it.statusHistory } : it
        )
      );
      
      if (next === 'shortlisted') {
        toast.success('Đã duyệt sơ tuyển! Ứng viên được chuyển sang "Quản lý ứng viên"');
      } else {
        toast.success('Cập nhật trạng thái thành công');
      }
      setActive(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm ring-1 ring-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý hồ sơ ứng viên</div>
          <div className="text-sm text-slate-500 mt-1">
            Chỉ hiển thị ứng viên có điểm ≥ 50% và chưa được duyệt sơ tuyển
          </div>
        </div>
        {loadingScores && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Đang tải điểm AI...
          </div>
        )}
      </div>

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

      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700">
          <Award className="w-4 h-4" />
          <span className="font-medium">{matched.length}</span> ứng viên phù hợp
        </div>
        <div className="text-slate-500">
          Từ tổng số <span className="font-medium">{items.filter(it => !['shortlisted','interviewed','accepted'].includes(it.status)).length}</span> hồ sơ chưa xử lý
        </div>
      </div>

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
            {loadingScores 
              ? 'Đang tải điểm AI...' 
              : filtered.length === 0 && matched.length > 0
              ? 'Không tìm thấy ứng viên theo từ khóa tìm kiếm.'
              : 'Không có ứng viên phù hợp (điểm ≥ 50%) chưa được xử lý.'
            }
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

      <div className="mt-6 flex items-center justify-end text-sm text-slate-600">
        <div className="flex items-center gap-4">
          <div>Tổng {filtered.length} hồ sơ phù hợp</div>
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
          onDownload={() => onDownloadCV(active.cv)}
          onApprove={() => updateStatus(active.id, 'shortlisted')}
          updating={updating}
        />
      )}
    </div>
  );
}

function CVRow({ item, onOpen }) {
  const name = item.candidate?.name || 'Ứng viên';
  const email = item.candidate?.email || '—';
  const phone = item.candidate?.phone || '—';
  const address = item.candidate?.location || '—';
  const jobTitle = item.job?.title || '—';
  const jobLoc = item.job?.location || '';
  const status = item.status || 'pending';
  const score = item.aiScore?.scoreTotal || 0;

  const scoreColor =
    score >= 80 ? 'bg-green-50 text-green-700 ring-green-200' :
    score >= 70 ? 'bg-blue-50 text-blue-700 ring-blue-200' :
    score >= 60 ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' :
    'bg-gray-50 text-gray-700 ring-gray-200';

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
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-[17px] text-slate-900 truncate">{name}</div>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  {jobTitle}{jobLoc ? ` • ${jobLoc}` : ''}
                </span>
                <span className={pillStatus(status)}>{mapStatus(status)}</span>
                {item.aiScore && (
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ring-1 font-medium ${scoreColor}`}>
                    <Award className="w-3 h-3" />
                    {score}%
                  </span>
                )}
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

function DetailModal({ app, onClose, onDownload, onApprove, updating }) {
  const [full, setFull] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const base = app?.candidate || {};

  useEffect(() => {
    const candId = base?.id;
    if (!candId) { setFull(null); return; }
    if (!PROFILE_PATHS.length) { setFull(null); return; }

    let alive = true;

    const tryGet = async (path) => {
      try {
        const res = await api.get(path, { headers: { 'X-Silent-Error': '1' } });
        return res?.data?.data ?? res?.data ?? null;
      } catch (err) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    };

    (async () => {
      try {
        setLoadingFull(true);

        let found = null;
        for (const p of PROFILE_PATHS) {
          const clean = p.replace(/^\/+|\/+$/g, '');
          const data = await tryGet(`/${clean}/${candId}`);
          if (data) { found = data; break; }
        }

        if (!alive) return;

        if (found) {
          setFull({
            position: found.position || found.title || '',
            level: found.level || '',
            workType: found.workType || '',
            degree: found.degree || found.education || '',
            industry: found.industry || '',
            category: found.jobCategory || found.category || '',
            experience: found.experienceBand || found.experience || '',
            expectedSalary: found.expectedSalary ?? found.salary ?? '',
            location: found.location || found.city || '',
            address: found.address || '',
            birthdate: found.birthdate || found.dob || found.dateOfBirth || null,
            gender: found.gender || '',
            maritalStatus: found.maritalStatus || found.relationshipStatus || '',
            skills: found.skills,
          });
        } else {
          setFull(null);
        }
      } catch {
        setFull(null);
      } finally {
        if (alive) setLoadingFull(false);
      }
    })();

    return () => { alive = false; };
  }, [base?.id]);

  const c = useMemo(() => {
    return {
      name: base?.name || '',
      email: base?.email || '',
      phone: base?.phone || '',
      location: firstOf(full?.location, base?.location, ''),
      address: firstOf(full?.address, base?.address, ''),
      birthdate: firstOf(full?.birthdate, base?.birthdate, base?.dob, base?.dateOfBirth, null),
      gender: firstOf(full?.gender, base?.gender, base?.sex, ''),
      maritalStatus: firstOf(full?.maritalStatus, base?.maritalStatus, base?.relationshipStatus, ''),
      position: firstOf(full?.position, base?.position, base?.title, ''),
      level: firstOf(full?.level, base?.level, ''),
      workType: firstOf(full?.workType, base?.workType, ''),
      degree: firstOf(full?.degree, base?.degree, base?.education, ''),
      industry: firstOf(full?.industry, base?.industry, ''),
      category: firstOf(full?.category, base?.category, base?.jobCategory, ''),
      experience: firstOf(
        full?.experienceBand,
        full?.experience,
        base?.experienceBand,
        base?.experience,
        ''
      ),
      expectedSalary: firstOf(full?.expectedSalary, base?.expectedSalary, base?.salary, ''),
      skills: firstOf(full?.skills, base?.skills),
    };
  }, [base, full]);

  const skills = parseSkills(c?.skills);
  const hasCv = !!app?.cv;
  const dobStr = fmtDate(c?.birthdate);

  const score = app.aiScore?.scoreTotal || 0;
  const matchedSkills = parseListDeep(app.aiScore?.matchedSkills || []);
  const missingSkills = parseListDeep(app.aiScore?.missingSkills || []);
  const missingMustHave = parseListDeep(app.aiScore?.missingMustHave || []);

  const scoreColor =
    score >= 80 ? 'text-green-700' :
    score >= 70 ? 'text-blue-700' :
    score >= 60 ? 'text-yellow-700' :
    'text-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/50 backdrop-blur-sm overflow-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden mb-12">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur border-b">
          <div>
            <div className="text-lg font-semibold tracking-tight">Chi tiết hồ sơ ứng viên</div>
            <div className="text-xs text-slate-500">
              {loadingFull ? 'Đang đồng bộ thông tin cơ bản...' : 'Thông tin cá nhân & thông tin cơ bản'}
            </div>
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
          {app.aiScore && (
            <div className="mb-8 p-4 rounded-xl ring-1 ring-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-5 h-5 text-blue-600" />
                <div className="text-lg font-semibold text-slate-900">Đánh giá AI</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Điểm tổng</div>
                  <div className={`text-2xl font-bold ${scoreColor}`}>{score}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Kỹ năng phù hợp ({matchedSkills.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {matchedSkills.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {s}
                      </span>
                    ))}
                    {matchedSkills.length === 0 && <span className="text-xs text-slate-400">Không có</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">
                    Kỹ năng thiếu ({(missingMustHave.length > 0 ? missingMustHave : missingSkills).length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(missingMustHave.length > 0 ? missingMustHave : missingSkills).map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {s}
                      </span>
                    ))}
                    {(missingMustHave.length > 0 ? missingMustHave : missingSkills).length === 0 && (
                      <span className="text-xs text-slate-400">Không có</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden mb-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <Cell label="Họ và tên" value={c?.name} />
              <Cell label="Email" value={c?.email} />
              <Cell label="Số điện thoại" value={c?.phone} />
              <Cell label="Tỉnh/Thành phố" value={c?.location} />
              <Cell label="Địa chỉ" value={c?.address} />
              <Cell label="Ngày sinh" value={dobStr} />
              <Cell label="Giới tính" value={genderVi(c?.gender)} />
              <Cell label="Tình trạng hôn nhân" value={maritalVi(c?.maritalStatus)} />
            </div>
          </div>

          <div className="mb-8">
            <div className="text-lg font-semibold mb-3">Thông tin cơ bản</div>
            <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <Cell label="Chức danh (Vị trí mong muốn)" value={c?.position} />
                <Cell label="Cấp bậc hiện tại" value={c?.level} />
                <Cell label="Hình thức làm việc" value={c?.workType} />
                <Cell label="Bằng cấp cao nhất" value={c?.degree} />
                <Cell label="Lĩnh vực" value={c?.industry} />
                <Cell label="Ngành nghề" value={c?.category} />
                <Cell label="Kinh nghiệm làm việc" value={c?.experience} />
                <Cell label="Mức lương mong muốn" value={fmtSalary(c?.expectedSalary)} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-lg font-semibold mb-3">Kỹ năng</div>
            {skills.length ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    {typeof s === 'string' ? s : (s?.name || '')}
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
                      onClick={onApprove}
                      disabled={updating || ['shortlisted', 'interviewed', 'accepted'].includes(app.status)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" /> Duyệt sơ tuyển
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