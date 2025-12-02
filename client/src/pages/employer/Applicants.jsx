// client/src/pages/employer/Applicants.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { applicationService, jobService } from '../../services/api';
import { Download, RefreshCw, Mail, Phone, XCircle, CheckCircle } from 'lucide-react';

function normalizeId(p) {
  return decodeURIComponent(String(p ?? '').trim());
}

// ===== Helpers kỹ năng =====
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

const pickMatched = (score) =>
  asList(score?.matchedSkills ?? score?.matched_skills ?? score?.matched ?? []);

const pickMissing = (score) =>
  asList(
    (Array.isArray(score?.missingMustHave) && score?.missingMustHave.length
      ? score?.missingMustHave
      : score?.missing_must_have
    ) ?? score?.missingSkills ?? score?.missing_skills ?? score?.missing ?? []
  );

const SkillChip = ({ label, tone = 'green' }) => {
  const cls =
    tone === 'green'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}
    >
      {label}
    </span>
  );
};

// ===== Helper: thời gian phỏng vấn (hiện không dùng nhưng giữ lại nếu sau này cần) =====
const pad2 = (n) => String(n).padStart(2, '0');
function buildISOWithTZ(dateStr, timeStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return '';
  if (!/^\d{2}:\d{2}$/.test(String(timeStr || ''))) return '';
  const [hh, mm] = timeStr.split(':').map((v) => Number(v));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return '';
  const tzMinOffset = -new Date().getTimezoneOffset();
  const sign = tzMinOffset >= 0 ? '+' : '-';
  const abs = Math.abs(tzMinOffset);
  const tzH = pad2(Math.floor(abs / 60));
  const tzM = pad2(abs % 60);
  return `${dateStr}T${pad2(hh)}:${pad2(mm)}:00${sign}${tzH}:${tzM}`;
}

// ===== Ngưỡng AI =====
const THRESHOLD_OK = 50;     // >= 50%: "phù hợp"
const THRESHOLD_STRONG = 70; // >= 70%: "AI gợi ý (ứng viên phù hợp vị trí)"

