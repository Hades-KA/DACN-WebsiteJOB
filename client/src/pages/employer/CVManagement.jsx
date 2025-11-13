import React, { useEffect, useMemo, useState } from 'react';
import { jobService, cvService } from '../../services/api';

const readUser = () => { 
  try { 
    return JSON.parse(localStorage.getItem('user')||'null'); 
  } catch { 
    return null; 
  } 
};

const pickFirst = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');
const pullCompanyId = (u) => {
  if (!u) return null;
  return pickFirst(
    u.companyId, u.companyID,
    u.company?.id,
    u.employer?.companyId,
    u.profile?.companyId,
    u.userId, u.id, u.accountId, u.uid
  );
};

/* RÚT GỌN TRẠNG THÁI */
const STATUS_FILTERS = [
  { value: 'all',       label: 'Tất cả trạng thái' },
  { value: 'new',       label: 'Mới' },          
  { value: 'inprocess', label: 'Đang xử lý' },   
  { value: 'accepted',  label: 'Đã nhận' },      
  { value: 'rejected',  label: 'Từ chối' },      
];

const STATUS_GROUPS = {
  new:       ['pending','reviewing'],
  inprocess: ['shortlisted','interviewed'],
  accepted:  ['accepted'],
  rejected:  ['rejected'],
};

const mapStatus = (k) => ({
  pending: 'Chờ duyệt',
  reviewing: 'Đang xem',
  shortlisted: 'Chọn sơ bộ',
  interviewed: 'Phỏng vấn',
  accepted: 'Được nhận',
  rejected: 'Từ chối'
}[k] || k);

export default function EmployerCVs() {
  const [me] = useState(readUser() || {});
  const companyId = useMemo(() => pullCompanyId(me), [me]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      setLoading(true);
      setError('');
      try {
        const jobsRes = await jobService.getCompanyJobs(companyId, { active: 'all', limit: 100 });
        const jobs = jobsRes.data?.data || jobsRes.data || [];

        const allApps = [];
        for (const j of jobs) {
          try {
            const appRes = await jobService.getJobApplications(j.id);
            const apps = appRes.data?.data || appRes.data || [];

            apps.forEach(a => {
              const candidateName = a.candidate?.name || a.candidateName || a.name || 'Ứng viên';
              const candidateEmail = a.candidate?.email || a.email || a.candidateEmail || '';
              const candidatePhone = a.candidate?.phone || a.phone || '';
              const candidateLocation = a.candidate?.location || a.location || a.candidateLocation || '';
              const avatar = a.candidate?.avatar || '';

              allApps.push({
                id: a.id,
                status: a.status || 'pending',
                createdAt: a.createdAt || a.appliedAt,
                job: { id: j.id, title: j.title, location: j.location },
                candidate: { 
                  id: a.candidateId, 
                  name: candidateName, 
                  email: candidateEmail, 
                  phone: candidatePhone, 
                  location: candidateLocation, 
                  avatar 
                },
                cv: { 
                  id: a.cvId, 
                  fileName: a.cvName || a.cv?.fileName, 
                  filePath: a.cv?.filePath 
                },
              });
            });
          } catch (_) { /* bỏ qua job lỗi */ }
        }
        setItems(allApps);
      } catch (e) {
        setError(e?.response?.data?.message || 'Không tải được danh sách CV/ứng viên.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    return items.filter(it => {
      const okStatus =
        status === 'all'
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
  const pageItems = filtered.slice((pageSafe-1)*PAGE_SIZE, pageSafe*PAGE_SIZE);

  const onDownloadCV = async (cvId, fileName='cv.pdf') => {
    if (!cvId) return alert('CV không khả dụng');
    try {
      const r = await cvService.downloadCV(cvId);
      const blob = new Blob([r.data], { type: r.headers['content-type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName || 'cv.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.message || 'Tải CV thất bại');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
      <div className="text-2xl font-bold mb-3">Quản lý hồ sơ ứng viên</div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        {/* Ô tìm kiếm bên trái có icon 🔍 */}
        <div className="relative w-full sm:w-[320px] lg:w-[360px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
            className="w-full pl-9 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Tìm kiếm theo tên ứng viên"
            value={query}
            onChange={(e)=>{ setQuery(e.target.value); setPage(1); }}
            />
        </div>

        <select
            className="px-3 py-2 border rounded-md sm:w-[180px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={status}
            onChange={(e)=>{ setStatus(e.target.value); setPage(1); }}
        >
            {STATUS_FILTERS.map(o => (
            <option key={o.value} value={o.value}>
                {o.label}
            </option>
            ))}
        </select>
        </div>

      {/* Nội dung chính */}
      <div className="mt-2">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_,i)=>(<div key={i} className="h-[84px] rounded-xl bg-gray-100 animate-pulse" />))}
          </div>
        ) : error ? (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">{error}</div>
        ) : pageItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
            Không có CV nào phù hợp điều kiện lọc.
          </div>
        ) : (
          <div className="space-y-3">
            {pageItems.map((it)=>(
              <CVRow
                key={it.id}
                item={it}
                onDownload={()=>onDownloadCV(it.cv?.id, `${(it.candidate?.name||'cv')}.pdf`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination + Tổng CV ở góc phải */}
      <div className="mt-4 flex items-center justify-end text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div>Tổng {filtered.length} CV</div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 border rounded-md disabled:opacity-50"
              onClick={()=>setPage(p=>Math.max(1,p-1))}
              disabled={pageSafe<=1}
            >
              ‹
            </button>
            <span className="px-2">{pageSafe} / {totalPages}</span>
            <button
              className="px-2 py-1 border rounded-md disabled:opacity-50"
              onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
              disabled={pageSafe>=totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Row hiển thị 1 CV/Ứng viên */
function CVRow({ item, onDownload }) {
  const name = item.candidate?.name || 'Ứng viên';
  const email = item.candidate?.email || '—';
  const phone = item.candidate?.phone || '—';
  const address = item.candidate?.location || '—';
  const jobTitle = item.job?.title || '—';
  const jobLoc = item.job?.location || '';
  const status = item.status || 'pending';

  return (
    <div className="rounded-xl ring-1 ring-gray-200/60 p-3 bg-white">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={item.candidate?.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-gray-900 truncate">{name}</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
              {jobTitle}{jobLoc ? ` • ${jobLoc}` : ''}
            </span>
            <span className={cxStatus(status)}>{mapStatus(status)}</span>
          </div>

          <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
            <span className="truncate">{email}</span>
            <span className="truncate">{phone}</span>
            <span className="truncate">{address}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 border rounded-md hover:bg-gray-50"
            onClick={onDownload}
          >
            Tải CV
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return <img src={src} alt={name} className="w-12 h-12 rounded-full object-cover ring-1 ring-gray-200" />;
  }
  const letter = (name||'?').trim().charAt(0).toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full ring-1 ring-gray-200 bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold">
      {letter}
    </div>
  );
}

function cxStatus(s) {
  const base = 'text-xs px-2 py-0.5 rounded-full ring-1';
  switch (s) {
    case 'pending':     return `${base} bg-slate-50 text-slate-700 ring-slate-200`;
    case 'reviewing':   return `${base} bg-sky-50 text-sky-700 ring-sky-200`;
    case 'shortlisted': return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
    case 'interviewed': return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200`;
    case 'accepted':    return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    case 'rejected':    return `${base} bg-rose-50 text-rose-700 ring-rose-200`;
    default:            return `${base} bg-gray-50 text-gray-700 ring-gray-200`;
  }
}
