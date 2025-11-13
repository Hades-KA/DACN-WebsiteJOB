import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const typeViMap = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  contract: 'Thời vụ',
  intern: 'Thực tập',
};

function normalizeSaved(item, idx = 0) {
  // Backend có thể trả:
  // 1) [{ id: savedId, job: {...} }, ...]
  // 2) [{ id: jobId, title, ... }, ...]
  const j = item?.job || item || {};
  return {
    savedId: item?.job ? (item.id || item.savedId || null) : null,
    id: j.id || j._id || `j-${idx}`,
    title: j.title || j.name || 'Vị trí chưa đặt tên',
    company: j.company?.name || j.company?.companyName || j.company || 'Công ty ẩn danh',
    companyLogo: j.companyLogo || j.company?.logo || '',
    location: j.location || 'Không rõ',
    salary: j.salary || j.salaryBand || 'Thoả thuận',
    type: j.type || 'full-time',
    createdAt: j.createdAt || j.publishedAt || '',
  };
}

export default function SavedJobs() {
  const [items, setItems] = useState([]); // đã normalize
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unsavingId, setUnsavingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/saved-jobs');
        const raw = res?.data?.data || res?.data || [];
        const list = Array.isArray(raw) ? raw : [];
        setItems(list.map((it, i) => normalizeSaved(it, i)));
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được danh sách đã lưu');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUnsave = async (item) => {
    // Ưu tiên gọi theo savedId; nếu không có, fallback gọi theo jobId
    const idForApi = item.savedId || item.id;
    if (!idForApi) return;
    try {
      setUnsavingId(idForApi);
      await api.delete(`/saved-jobs/${idForApi}`);
      // Optimistic update
      setItems((prev) =>
        prev.filter((x) => (x.savedId || x.id) !== idForApi)
      );
    } catch (err) {
      alert(err?.response?.data?.message || 'Bỏ lưu thất bại, vui lòng thử lại');
    } finally {
      setUnsavingId(null);
    }
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

  const count = items.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Việc đã lưu</h1>
          <div className="text-sm text-gray-600">{count} việc</div>
        </div>

        {count === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-gray-600 text-center">
            Chưa có việc nào được lưu.
            <div className="mt-3">
              <Link to="/jobs" className="text-blue-600 hover:underline">
                Khám phá việc làm
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((job) => (
              <div key={`${job.savedId || job.id}`} className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="flex items-start gap-3">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt="logo"
                      className="w-10 h-10 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{job.title}</h3>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {job.company} • {job.location}
                    </div>
                  </div>
                </div>

                <ul className="text-sm text-gray-600 space-y-1 mt-3">
                  <li>💰 {job.salary}</li>
                  <li>⏱️ {typeViMap[job.type] || job.type}</li>
                </ul>

                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Xem chi tiết
                  </Link>
                  <button
                    onClick={() => handleUnsave(job)}
                    disabled={unsavingId === (job.savedId || job.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-60"
                  >
                    {unsavingId === (job.savedId || job.id) ? 'Đang bỏ lưu…' : 'Bỏ lưu'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}