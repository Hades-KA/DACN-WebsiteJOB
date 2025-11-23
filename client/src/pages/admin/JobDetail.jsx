import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, jobService } from '../../services/api';
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  CalendarDays,
  Star,
  StarOff,
  Users,
  Mail,
  Phone,
} from 'lucide-react';

const typeViMap = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  contract: 'Hợp đồng',
  intern: 'Thực tập',
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('vi-VN');
};

// Hàm lấy ngày hết hạn từ nhiều trường có thể có
const getDeadline = (j) =>
  j?.deadline ||
  j?.expireDate ||
  j?.expiresAt ||
  j?.closingDate ||
  j?.deadlineAt ||
  j?.endDate ||
  null;

// Logic kiểm tra trạng thái (bao gồm hết hạn)
const getStatusInfo = (job) => {
  const dl = getDeadline(job);
  const now = new Date();
  
  // Ưu tiên check hết hạn trước
  if (dl) {
    const d = new Date(dl);
    // Set giờ về cuối ngày để so sánh chính xác hơn (tuỳ logic business)
    d.setHours(23, 59, 59, 999); 
    if (!Number.isNaN(d.getTime()) && d < now) return { label: 'Hết hạn', tone: 'expired' };
  }
  
  if (job?.isActive) return { label: 'Đang hiển thị', tone: 'active' };
  return { label: 'Đã ẩn', tone: 'inactive' };
};

