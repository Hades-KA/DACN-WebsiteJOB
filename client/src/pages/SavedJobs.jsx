import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const SavedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/saved-jobs');
        setJobs(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được danh sách đã lưu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center">Đang tải...</div>;
  if (error) return <div className="min-h-[50vh] flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Việc đã lưu</h1>
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Chưa có việc nào được lưu.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <div className="text-sm text-gray-600 mt-1">{job.company} • {job.location}</div>
                <div className="text-sm text-gray-600 mt-1">{job.type} • {job.salary || 'Thoả thuận'}</div>
                <div className="mt-3 flex gap-2">
                  <Link to={`/job/${job.id}`} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Xem chi tiết</Link>
                  <button
                    onClick={async () => {
                      try {
                        await api.delete(`/saved-jobs/${job.id}`);
                        setJobs(prev => prev.filter(j => j.id !== job.id));
                      } catch (_) {}
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                  >
                    Bỏ lưu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobs;
