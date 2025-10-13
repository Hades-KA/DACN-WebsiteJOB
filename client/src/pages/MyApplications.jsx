import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/api';

const statusBadge = (status) => {
  const map = {
    pending: 'bg-gray-100 text-gray-800',
    reviewing: 'bg-blue-100 text-blue-800',
    shortlisted: 'bg-purple-100 text-purple-800',
    interviewed: 'bg-orange-100 text-orange-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

const MyApplications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await applicationService.getApplications();
        setItems(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được danh sách ứng tuyển');
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
        <h1 className="text-2xl font-bold mb-6">Việc đã ứng tuyển</h1>
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Chưa có đơn ứng tuyển nào.</div>
        ) : (
          <div className="space-y-4">
            {items.map(app => (
              <div key={app.id} className="bg-white rounded-lg shadow p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{app.job?.title}</h3>
                  <div className="text-sm text-gray-600">{app.job?.company} • {app.job?.location} • {app.job?.type}</div>
                  <div className="mt-2 inline-block text-xs px-2 py-1 rounded-full {statusBadge(app.status)}">{app.status}</div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/job/${app.job?.id}`} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Xem job</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
