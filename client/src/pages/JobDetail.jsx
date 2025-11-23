import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { jobService, cvService, applicationService, userService } from '../services/api';
import {
  MapPin,
  DollarSign,
  CalendarDays,
  Building,
  Heart,
  FileText,
  Info,
  ListChecks,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { toast } from 'react-toastify';

const typeViMap = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  contract: 'Hợp đồng',
  intern: 'Thực tập',
};

const FALLBACK_LOGO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%23ffffff"/><rect x="6" y="6" width="52" height="52" rx="12" fill="%23f4f4f5"/><path d="M22 44h20v2H22zM24 26h16v14H24zM22 22h20v4H22z" fill="%23c7c9d1"/></svg>';

const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('vi-VN');
};

function getLogoUrl(job = {}) {
  const candidates = [
    job.companyLogo,
    job.logoUrl,
    job.logo,
    job.company_logo,
    job.companyLogoUrl,
    job.employer?.logoUrl,
    job.employer?.logo,
    job.company?.logoUrl,
    job.company?.logo,
    job.image,
  ];
  for (const u of candidates) {
    if (typeof u === 'string' && u.trim()) return u;
  }
  return '';
}

function normalizeJob(j, idx = 0) {
  return {
    id: j.id || j._id || `j-${idx}`,
    title: j.title || j.name || 'Vị trí chưa đặt tên',
    company: j.company || j.employer?.company || j.employer?.name || 'Công ty ẩn danh',
    companyLogo: j.companyLogo || j.employer?.logoUrl || '',
    location: j.location || 'Không rõ',
    salary: j.salary || j.salaryBand || 'Thoả thuận',
    type: j.type || 'full-time',
    createdAt: j.createdAt || j.publishedAt || '',
    category: j.category || '',
  };
}