export default function Applicants() {
  const { id: idParam, jobId: jobIdParam } = useParams();
  const idFromRoute = normalizeId(jobIdParam ?? idParam);

  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('strong'); // 'strong' | 'ok' | 'bad'
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

      // 2) Applications
      const appsRes = await applicationService.getJobApplications(jobId);
      const apps = appsRes.data?.data || appsRes.data || [];

      // 3) Điểm AI cho từng application
      const withScores = await Promise.all(
        apps.map(async (app) => {
          try {
            const scoreRes = await api.get(`/applications/${app.id}/score`, {
              params: { _t: Date.now() },
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

  const visibleApps = applications;

  // NHÓM 1: AI gợi ý (ứng viên phù hợp vị trí) – điểm >= 70
  const strongApps = visibleApps
    .filter((a) => (a.aiScore?.scoreTotal || 0) >= THRESHOLD_STRONG)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  // NHÓM 2: Phù hợp – TẤT CẢ ứng viên điểm >= 50 (gồm cả strongApps)
  const suitableApps = visibleApps
    .filter((a) => (a.aiScore?.scoreTotal || 0) >= THRESHOLD_OK)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  // NHÓM 3: Không phù hợp – điểm < 50
  const badApps = visibleApps
    .filter((a) => (a.aiScore?.scoreTotal || 0) < THRESHOLD_OK)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  // Mời phỏng vấn (chỉ dùng cho nhóm strong)
  const inviteInterview = async (applicationId) => {
    const app = applications.find((a) => a.id === applicationId);
    const name = app?.candidate?.name || 'ứng viên';

    // Xác nhận hành động
    const ok = window.confirm(
      `Xác nhận mời ${name} phỏng vấn?\nỨng viên sẽ được chuyển sang mục "Quản lý ứng viên" để bạn đặt lịch chi tiết.`
    );
    if (!ok) return;

    try {
      setInviting(applicationId);

      // 👉 Chỉ đổi trạng thái sang 'shortlisted' – KHÔNG hỏi ngày/giờ và KHÔNG gửi email ở đây
      await applicationService.updateApplicationStatus(applicationId, {
        status: 'shortlisted',
      });

      alert(
        `Đã chuyển ${name} sang bước phỏng vấn (đã mời).\nBạn có thể lên lịch chi tiết trong mục "Quản lý ứng viên".`
      );

      // Reload lại danh sách AI gợi ý (cập nhật nút/hiển thị)
      await loadData(idFromRoute);
    } catch (error) {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra khi mời phỏng vấn');
    } finally {
      setInviting(null);
    }
  };

  // Từ chối tất cả nhóm "Không phù hợp"
  const rejectAllBad = async () => {
    const count = badApps.length;
    if (!count) {
      alert('Không có ứng viên nào trong danh sách "Không phù hợp".');
      return;
    }

    const message = `Từ chối TẤT CẢ ${count} ứng viên không phù hợp?\nHệ thống sẽ gửi email cảm ơn/từ chối cho từng ứng viên.`;
    if (!window.confirm(message)) return;

    setRejectAllLoading(true);
    let ok = 0;
    let fail = 0;

    for (const app of badApps) {
      try {
        await applicationService.updateApplicationStatus(app.id, { status: 'rejected' });
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

  // Rescore tất cả
  const rescoreAll = async () => {
    if (!window.confirm('Chấm lại điểm tất cả ứng viên của job này?')) return;

    try {
      setRescoreAllLoading(true);
      await jobService.rescoreJobApplications(idFromRoute, {
        onlyMissing: true,
        staleMinutes: 1440,
      });

      alert('Đã gửi yêu cầu. Hệ thống đang chấm điểm, vui lòng đợi khoảng 10 giây...');

      setTimeout(async () => {
        await loadData(idFromRoute);
        setRescoreAllLoading(false);
      }, 10000);
    } catch (e) {
      alert(e.response?.data?.message || 'Rescore tất cả thất bại');
      setRescoreAllLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
          <div>Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  const total = visibleApps.length;

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
              Tổng: {total} ứng viên | AI gợi ý (ứng viên phù hợp vị trí):{' '}
              {strongApps.length} | Phù hợp (&ge; {THRESHOLD_OK}%): {suitableApps.length} |
              Không phù hợp: {badApps.length}
            </p>
            {/* Dòng mô tả ngắn, không đụng nút Rescore */}
            <p className="text-xs text-gray-400 mt-1">
              Quy tắc AI: &ge; {THRESHOLD_STRONG}% = AI gợi ý • &ge; {THRESHOLD_OK}% = Phù
              hợp • &lt; {THRESHOLD_OK}% = Không phù hợp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={rescoreAll}
              disabled={rescoreAllLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-800 font-medium"
              title="Chấm lại điểm tất cả ứng viên"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  rescoreAllLoading ? 'animate-spin' : ''
                }`}
              />
              {rescoreAllLoading ? 'Đang xử lý AI...' : 'Rescore tất cả'}
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
              onClick={() => setActiveTab('strong')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'strong'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💡 AI gợi ý (Ứng viên phù hợp vị trí) ({strongApps.length})
            </button>
            <button
              onClick={() => setActiveTab('ok')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'ok'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✅ Phù hợp ({suitableApps.length})
            </button>
            <button
              onClick={() => setActiveTab('bad')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'bad'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ❌ Không phù hợp ({badApps.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'strong' ? (
            <StrongList
              applications={strongApps}
              inviting={inviting}
              onInvite={inviteInterview}
            />
          ) : activeTab === 'ok' ? (
            <OkList applications={suitableApps} />
          ) : (
            <BadList
              applications={badApps}
              onRejectAll={rejectAllBad}
              rejectAllLoading={rejectAllLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Tab 1: AI GỢI Ý (ỨNG VIÊN PHÙ HỢP VỊ TRÍ) =====
function StrongList({ applications, inviting, onInvite }) {
  if (!applications.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">📭</div>
        <div>Chưa có ứng viên nào đạt ngưỡng AI gợi ý (&ge; {THRESHOLD_STRONG}%).</div>
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
              CV (AI đã lọc)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app, index) => {
            const score = app.aiScore?.scoreTotal || 0;
            const matched = pickMatched(app.aiScore);
            const missing = pickMissing(app.aiScore);

            const scoreColor =
              score >= 90
                ? 'bg-green-100 text-green-800'
                : score >= 80
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800';

            const shortExplanation = `AI đánh giá ứng viên ${
              app.candidate?.name || 'này'
            } phù hợp khoảng ${score}% với vị trí này.`;

            const isInvitedOrLater = ['shortlisted', 'interviewed', 'accepted'].includes(
              app.status
            );

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {index + 1}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
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
                    <div className="text-xs text-gray-500 mt-2 italic">
                      {shortExplanation}
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
                    {matched.length ? (
                      matched.map((s, i) => <SkillChip key={s + i} label={s} tone="green" />)
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {missing.length ? (
                      missing.map((s, i) => <SkillChip key={s + i} label={s} tone="red" />)
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>

                {/* CHỈ TAB NÀY ĐƯỢC XEM CV */}
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
                    <span className="text-gray-400 text-sm">Không có CV</span>
                  )}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  {isInvitedOrLater ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Đã mời phỏng vấn
                    </span>
                  ) : (
                    <button
                      onClick={() => onInvite(app.id)}
                      disabled={inviting === app.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {inviting === app.id ? (
                        'Đang xử lý...'
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mời phỏng vấn
                        </>
                      )}
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

// ===== Tab 2: PHÙ HỢP (TẤT CẢ ứng viên score >= 50), CV BỊ KHÓA =====
function OkList({ applications }) {
  if (!applications.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">🙂</div>
        <div>
          Chưa có ứng viên nào đạt mức điểm từ {THRESHOLD_OK}% trở lên.
        </div>
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
              Kỹ năng thiếu
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CV
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app, index) => {
            const score = app.aiScore?.scoreTotal || 0;
            const matched = pickMatched(app.aiScore);
            const missing = pickMissing(app.aiScore);

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
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                    {score}%
                  </span>
                </td>
                <td className="px-4 py-4">
                  {matched.length ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {matched.map((s, i) => (
                        <SkillChip key={s + i} label={s} tone="green" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {missing.length ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {missing.map((s, i) => (
                        <SkillChip key={s + i} label={s} tone="red" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-gray-400 text-xs italic">
                    Chỉ CV trong mục "AI gợi ý (Ứng viên phù hợp vị trí)" mới được
                    hiển thị.
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===== Tab 3: KHÔNG PHÙ HỢP (<50%), CV BỊ KHÓA =====
function BadList({ applications, onRejectAll, rejectAllLoading }) {
  if (!applications.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">✨</div>
        <div>
          Không có ứng viên nào bị AI đánh giá là không phù hợp (dưới{' '}
          {THRESHOLD_OK}%).
        </div>
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
                <td className="px-4 py-4">
                  {matched.length ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {matched.map((skill, i) => (
                        <SkillChip key={skill + i} label={skill} tone="green" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {missingMustHave.length ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {missingMustHave.map((skill, i) => (
                        <SkillChip key={skill + i} label={skill} tone="red" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">
                      Điểm tổng thấp (dưới {THRESHOLD_OK}% theo tiêu chí AI)
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-gray-400 text-xs italic">
                    CV không hiển thị vì AI đánh giá không phù hợp
                  </span>
                </td>
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