const badgeClass = (tone) => {
  switch (tone) {
    case 'active':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'expired':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

export default function AdminJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [err, setErr] = useState('');

  const [updatingActive, setUpdatingActive] = useState(false);
  const [updatingFeatured, setUpdatingFeatured] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');

        // 1) Job detail
        const resJob = await jobService.getJobById(id);
        const j = resJob?.data?.data || resJob?.data || null;
        if (!alive) return;
        setJob(j);

        // 2) Applications của job
        try {
          const resApps = await jobService.getJobApplications(id);
          const list = resApps?.data?.data || resApps?.data || [];
          if (alive) setApps(Array.isArray(list) ? list : []);
        } catch {
          if (alive) setApps([]);
        }
      } catch (e) {
        if (alive) setErr(e?.response?.data?.message || 'Không tải được chi tiết tin tuyển dụng');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const postedAt = job?.createdAt || job?.publishedAt || job?.postedAt || null;
  const deadline = getDeadline(job);
  const status = getStatusInfo(job);
  const isExpired = status.tone === 'expired';

  const statusCounts = useMemo(() => {
    const init = {
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      interviewed: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const a of apps) {
      const k = String(a.status || '').toLowerCase();
      if (init[k] !== undefined) init[k] += 1;
    }
    return init;
  }, [apps]);

  const totalApps = useMemo(
    () =>
      statusCounts.pending +
      statusCounts.reviewing +
      statusCounts.shortlisted +
      statusCounts.interviewed +
      statusCounts.accepted +
      statusCounts.rejected,
    [statusCounts]
  );

  const recentApps = useMemo(() => {
    return [...apps]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10);
  }, [apps]);

  const toggleActive = async () => {
    if (!job) return;
    if (!window.confirm(job.isActive ? 'Ẩn tin tuyển dụng này?' : 'Duyệt/hiển thị tin tuyển dụng này?')) return;
    try {
      setUpdatingActive(true);
      await adminService.updateJobStatus(job.id, !job.isActive);
      setJob((prev) => ({ ...prev, isActive: !prev.isActive }));
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingActive(false);
    }
  };

  const toggleFeatured = async () => {
    if (!job) return;
    try {
      setUpdatingFeatured(true);
      await adminService.updateJobFeatured(job.id, !job.isFeatured);
      setJob((prev) => ({ ...prev, isFeatured: !prev.isFeatured }));
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật nổi bật thất bại');
    } finally {
      setUpdatingFeatured(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{err}</div>
        <button
          onClick={() => navigate('/admin/jobs')}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (!job) return null;

  const employer = job?.employer || {};
  const companyName = employer?.company || job.company || '—';
  const companyAddress = job?.workAddress || employer?.companyAddress || job.contactAddress || '';  
  const companyWebsite = employer?.companyWebsite || '';
  const employerPhone = employer?.phone || job.contactPhone || '';
  const employerEmail = employer?.email || job.contactEmail || '';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/jobs')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết tin tuyển dụng</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {String(job.id || '').slice(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFeatured}
            disabled={updatingFeatured}
            className={`px-3 py-2 rounded-lg border text-sm ${
              job.isFeatured
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {updatingFeatured ? '...' : job.isFeatured ? (
              <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> Bỏ nổi bật
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <StarOff className="w-4 h-4" /> Đánh dấu nổi bật
              </span>
            )}
          </button>

          <button
            onClick={toggleActive}
            disabled={updatingActive}
            className={`px-3 py-2 rounded-lg text-white text-sm ${
              job.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {updatingActive ? '...' : job.isActive ? 'Hủy duyệt' : 'Duyệt tin'}
          </button>
        </div>
      </div>

      {/* Job header card */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
            {employer?.logoUrl ? (
              <img src={employer.logoUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-10 h-10 text-gray-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold text-gray-900">{job.title}</div>
            <div className="text-sm text-gray-600 mt-1">{companyName}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 mt-5">
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Địa điểm" value={job.location || '—'} />
              <InfoItem
                icon={<DollarSign className="w-4 h-4" />}
                label="Mức lương"
                value={job.salary || job.salaryBand || 'Thoả thuận'}
              />
              <InfoItem icon={<Users className="w-4 h-4" />} label="Loại công việc" value={typeViMap[job.type] || job.type || '—'} />
              
              {/* Cập nhật hiển thị ngày tháng */}
              <InfoItem icon={<CalendarDays className="w-4 h-4" />} label="Ngày đăng" value={fmtDate(postedAt)} />
              
              {/* Highlight Hạn nộp nếu hết hạn */}
              <InfoItem 
                icon={<CalendarDays className="w-4 h-4" />} 
                label="Hạn nộp" 
                value={
                  <span className={isExpired ? "text-rose-600 font-bold" : ""}>
                    {fmtDate(deadline)} {isExpired && "(Đã hết hạn)"}
                  </span>
                } 
              />

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-500 min-w-[90px]">Trạng thái</div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badgeClass(status.tone)}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin công ty */}
      <section className="bg-white border rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Thông tin công ty</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="text-gray-500 min-w-[90px]">Công ty</div>
            <div className="font-medium text-gray-900">{companyName}</div>
          </div>

          {companyWebsite && (
            <div className="flex items-start gap-3">
              <div className="text-gray-500 min-w-[90px]">Website</div>
              <div>
                <a
                  href={companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {companyWebsite}
                </a>
              </div>
            </div>
          )}

          {companyAddress && (
            <div className="flex items-start gap-3 md:col-span-2">
              <div className="text-gray-500 min-w-[90px]">Địa chỉ</div>
              <div className="flex-1">
                <div className="text-gray-900 mb-1">{companyAddress}</div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <MapPin className="w-4 h-4" />
                  Xem trên Google Maps
                </a>
              </div>
            </div>
          )}

          {(employerPhone || employerEmail) && (
            <>
              {employerPhone && (
                <div className="flex items-start gap-3">
                  <div className="text-gray-500 min-w-[90px]">Điện thoại</div>
                  <a
                    href={`tel:${String(employerPhone).replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 text-gray-900 hover:text-blue-600"
                  >
                    <Phone className="w-4 h-4" />
                    {employerPhone}
                  </a>
                </div>
              )}
              {employerEmail && (
                <div className="flex items-start gap-3">
                  <div className="text-gray-500 min-w-[90px]">Email</div>
                  <a
                    href={`mailto:${employerEmail}`}
                    className="inline-flex items-center gap-2 text-gray-900 hover:text-blue-600 break-all"
                  >
                    <Mail className="w-4 h-4" />
                    {employerEmail}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Body: yêu cầu & mô tả */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Mô tả công việc</h3>
          <div className="text-gray-700 whitespace-pre-line">{job.description || '—'}</div>
        </section>

        <section className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Yêu cầu công việc</h3>
          <div className="text-gray-700 whitespace-pre-line">{job.requirements || '—'}</div>
        </section>

        {job.jdText && (
          <section className="bg-white border rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Mô tả chi tiết (JD cho AI)</h3>
            <div className="text-gray-700 whitespace-pre-line">{job.jdText}</div>
          </section>
        )}
      </div>

      {/* Applications summary */}
      <section className="bg-white border rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Ứng tuyển cho tin này</h3>
          <div className="text-sm text-gray-600">
            Tổng: <b>{totalApps}</b>
          </div>
        </div>

        {totalApps === 0 ? (
          <div className="text-gray-500 text-sm">Chưa có ứng tuyển</div>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <SummaryBadge label="Chờ duyệt" value={statusCounts.pending} tone="slate" />
              <SummaryBadge label="Đang xem" value={statusCounts.reviewing} tone="sky" />
              <SummaryBadge label="Sơ tuyển" value={statusCounts.shortlisted} tone="amber" />
              <SummaryBadge label="Phỏng vấn" value={statusCounts.interviewed} tone="indigo" />
              <SummaryBadge label="Đã nhận" value={statusCounts.accepted} tone="green" />
              <SummaryBadge label="Từ chối" value={statusCounts.rejected} tone="rose" />
            </div>

            {/* Recent list */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2">Ứng viên</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2">Ngày nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentApps.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{a.candidate?.name || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{a.candidate?.email || '—'}</td>
                      <td className="px-4 py-2">
                        <StatusPill status={a.status} />
                      </td>
                      <td className="px-4 py-2 text-gray-700">{fmtDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ============== UI helpers ============== */

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400 shrink-0">{icon}</div>
      <div className="text-sm text-gray-500 min-w-[90px]">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function SummaryBadge({ label, value, tone = 'slate' }) {
  const toneCls = {
    slate: 'bg-slate-50  text-slate-700  border-slate-200',
    sky: 'bg-sky-50    text-sky-700    border-sky-200',
    amber: 'bg-amber-50  text-amber-700  border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50  text-green-700  border-green-200',
    rose: 'bg-rose-50   text-rose-700   border-rose-200',
  }[tone] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border ${toneCls}`}>
      <span className="font-medium">{label}</span>
      <span className="px-2 py-0.5 bg-white/70 rounded border text-gray-700">{value}</span>
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { text: 'Chờ duyệt', cls: 'bg-slate-50  text-slate-700  border-slate-200' },
    reviewing: { text: 'Đang xem', cls: 'bg-sky-50    text-sky-700    border-sky-200' },
    shortlisted: { text: 'Sơ tuyển', cls: 'bg-amber-50  text-amber-700  border-amber-200' },
    interviewed: { text: 'Phỏng vấn', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    accepted: { text: 'Đã nhận', cls: 'bg-green-50  text-green-700  border-green-200' },
    rejected: { text: 'Từ chối', cls: 'bg-rose-50   text-rose-700   border-rose-200' },
  };
  const m = map[String(status || '').toLowerCase()] || {
    text: status || '—',
    cls: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${m.cls}`}>{m.text}</span>;
}