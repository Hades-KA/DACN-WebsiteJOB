// client/src/pages/profile/Overview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Bookmark, Bell, TrendingUp, Calendar, MapPin, DollarSign, Building2,
} from 'lucide-react';

import api, { applicationService, notificationService, jobService } from '../../services/api';

/* ============== Helpers: URL & Logo ============== */
const API_ORIGIN = (api?.defaults?.baseURL || '').replace(/\/api\/?$/i, '');

const toAbsoluteUrl = (u) => {
  if (!u) return '';
  const s = String(u);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `${API_ORIGIN}${s}`;
  return s;
};

const pickLogo = (job = {}) => {
  const candidates = [
    job.companyLogo,
    job.logoUrl,
    job.logo,
    job.company_logo,
    job.companyLogoUrl,
    job.company?.logoUrl,
    job.company?.logo,
    job.employer?.logoUrl,
    job.image,
  ];
  for (const u of candidates) {
    if (u && String(u).trim()) return toAbsoluteUrl(u);
  }
  return '';
};

async function withConcurrency(list, limit, worker) {
  const ret = new Array(list.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++;
      ret[idx] = await worker(list[idx], idx);
    }
  });
  await Promise.all(runners);
  return ret;
}

/* ============== UI: Logo component ============== */
function Logo({ src, alt }) {
  const [error, setError] = useState(false);
  // Điều chỉnh size logo một chút để cân đối hơn khi căn giữa: w-20 h-20 hoặc w-16 h-16
  const sizeClasses = "w-20 h-20"; 

  if (!src || error) {
    return (
      <div className={`${sizeClasses} rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center flex-shrink-0`}>
        <Building2 className="w-8 h-8 text-emerald-600" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || 'logo'}
      className={`${sizeClasses} rounded-lg object-contain border flex-shrink-0 bg-white p-1`}
      loading="lazy"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
}

/* ============== Page ============== */
export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [saved, setSaved] = useState([]);
  const [savedView, setSavedView] = useState([]);
  const [notis, setNotis] = useState([]);
  const [unsavingId, setUnsavingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [appsRes, savedRes, notiRes] = await Promise.allSettled([
          applicationService.getApplications({ limit: 1000 }),
          api.get('/saved-jobs'),
          notificationService.getNotifications({ limit: 100 }),
        ]);

        // Applications
        if (appsRes.status === 'fulfilled') {
          const list = appsRes.value?.data?.data || appsRes.value?.data || [];
          setApps(Array.isArray(list) ? list : []);
        }

        // Saved jobs
        if (savedRes.status === 'fulfilled') {
          const rawList = savedRes.value?.data?.data || savedRes.value?.data || [];
          const arr = Array.isArray(rawList) ? rawList : [];
          setSaved(arr);

          let normalized = arr.map((it, idx) => {
            const j = it?.job || it || {};
            const companyLogo = pickLogo(j);
            return {
              ...it,
              _idx: idx,
              savedId: it?.id || it?.savedId || null,
              job: { ...j, companyLogo },
            };
          });

          const needEnrich = normalized
            .map((it, i) => ({ it, i }))
            .filter(({ it }) => !it.job?.companyLogo && (it.job?.id || it.job?._id));

          if (needEnrich.length) {
            const enriched = await withConcurrency(needEnrich, 5, async ({ it, i }) => {
              try {
                const jobId = it.job.id || it.job._id;
                const resp = await jobService.getJobById(jobId);
                const jd = resp?.data?.data || resp?.data || {};
                const logo = pickLogo(jd);
                const patch = {
                  companyLogo: logo || it.job.companyLogo,
                  location: it.job.location || jd.location || '',
                  salary: it.job.salary || jd.salary || jd.salaryBand || 'Thoả thuận',
                  type: it.job.type || jd.type || '',
                  createdAt: it.job.createdAt || jd.createdAt || jd.publishedAt || it.job.created_at || null,
                };
                return { i, patch };
              } catch {
                return { i, patch: {} };
              }
            });

            enriched.forEach(({ i, patch }) => {
              normalized[i] = { ...normalized[i], job: { ...normalized[i].job, ...patch } };
            });
          }

          setSavedView(normalized);
        }

        // Notifications
        if (notiRes.status === 'fulfilled') {
          const list = notiRes.value?.data?.data || notiRes.value?.data || [];
          setNotis(Array.isArray(list) ? list : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Stats
  const appliedJobs = apps.length;
  const savedJobs = saved.length;
  const interviewInvites = useMemo(() => {
    const hasType = notis.some(n => n?.type);
    if (hasType) return notis.filter(n => String(n.type).toLowerCase().includes('invite')).length;
    return notis.filter(n => !n.read).length;
  }, [notis]);

  const recentApps = useMemo(() => {
    return [...apps]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
  }, [apps]);

  const recentSaved = useMemo(() => {
    return (savedView || []).slice(0, 3);
  }, [savedView]);

  const handleUnsave = async (item) => {
    const savedId = item?.id || item?.savedId;
    if (!savedId) return;
    try {
      setUnsavingId(savedId);
      await api.delete(`/saved-jobs/${savedId}`);
      setSaved(prev => prev.filter(x => (x.id || x.savedId) !== savedId));
      setSavedView(prev => prev.filter(x => (x.id || x.savedId) !== savedId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Bỏ lưu thất bại, vui lòng thử lại');
    } finally {
      setUnsavingId(null);
    }
  };

  const timeAgo = (d) => {
    if (!d) return '';
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return '';
    const diff = Date.now() - t;
    const day = Math.floor(diff / 86400000);
    if (day <= 0) return 'Hôm nay';
    if (day === 1) return '1 ngày trước';
    return `${day} ngày trước`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Briefcase className="w-6 h-6" />}
          label="Ứng tuyển"
          value={appliedJobs}
          loading={loading}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={<Bookmark className="w-6 h-6" />}
          label="Việc làm đã lưu"
          value={savedJobs}
          loading={loading}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={<Bell className="w-6 h-6" />}
          label="Thông báo mới"
          value={interviewInvites}
          loading={loading}
          gradient="from-violet-500 to-purple-600"
        />
      </div>

      {/* Ứng tuyển gần đây */}
      <Section title="Ứng tuyển gần đây" icon={<Briefcase className="w-5 h-5 text-blue-600" />}>
        {loading ? (
          <SkeletonRows />
        ) : recentApps.length === 0 ? (
          <Empty
            icon={<Briefcase className="w-12 h-12 text-gray-300" />}
            text="Chưa có đơn ứng tuyển"
            action={
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Tìm việc ngay
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {recentApps.map(a => (
              <div
                key={a.id}
                className="group p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {a.job?.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      {a.job?.company}
                    </span>
                    {a.job?.location && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {a.job?.location}
                        </span>
                      </>
                    )}
                    {a.createdAt && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Link
                  to={`/jobs/${a.job?.id}`}
                  className="ml-4 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-sm font-medium whitespace-nowrap"
                >
                  Xem chi tiết
                </Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* =================== CẬP NHẬT PHẦN NÀY =================== */}
      {/* Việc đã lưu gần đây - Layout Flexbox căn giữa */}
      <Section title="Việc đã lưu gần đây" icon={<Bookmark className="w-5 h-5 text-emerald-600" />}>
        {loading ? (
          <SkeletonRows />
        ) : recentSaved.length === 0 ? (
          <Empty
            icon={<Bookmark className="w-12 h-12 text-gray-300" />}
            text="Chưa có việc đã lưu"
            action={
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Khám phá việc làm
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {recentSaved.map((item) => {
              const job = item.job || item || {};
              const savedId = item?.id || item?.savedId;
              const jobId = job?.id || job?._id;
              const logoUrl = job.companyLogo || pickLogo(job);
              const companyName = job.company?.name || job.company || job.employer?.company || 'Công ty ẩn danh';

              return (
                // Thay đổi chính: Sử dụng flex items-center justify-between thay vì relative/absolute
                <div
                  key={savedId || jobId}
                  className="flex items-center justify-between bg-white border rounded-xl p-4 hover:shadow-md transition-all duration-200 group"
                >
                  {/* Bên trái: Logo + Thông tin */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Logo src={logoUrl} alt={companyName} />

                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="font-bold text-gray-900 text-lg truncate group-hover:text-emerald-600 transition-colors">
                        {job.title || 'Chưa có tiêu đề'}
                      </p>
                      <p className="text-sm text-gray-500 font-medium truncate">
                        {companyName}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-1">
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary || job.salaryBand || 'Thoả thuận'}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location || 'Không rõ'}
                        </span>
                        {job.createdAt && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-600 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {timeAgo(job.createdAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bên phải: Các nút bấm (Nằm trong luồng Flexbox, tự căn giữa) */}
                  <div className="flex items-center gap-3 ml-6 flex-shrink-0">
                    <Link
                      to={`/jobs/${jobId}`}
                      className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all text-sm font-semibold whitespace-nowrap"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnsave(item);
                      }}
                      disabled={unsavingId === savedId}
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                    >
                      {unsavingId === savedId ? '...' : 'Bỏ lưu'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ============== Sub components ============== */
function StatCard({ icon, label, value, loading, gradient }) {
  const bgClass = `bg-gradient-to-br ${gradient}`;
  return (
    <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
      <div className="relative p-6">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${bgClass} text-white shadow-lg mb-4`}>
          {icon}
        </div>
        <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
        <div className="text-3xl font-bold text-gray-900">
          {loading ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded" />
          ) : (
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{value}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          {icon}
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Empty({ icon, text, action }) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-gray-600 text-base font-medium">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}