function parseList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.filter(Boolean);
    } catch {}
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState('desc');

  const userRaw = localStorage.getItem('user');
  const currentUser = userRaw && userRaw !== 'undefined' && userRaw !== 'null' ? JSON.parse(userRaw) : null;
  const userType = currentUser?.userType || currentUser?.role;
  const currentUserId = currentUser?.id || currentUser?.userId || currentUser?._id || null;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await jobService.getJobById(id);
        const j = res.data?.data || res.data;
        if (!active) return;
        setJob(j);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được chi tiết công việc');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const uid = currentUserId;
        if (!job?.id || !uid) {
          if (active) setApplied(false);
          return;
        }

        const res = await applicationService.getApplications({
          jobId: job.id,
          limit: 1,
          page: 1,
        });

        const list = res?.data?.data || res?.data || [];
        if (active) setApplied(Array.isArray(list) && list.length > 0);
      } catch (e) {
        console.warn('check applied failed:', e?.response?.status, e?.response?.data || e?.message);
        if (active) setApplied(false);
      }
    })();
    return () => { active = false; };
  }, [job?.id, currentUserId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !job?.id) {
      setIsSaved(false);
      setSavedId(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await api.get('/saved-jobs');
        const list = res?.data?.data || res?.data || [];
        let found = null;
        if (Array.isArray(list)) {
          for (const it of list) {
            const j = it?.job || it || {};
            const jid = j.id || j._id;
            if (String(jid) === String(job.id)) { found = it; break; }
          }
        }
        if (active) {
          setIsSaved(!!found);
          setSavedId(found ? (found.id || found.savedId || found._id || null) : null);
        }
      } catch {
        if (active) { setIsSaved(false); setSavedId(null); }
      }
    })();
    return () => { active = false; };
  }, [job?.id]);

  useEffect(() => {
    if (!job?.category && !job?.location) return;
    let active = true;
    (async () => {
      try {
        setLoadingSimilar(true);
        let q = { limit: 8, sort: 'newest', exclude: job.id };
        if (job.category) q.category = job.category;
        if (job.location) q.location = job.location;

        let res = await jobService.getAllJobs(q);
        let list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        if (active && list.length > 0) { setSimilar(list.map(normalizeJob)); return; }

        if (job.category) {
          res = await jobService.getAllJobs({ category: job.category, limit: 8, sort: 'newest', exclude: job.id });
          list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
          if (active && list.length > 0) { setSimilar(list.map(normalizeJob)); return; }
        }

        res = await jobService.getAllJobs({ limit: 8, sort: 'newest', exclude: job.id });
        list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        if (active) setSimilar(list.map(normalizeJob));
      } catch {
        if (active) setSimilar([]);
      } finally {
        if (active) setLoadingSimilar(false);
      }
    })();
    return () => { active = false; };
  }, [job?.category, job?.location, job?.id]);

  const mustHaveSkills = useMemo(() => parseList(job?.mustHaveSkills), [job?.mustHaveSkills]);
  const niceToHaveSkills = useMemo(() => parseList(job?.niceToHaveSkills), [job?.niceToHaveSkills]);
  const fallbackSkills = useMemo(() => parseList(job?.skills), [job?.skills]);

  const innerFrameCls =
    'rounded-xl bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),inset_0_12px_30px_rgba(0,0,0,0.04),inset_0_-10px_24px_rgba(255,255,255,0.85)]';
  const softPanelStyle = {
    background: '#fff',
    borderRadius: 12,
    boxShadow:
      'inset 0 0 0 1px rgba(0,0,0,0.06), inset 0 8px 24px rgba(0,0,0,0.04), inset 0 -6px 16px rgba(255,255,255,0.7)',
  };

  const applyQuick = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    if (userType && userType !== 'candidate' && userType !== 'admin') {
      toast.info('Chỉ ứng viên mới được nộp đơn'); return;
    }
    if (applied) return;

    try {
      setApplying(true);

      let cvFromProfile = null;
      let candidateId = currentUserId;
      try {
        const pr = await userService.getProfile();
        const p = pr?.data?.data || pr?.data || {};
        if (p?.cvUrl) cvFromProfile = { cvUrl: p.cvUrl, cvName: p.cvName || 'CV.pdf' };
        if (!candidateId && p?.id) candidateId = p.id;
      } catch {}

      let cvFromService = null;
      try {
        const res = await cvService.getAllCVs();
        let items = res?.data?.data || res?.data || [];
        if (candidateId) {
          items = items.filter(cv =>
            String(cv.candidateId || cv.ownerId || cv.userId || '') === String(candidateId)
          );
        }
        if (items?.length) {
          items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
          const chosen = items[0];
          cvFromService = { cvId: chosen?.id, cvUrl: chosen?.url, cvName: chosen?.name || chosen?.fileName };
        }
      } catch {}

      const candidates = [];
      if (cvFromProfile?.cvUrl) candidates.push({ cvUrl: cvFromProfile.cvUrl, cvName: cvFromProfile.cvName });
      if (cvFromService?.cvId) candidates.push({ cvId: cvFromService.cvId });
      if (cvFromService?.cvUrl) candidates.push({ cvUrl: cvFromService.cvUrl, cvName: cvFromService.cvName });
      if (candidateId) candidates.push({ candidateId });
      candidates.push({});

      let success = false; let lastErr = null;
      for (const body of candidates) {
        try { await jobService.applyJob(id, body); success = true; break; }
        catch (e) { lastErr = e; }
      }
      if (!success) {
        const msg = lastErr?.response?.data?.message || 'Nộp ứng tuyển thất bại';
        if (/already/i.test(String(msg))) { setApplied(true); toast.info('Bạn đã nộp đơn cho công việc này trước đó'); }
        else toast.error(msg);
        return;
      }
      setApplied(true);
      toast.success('Đã nộp ứng tuyển thành công');
    } finally {
      setApplying(false);
    }
  };

  const toggleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      setSaving(true);
      if (!isSaved) {
        const res = await api.post('/saved-jobs', { jobId: job.id });
        const sv = res?.data?.data || res?.data || {};
        const sid = sv.id || sv.savedId || null;
        setIsSaved(true);
        if (sid) setSavedId(sid);
        toast.success('Đã lưu tin');
      } else {
        const delId = savedId || job.id;
        await api.delete(`/saved-jobs/${delId}`);
        setIsSaved(false);
        setSavedId(null);
        toast.info('Đã bỏ lưu');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thực hiện được, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-slate-600">Đang tải...</div>;
  if (error) return <div className="min-h-[50vh] flex items-center justify-center text-red-600">{error}</div>;
  if (!job) return null;

  const postedAt = job?.createdAt || job?.publishedAt || job?.postedAt || job?.created_at || job?.createdOn || null;
  const deadlineAt = job?.deadline || job?.expireDate || job?.expiresAt || job?.closingDate || job?.deadlineAt || job?.endDate || null;
  const isExpired = deadlineAt ? new Date(deadlineAt) < new Date() : false;

  const companyInfo = {
    name: job?.employer?.company || job?.company || '',
    address: job?.workAddress || job?.employer?.companyAddress || job?.contactAddress || '',
    phone: job?.employer?.phone || job?.contactPhone || '',
    email: job?.employer?.email || job?.contactEmail || '',
    website: job?.employer?.companyWebsite || '',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-7xl px-4 grid grid-cols-12 gap-6">
        {/* Main */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl bg-white p-2 shadow-[0_6px_18px_rgba(17,12,46,0.06)] mb-5">
            <div className={`${innerFrameCls} p-6`}>
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="w-24 h-24 min-w-[6rem] rounded-2xl bg-white overflow-hidden flex items-center justify-center shadow-[inset_0_2px_12px_rgba(0,0,0,0.07),inset_0_-2px_12px_rgba(255,255,255,0.8),inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                  <img
                    src={getLogoUrl(job) || FALLBACK_LOGO}
                    alt={job.company || 'Logo'}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_LOGO; }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-[22px] sm:text-2xl font-semibold text-slate-800 leading-tight">{job.title}</h1>
                    <div className="mt-0.5 text-[15px] text-slate-600 font-medium">{job.company}</div>
                  </div>

                  <div className="mt-3 text-[13px] text-slate-600">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        {job.location || 'Không rõ'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-fuchsia-600 ml-auto mr-14 md:mr-24 lg:mr-32">
                        <DollarSign className="w-4 h-4" />
                        {job.salary || job.salaryBand || 'Thoả thuận'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-500" />
                        <span>Ngày đăng: {postedAt ? formatDate(postedAt) : '-'}</span>
                      </span>
                      {deadlineAt && (
                        <>
                          <span className="text-slate-400">-</span>
                          <span className={`inline-flex items-center gap-1.5 ${isExpired ? 'text-rose-600 font-medium' : ''}`}>
                            {!isExpired && <CalendarDays className="w-4 h-4 text-slate-500" />}
                            <span>Hạn nộp: {formatDate(deadlineAt)}</span>
                          </span>
                          {isExpired && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200">
                              Hết hạn
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyQuick(); }}
                      disabled={applying || applied}
                      className={`px-4 py-2 rounded-xl text-white font-medium shadow-sm ${
                        applied ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:opacity-95'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 disabled:opacity-70`}
                    >
                      {applied ? 'Đã nộp đơn' : applying ? 'Đang nộp...' : 'Nộp đơn ngay'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(); }}
                      disabled={saving}
                      className={`px-4 py-2 rounded-xl border ${
                        isSaved ? 'border-fuchsia-200 text-fuchsia-600 bg-fuchsia-50/30' : 'border-gray-200 text-slate-700 hover:bg-slate-50'
                      } disabled:opacity-60`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                        {saving ? '...' : isSaved ? 'Đã lưu' : 'Lưu tin'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs card */}
          <div className="rounded-2xl bg-white p-2 shadow-[0_6px_18px_rgba(17,12,46,0.06)]">
            <div className={`${innerFrameCls}`}>
              {/* Tab bar - ĐÃ CĂN GIỮA (Desktop) & TRÁI (Mobile) + ẨN THANH CUỘN */}
              <div className="flex items-center justify-start md:justify-center gap-2 px-4 pt-3 border-b border-gray-100 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {[
                  { key: 'desc', label: 'Mô tả', icon: FileText },
                  { key: 'detail', label: 'Chi tiết công việc', icon: Info },
                  { key: 'skills', label: 'Kỹ năng yêu cầu', icon: ListChecks },
                  { key: 'company', label: 'Thông tin công ty & Liên hệ', icon: Building },
                ].map(({ key, label, icon: Icon }) => {
                  const active = tab === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setTab(key)}
                      className={`relative flex-none px-3 py-2 text-sm rounded-t-md transition-colors whitespace-nowrap ${
                        active ? 'text-violet-700 font-medium' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                      </span>
                      {active && (
                        <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-gradient-to-r from-fuchsia-500 to-violet-600 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-5 space-y-10">
                {/* Tab: Mô tả */}
                {tab === 'desc' && (
                  <div className="space-y-8">
                    {/* JD chi tiết (AI dùng) */}
                    {job.jdText ? (
                      <section>
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <h3 className="text-[17px] font-medium text-slate-800">Mô tả chi tiết (JD)</h3>
                        </div>
                        <div className="mt-3" style={softPanelStyle}>
                          <div className="p-4 text-[15px] text-slate-700 whitespace-pre-line">
                            {job.jdText}
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {/* Mô tả công việc */}
                    <section>
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <h3 className="text-[17px] font-medium text-slate-800">Mô tả công việc</h3>
                      </div>
                      <div className="mt-3" style={softPanelStyle}>
                        <div className="p-4 text-[15px] text-slate-700 whitespace-pre-line">
                          {job.description || '—'}
                        </div>
                      </div>
                    </section>

                    {/* Thông tin chi tiết */}
                    <section>
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Info className="w-4 h-4 text-slate-500" />
                        <h3 className="text-[17px] font-medium text-slate-800">Thông tin chi tiết</h3>
                      </div>
                      <div className="mt-3" style={softPanelStyle}>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12 text-[14px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Mã công việc:</span>
                            <span className="text-slate-800 font-medium">JOB-{String(job.id || '').slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Chức danh:</span>
                            <span className="text-slate-800 font-medium">{job.title}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Ngành nghề:</span>
                            <span className="text-slate-800 font-medium">{job.category || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Địa điểm:</span>
                            <span className="text-slate-800 font-medium">{job.location || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Loại công việc:</span>
                            <span className="text-slate-800 font-medium">{typeViMap[job.type] || job.type || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Mức lương:</span>
                            <span className="font-semibold text-fuchsia-600">{job.salary || job.salaryBand || 'Thoả thuận'}</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Yêu cầu công việc */}
                    <section>
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <ListChecks className="w-4 h-4 text-slate-500" />
                        <h3 className="text-[17px] font-medium text-slate-800">Yêu cầu công việc</h3>
                      </div>
                      <div className="mt-3" style={softPanelStyle}>
                        <div className="p-4 text-[15px] text-slate-700 whitespace-pre-line">
                          {job.requirements || '—'}
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* Tab: Chi tiết */}
                {tab === 'detail' && (
                  <>
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Info className="w-4 h-4 text-slate-500" />
                      <h3 className="text-[17px] font-medium text-slate-800">Thông tin chi tiết</h3>
                    </div>
                    <div style={softPanelStyle} className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12 text-[14px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Mã công việc:</span>
                          <span className="text-slate-800 font-medium">JOB-{String(job.id || '').slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Chức danh:</span>
                          <span className="text-slate-800 font-medium">{job.title}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Ngành nghề:</span>
                          <span className="text-slate-800 font-medium">{job.category || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Địa điểm:</span>
                          <span className="text-slate-800 font-medium">{job.location || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Loại công việc:</span>
                          <span className="text-slate-800 font-medium">{typeViMap[job.type] || job.type || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Mức lương:</span>
                          <span className="font-semibold text-fuchsia-600">{job.salary || job.salaryBand || 'Thoả thuận'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Tab: Kỹ năng */}
                {tab === 'skills' && (
                  <div className="space-y-4">
                    {mustHaveSkills.length > 0 ? (
                      <div style={softPanelStyle} className="p-4">
                        <div className="text-sm font-medium text-red-700 mb-2">Kỹ năng bắt buộc</div>
                        <div className="flex flex-wrap gap-2">
                          {mustHaveSkills.map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full shadow-inner">
                              {s}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          💡 <strong>Lưu ý:</strong> Tất cả kỹ năng trên đều là bắt buộc. Ứng viên thiếu kỹ năng sẽ bị trừ điểm khi AI chấm.
                        </p>
                      </div>
                    ) : (
                      <div style={softPanelStyle} className="p-4">
                        {fallbackSkills.length === 0 ? (
                          <div className="text-sm text-slate-500">Chưa có kỹ năng yêu cầu.</div>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-slate-700 mb-2">Kỹ năng yêu cầu</div>
                            <div className="flex flex-wrap gap-2">
                              {fallbackSkills.map((s, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full shadow-inner">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Thông tin công ty & Liên hệ */}
                {tab === 'company' && (
                  <section>
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Building className="w-4 h-4 text-slate-500" />
                      <h3 className="text-[17px] font-medium text-slate-800">Thông tin công ty & Liên hệ</h3>
                    </div>
                    <div className="mt-3" style={softPanelStyle}>
                      <div className="p-6 space-y-5">
                        {/* Company Name */}
                        {companyInfo.name && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[13px] uppercase tracking-wide text-slate-500 font-semibold">Công ty:</span>
                            <span className="text-[16px] font-medium text-slate-900">{companyInfo.name}</span>
                          </div>
                        )}

                        {/* Address */}
                        {companyInfo.address && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[13px] uppercase tracking-wide text-slate-500 font-semibold">Địa chỉ:</span>
                            <div className="text-[15px] text-slate-900 leading-relaxed">{companyInfo.address}</div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyInfo.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
                            >
                              <MapPin className="w-4 h-4" />
                              Xem chỉ đường trên Google Maps
                            </a>
                          </div>
                        )}

                        {/* Location */}
                        {job?.location && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[13px] uppercase tracking-wide text-slate-500 font-semibold">Khu vực:</span>
                            <span className="text-[15px] text-slate-900">{job.location}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Phone */}
                          {companyInfo.phone && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] uppercase tracking-wide text-slate-500 font-semibold">Điện thoại:</span>
                              <a
                                href={`tel:${(companyInfo.phone || '').replace(/\s/g, '')}`}
                                className="flex items-center gap-2 text-[15px] text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <Phone className="w-4 h-4" />
                                {companyInfo.phone}
                              </a>
                            </div>
                          )}

                          {/* Email */}
                          {companyInfo.email && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] uppercase tracking-wide text-slate-500 font-semibold">Email:</span>
                              <a
                                href={`mailto:${companyInfo.email}`}
                                className="flex items-center gap-2 text-[15px] text-blue-600 hover:text-blue-700 font-medium break-all"
                              >
                                <Mail className="w-4 h-4" />
                                {companyInfo.email}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Website */}
                        {companyInfo.website && (
                          <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                            <span className="text-[13px] uppercase tracking-wide text-slate-500 font-semibold mt-2">Website:</span>
                            <a
                              href={companyInfo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[15px] text-blue-600 hover:text-blue-700 font-medium break-all"
                            >
                              <Globe className="w-4 h-4" />
                              {companyInfo.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Việc tương tự */}
        <aside className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl bg-white p-2 shadow-[0_6px_18px_rgba(17,12,46,0.06)]">
            <div className={`${innerFrameCls} p-4`}>
              <h3 className="font-semibold text-slate-800 mb-3">Việc tương tự</h3>
              {loadingSimilar ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : similar.length === 0 ? (
                <div className="text-sm text-slate-500">Chưa có gợi ý phù hợp.</div>
              ) : (
                <ul className="space-y-3">
                  {similar.map((s) => {
                    const sLogo =
                      s.companyLogo || s.logoUrl || s.logo || s.company_logo || s.company?.logo || s.employer?.logoUrl || '';
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${s.id}`)}
                          className="w-full text-left flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                        >
                          <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center overflow-hidden shadow-[inset_0_1px_6px_rgba(0,0,0,0.08),inset_0_-1px_6px_rgba(255,255,255,0.75),inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                            <img
                              src={sLogo || FALLBACK_LOGO}
                              alt={s.company || 'Logo'}
                              className="w-full h-full object-contain p-1.5"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_LOGO; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{s.title}</p>
                            <p className="text-xs text-slate-500 truncate">{s.company}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                              <span>{s.location}</span>
                              <span className="text-fuchsia-600 font-semibold">{s.salary}</span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}