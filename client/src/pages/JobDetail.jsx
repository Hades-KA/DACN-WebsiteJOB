import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobService, applicationService, cvService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Clock, Building } from 'lucide-react';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cvs, setCvs] = useState([]);
  const [loadingCvs, setLoadingCvs] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await jobService.getJobById(id);
        setJob(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được chi tiết công việc');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const parseSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      try {
        const parsed = JSON.parse(skills);
        if (Array.isArray(parsed)) return parsed;
        return skills.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        return skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600">
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!job) return null;

  const skills = parseSkills(job.skills).slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <div className="flex items-center text-gray-600 mt-2">
                <Building className="w-4 h-4 mr-2" />
                <span>{job.company}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  const user = localStorage.getItem('user');
                  const userType = user && user !== 'undefined' && user !== 'null' ? JSON.parse(user)?.userType : null;
                  if (!token) return navigate('/login');
                  if (userType && userType !== 'candidate' && userType !== 'admin') return;
                  setApplyOpen(true);
                  // Load CVs when opening modal
                  (async () => {
                    try {
                      setLoadingCvs(true);
                      const res = await cvService.getAllCVs();
                      const items = res.data?.data || res.data || [];
                      setCvs(items);
                      if (items.length > 0) setSelectedCvId(items[0].id);
                    } catch (_) {
                      setCvs([]);
                    } finally {
                      setLoadingCvs(false);
                    }
                  })();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ứng tuyển
              </button>
              <Link to="/" className="text-blue-600 hover:underline">← Quay lại</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center text-gray-700">
              <MapPin className="w-4 h-4 mr-2" /> {job.location}
            </div>
            <div className="flex items-center text-gray-700">
              <DollarSign className="w-4 h-4 mr-2" /> {job.salary || 'Thoả thuận'}
            </div>
            <div className="flex items-center text-gray-700">
              <Clock className="w-4 h-4 mr-2" /> {job.type}
            </div>
          </div>

          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {job.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Mô tả công việc</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-line">{job.description}</div>
            </div>
          )}
          {job.requirements && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Yêu cầu</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-line">{job.requirements}</div>
            </div>
          )}
          {job.benefits && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Quyền lợi</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-line">{job.benefits}</div>
            </div>
          )}
        </div>
      </div>

      {applyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Ứng tuyển: {job.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Chọn CV để nộp và nhập thư giới thiệu (tùy chọn).</p>
            <div className="mb-4">
              <div className="font-medium mb-2">Chọn CV</div>
              {loadingCvs ? (
                <div className="text-sm text-gray-500">Đang tải CV...</div>
              ) : (
                <>
                  {cvs.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Bạn chưa có CV nào. Hãy vào <Link to="/cv-list" className="text-blue-600 underline">Danh sách CV</Link> để tải lên.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-auto border rounded p-2 space-y-2">
                      {cvs.map(cv => (
                        <label key={cv.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="cv"
                            value={cv.id}
                            checked={selectedCvId === cv.id}
                            onChange={() => setSelectedCvId(cv.id)}
                          />
                          <span>{cv.filename || cv.candidateName || 'CV'}</span>
                          {cv.ai_score ? (
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">AI {cv.ai_score}</span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              placeholder="Thư giới thiệu..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setApplyOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    const payload = { jobId: id, coverLetter: coverLetter?.trim() || undefined };
                    if (selectedCvId) payload.cvId = selectedCvId;
                    await applicationService.createApplication(payload);
                    setApplyOpen(false);
                    setCoverLetter('');
                    setSelectedCvId('');
                    alert('Đã nộp ứng tuyển thành công');
                  } catch (err) {
                    alert(err.response?.data?.message || 'Nộp ứng tuyển thất bại');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi ứng tuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JobDetail;
