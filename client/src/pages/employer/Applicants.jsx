import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { applicationService, jobService } from '../../services/api';
import { Download, RefreshCw, Mail, Phone, XCircle } from 'lucide-react';

function normalizeId(p) {
  return decodeURIComponent(String(p ?? '').trim());
}

// Helper: ép kiểu về mảng
const asList = (x) => {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  try {
    const a = JSON.parse(x);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

// Helper: lấy matched/missing từ nhiều tên field khác nhau của API
const pickMatched = (score) =>
  asList(score?.matchedSkills ?? score?.matched_skills ?? score?.matched ?? []);

const pickMissing = (score) =>
  asList(
    (Array.isArray(score?.missingMustHave) && score?.missingMustHave.length
      ? score?.missingMustHave
      : score?.missing_must_have
    ) ?? score?.missingSkills ?? score?.missing_skills ?? score?.missing ?? []
  );

// Chip hiển thị kỹ năng
const SkillChip = ({ label, tone = 'green' }) => {
  const cls =
    tone === 'green'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {label}
    </span>
  );
};

// Helper: tạo ISO có timezone từ YYYY-MM-DD + HH:mm
const pad2 = (n) => String(n).padStart(2, '0');
function buildISOWithTZ(dateStr, timeStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return '';
  if (!/^\d{2}:\d{2}$/.test(String(timeStr || ''))) return '';
  const [hh, mm] = timeStr.split(':').map((v) => Number(v));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return '';
  const tzMinOffset = -new Date().getTimezoneOffset(); // VN -> +420 => +07:00
  const sign = tzMinOffset >= 0 ? '+' : '-';
  const abs = Math.abs(tzMinOffset);
  const tzH = pad2(Math.floor(abs / 60));
  const tzM = pad2(abs % 60);
  return `${dateStr}T${pad2(hh)}:${pad2(mm)}:00${sign}${tzH}:${tzM}`;
}

export default function Applicants() {
  // Nhận cả id/jobId để không phụ thuộc tên param
  const { id: idParam, jobId: jobIdParam } = useParams();
  const idFromRoute = normalizeId(jobIdParam ?? idParam);

  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matched'); // 'matched' | 'not_matched'
  const [inviting, setInviting] = useState(null);
  const [rescoreAllLoading, setRescoreAllLoading] = useState(false);
  const [rejectAllLoading, setRejectAllLoading] = useState(false);

  useEffect(() => {
    if (!idFromRoute) return;
    loadData(idFromRoute);
  }, [idFromRoute]);

  const loadData = async (jobId) => {
    setLoading(true);
    try {
      // 1) Job detail
      const jobRes = await jobService.getJobById(jobId);
      const jobData = jobRes.data?.data || jobRes.data || null;
      setJob(jobData);

      // 2) Applications (qua jobRoutes: /api/jobs/:id/applications)
      const appsRes = await applicationService.getJobApplications(jobId);
      const apps = appsRes.data?.data || appsRes.data || [];

      // 3) Scores (chống cache)
      const withScores = await Promise.all(
        apps.map(async (app) => {
          try {
            const scoreRes = await api.get(`/applications/${app.id}/score`, {
              params: { _t: Date.now() }, // cache-buster
              headers: { 'Cache-Control': 'no-cache' },
            });
            return { ...app, aiScore: (scoreRes.data?.data || scoreRes.data) ?? null };
          } catch (error) {
            console.warn(
              `Failed to get score for ${app.id}:`,
              error?.response?.status || error?.message
            );
            return { ...app, aiScore: null };
          }
        })
      );

      setApplications(withScores);
    } catch (error) {
      console.error(
        'Load data error:',
        error?.response?.status,
        error?.response?.data || error?.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Không hiển thị những đơn đã bị từ chối
  const visibleApps = applications.filter((a) => a.status !== 'rejected');

  const matchedApps = visibleApps
    .filter((a) => (a.aiScore?.scoreTotal || 0) >= 50)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  const notMatchedApps = visibleApps
    .filter((a) => (a.aiScore?.scoreTotal || 0) < 50)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  // Mời phỏng vấn: hỏi ngày/giờ và truyền interviewTime
  const inviteInterview = async (applicationId) => {
    if (!window.confirm('Xác nhận mời ứng viên này phỏng vấn?')) return;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dateStr = window.prompt('Nhập NGÀY phỏng vấn (YYYY-MM-DD):', today);
    if (!dateStr) return;

    const timeStr = window.prompt('Nhập GIỜ phỏng vấn (HH:mm):', '09:00');
    if (!timeStr) return;

    const iso = buildISOWithTZ(dateStr, timeStr);
    if (!iso) {
      alert('Định dạng ngày/giờ không hợp lệ. Vui lòng dùng YYYY-MM-DD và HH:mm.');
      return;
    }

    try {
      setInviting(applicationId);
      await applicationService.updateApplicationStatus(applicationId, {
        status: 'interviewed',
        interviewTime: iso,
      });
      alert('Đã gửi lời mời phỏng vấn (kèm thời gian)!');
      await loadData(idFromRoute);
    } catch (error) {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setInviting(null);
    }
  };

  // TỪ CHỐI TẤT CẢ ứng viên KHÔNG PHÙ HỢP
  const rejectAllNotMatched = async () => {
    const count = notMatchedApps.length;
    if (!count) {
      alert('Không có ứng viên nào trong danh sách "Không phù hợp".');
      return;
    }

    const message = `Từ chối. TẤT CẢ ${count} ứng viên không phù hợp? Hệ thống sẽ gửi email cảm ơn/từ chối cho từng ứng viên.`;

    if (!window.confirm(message)) return;

    setRejectAllLoading(true);
    let ok = 0;
    let fail = 0;

    for (const app of notMatchedApps) {
      try {
        await applicationService.updateApplicationStatus(app.id, 'rejected');
        ok++;
      } catch (e) {
        console.error('Reject failed for app', app.id, e);
        fail++;
      }
    }

    alert(
      `Đã từ chối ${ok} ứng viên.${fail ? ` Có ${fail} ứng viên lỗi, vui lòng thử lại sau.` : ''}`
    );

    await loadData(idFromRoute);
    setRejectAllLoading(false);
  };

  // NÚT RESCORE TẤT CẢ
  const rescoreAll = async () => {
    if (!window.confirm('Chấm lại điểm tất cả ứng viên của job này?')) return;
    try {
      setRescoreAllLoading(true);
      await jobService.rescoreJobApplications(idFromRoute, {
        onlyMissing: true, // chỉ chạy cái thiếu/lỗi/cũ
        staleMinutes: 1440, // định nghĩa "cũ": 24h
      });
      alert('Đã gửi yêu cầu chấm lại điểm. Vui lòng đợi vài giây...');
      setTimeout(() => loadData(idFromRoute), 3000);
    } catch (e) {
      alert(e.response?.data?.message || 'Rescore tất cả thất bại');
    } finally {
      setRescoreAllLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div>Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {job?.title || 'Quản lý ứng viên'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Tổng: {visibleApps.length} ứng viên |{' '}
              Phù hợp: {matchedApps.length} |{' '}
              Không phù hợp: {notMatchedApps.length}
            </p>
          </div>

          {/* NÚT RESCORE TẤT CẢ */}
          <div className="flex items-center gap-2">
            <button
              onClick={rescoreAll}
              disabled={rescoreAllLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-800 font-medium"
              title="Chấm lại điểm tất cả ứng viên"
            >
              <RefreshCw className={`w-4 h-4 ${rescoreAllLoading ? 'animate-spin' : ''}`} />
              {rescoreAllLoading ? 'Đang rescore...' : 'Rescore tất cả'}
            </button>
            <Link
              to="/employer/jobs"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              ← Quay lại danh sách tin
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('matched')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'matched'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✅ Phù hợp ({matchedApps.length})
            </button>
            <button
              onClick={() => setActiveTab('not_matched')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'not_matched'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ❌ Không phù hợp ({notMatchedApps.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'matched' ? (
            <MatchedList
              applications={matchedApps}
              inviting={inviting}
              onInvite={inviteInterview}
            />
          ) : (
            <NotMatchedList
              applications={notMatchedApps}
              onRejectAll={rejectAllNotMatched}
              rejectAllLoading={rejectAllLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Matched list =====
function MatchedList({ applications, inviting, onInvite }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">📭</div>
        <div>Chưa có ứng viên phù hợp</div>
        <div className="text-sm mt-1">AI sẽ tự động lọc khi có ứng viên mới nộp đơn</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hạng
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ứng viên
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI Score
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kỹ năng phù hợp
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kỹ năng thiếu
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CV
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app, index) => {
            const score = app.aiScore?.scoreTotal || 0;
            const scoreColor =
              score >= 80
                ? 'bg-green-100 text-green-800'
                : score >= 70
                ? 'bg-blue-100 text-blue-800'
                : score >= 60
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800';

            const matched = pickMatched(app.aiScore);
            const missing = pickMissing(app.aiScore);

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {index + 1}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {app.candidate?.name || 'Không rõ'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3" />
                        {app.candidate?.email || ''}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {app.candidate?.phone || ''}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${scoreColor}`}
                  >
                    {score}%
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {matched.length > 0 ? (
                      matched.map((s, i) => <SkillChip key={s + i} label={s} tone="green" />)
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {missing.length > 0 ? (
                      missing.map((s, i) => <SkillChip key={s + i} label={s} tone="red" />)
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {app.cv?.url || app.cv?.filePath ? (
                    <a
                      href={app.cv?.url || app.cv?.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Xem CV
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  {app.status === 'interviewed' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Đã mời PV
                    </span>
                  ) : (
                    <button
                      onClick={() => onInvite(app.id)}
                      disabled={inviting === app.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {inviting === app.id ? '...' : 'Mời phỏng vấn'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===== Not matched list =====
function NotMatchedList({ applications, onRejectAll, rejectAllLoading }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">✨</div>
        <div>Tất cả ứng viên đều phù hợp!</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              STT
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ứng viên
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI Score
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kỹ năng phù hợp
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lý do không phù hợp
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CV
            </th>
            {/* Cột thao tác chung */}
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={onRejectAll}
                disabled={rejectAllLoading}
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-red-200 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
              >
                {rejectAllLoading ? (
                  'Đang từ chối...'
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Từ chối tất cả
                  </>
                )}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app, index) => {
            const score = app.aiScore?.scoreTotal || 0;
            const matched = pickMatched(app.aiScore);
            const missingMustHave = pickMissing(app.aiScore);

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {app.candidate?.name || 'Không rõ'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Mail className="w-3 h-3" />
                    {app.candidate?.email || ''}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {score}%
                  </span>
                </td>

                {/* Kỹ năng phù hợp */}
                <td className="px-4 py-4">
                  {matched.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {matched.map((skill, i) => (
                        <SkillChip key={skill + i} label={skill} tone="green" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>

                {/* Lý do không phù hợp */}
                <td className="px-4 py-4">
                  {missingMustHave.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {missingMustHave.map((skill, i) => (
                        <SkillChip key={skill + i} label={skill} tone="red" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Điểm tổng thấp</span>
                  )}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {app.cv?.url || app.cv?.filePath ? (
                    <a
                      href={app.cv?.url || app.cv?.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Xem CV
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>

                {/* Cột trống để bảng cân cột với header Thao tác */}
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-400">
                  —
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}