import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { applicationService, jobService } from '../../services/api';
import { Download, RefreshCw, Mail, Phone } from 'lucide-react';

function normalizeId(p) {
  return decodeURIComponent(String(p ?? '').trim());
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

  useEffect(() => {
    if (!idFromRoute) return;
    loadData(idFromRoute);
  }, [idFromRoute]);

  // TỰ ĐỘNG RESCORE THÔNG MINH KHI VÀO TRANG (TẠM TẮT ĐỂ TRÁNH LỖI)
  // useEffect(() => {
  //   if (!idFromRoute) return;
  //   jobService.rescoreJobApplications(idFromRoute, { 
  //     onlyMissing: true,
  //     staleMinutes: 1440
  //   }).catch(() => {});
  // }, [idFromRoute]);

  const loadData = async (jobId) => {
    setLoading(true);
    try {
      // 1) Job detail
      const jobRes = await jobService.getJobById(jobId);
      const jobData = jobRes.data?.data || jobRes.data || null;
      setJob(jobData);

      // 2) Applications (qua jobRoutes: /api/jobs/:id/applications)
      const appsRes = await applicationService.getApplicationsByJob(jobId);
      const apps = appsRes.data?.data || appsRes.data || [];

      // 3) Scores (chống cache)
      const withScores = await Promise.all(
        apps.map(async (app) => {
          try {
            const scoreRes = await api.get(`/applications/${app.id}/score`, {
              params: { _t: Date.now() }, // cache-buster
              headers: { 'Cache-Control': 'no-cache' },
            });
            return { ...app, aiScore: scoreRes.data?.data };
          } catch (error) {
            console.warn(`Failed to get score for ${app.id}:`, error?.response?.status || error?.message);
            return { ...app, aiScore: null };
          }
        })
      );

      setApplications(withScores);
    } catch (error) {
      console.error('Load data error:', error?.response?.status, error?.response?.data || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const matchedApps = applications
    .filter(a => (a.aiScore?.scoreTotal || 0) >= 50)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  const notMatchedApps = applications
    .filter(a => (a.aiScore?.scoreTotal || 0) < 50)
    .sort((a, b) => (b.aiScore?.scoreTotal || 0) - (a.aiScore?.scoreTotal || 0));

  const inviteInterview = async (applicationId) => {
    if (!window.confirm('Xác nhận mời ứng viên này phỏng vấn?')) return;
    try {
      setInviting(applicationId);
      await applicationService.updateApplicationStatus(applicationId, 'interviewing');
      alert('Đã gửi lời mời phỏng vấn!');
      await loadData(idFromRoute);
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setInviting(null);
    }
  };

  // NÚT RESCORE TẤT CẢ
  const rescoreAll = async () => {
    if (!window.confirm('Chấm lại điểm tất cả ứng viên của job này?')) return;
    try {
      setRescoreAllLoading(true);
      await jobService.rescoreJobApplications(idFromRoute, {
        onlyMissing: true,    // chỉ chạy cái thiếu/lỗi/cũ
        staleMinutes: 1440,   // định nghĩa "cũ": 24h
      });
      alert('Đã gửi yêu cầu chấm lại điểm. Vui lòng đợi vài giây...');
      // Đợi AI chạy nền một chút rồi tải lại
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
              Tổng: {applications.length} ứng viên |{' '}
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
            <Link to="/employer/jobs" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Matched list (BỎ ICON RESCORE) =====
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạng</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ứng viên</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỹ năng phù hợp</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỹ năng thiếu</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CV</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app, index) => {
            const score = app.aiScore?.scoreTotal || 0;
            const scoreColor =
              score >= 80 ? 'bg-green-100 text-green-800' :
              score >= 70 ? 'bg-blue-100 text-blue-800' :
              score >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800';

            const matched = (
              app.aiScore?.matchedSkills ||
              app.aiScore?.matched ||
              app.aiScore?.matched_skills ||
              []
            );
            const missing = (
              (Array.isArray(app.aiScore?.missingMustHave) && app.aiScore?.missingMustHave.length
                ? app.aiScore?.missingMustHave
                : app.aiScore?.missingSkills || app.aiScore?.missing || app.aiScore?.missing_skills
              ) || []
            );

            const matchedTop = matched;
            const missingTop = missing;

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {index + 1}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{app.candidate?.name || 'Không rõ'}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3" />{app.candidate?.email || ''}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Phone className="w-3 h-3" />{app.candidate?.phone || ''}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${scoreColor}`}>{score}%</span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {matchedTop.length > 0 ? (
                      matchedTop.map((s, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {missingTop.length > 0 ? (
                      missingTop.map((s, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {app.cv?.url || app.cv?.filePath ? (
                    <a href={app.cv.url || app.cv.filePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                      <Download className="w-4 h-4" />Xem CV
                    </a>
                  ) : <span className="text-gray-400 text-sm">—</span>}
                </td>

                {/* ĐÃ BỎ ICON RESCORE - CHỈ CÒN NÚT MỜI PHỎNG VẤN */}
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  {app.status === 'interviewing' ? (
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

// ===== Not matched list (BỎ CỘT HÀNH ĐỘNG) =====
function NotMatchedList({ applications }) {
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ứng viên</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do không phù hợp</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CV</th>
            {/* ĐÃ XÓA CỘT HÀNH ĐỘNG */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app, index) => {
            const score = app.aiScore?.scoreTotal || 0;
            
            const missingMustHave = (
              (Array.isArray(app.aiScore?.missingMustHave) && app.aiScore?.missingMustHave.length
                ? app.aiScore?.missingMustHave
                : app.aiScore?.missingSkills || []
              )
            );

            return (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{app.candidate?.name || 'Không rõ'}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Mail className="w-3 h-3" />{app.candidate?.email || ''}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">{score}%</span>
                </td>
                
                <td className="px-4 py-4">
                  {missingMustHave.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {missingMustHave.map((skill, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Điểm tổng thấp</span>
                  )}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  {app.cv?.url || app.cv?.filePath ? (
                    <a href={app.cv.url || app.cv.filePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                      <Download className="w-4 h-4" />Xem CV
                    </a>
                  ) : <span className="text-gray-400 text-sm">—</span>}
                </td>
                {/* ĐÃ XÓA CỘT HÀNH ĐỘNG (RESCORE) */}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}