import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { applicationService } from '../../services/api';

// Nhãn tiếng Việt
const STATUS_LABELS = {
  all: 'Tất cả trạng thái',
  pending: 'Chờ duyệt',
  reviewing: 'Đang xem',
  shortlisted: 'Được chọn sơ bộ',
  interviewed: 'Đã phỏng vấn',
  accepted: 'Được nhận',
  rejected: 'Bị từ chối',
};
const STATUS_KEYS = ['pending','reviewing','shortlisted','interviewed','accepted','rejected'];

export default function Applicants(){
  const { jobId } = useParams();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await applicationService.getApplications({ jobId, status });
      setRows(data?.data || data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [jobId, status]);

  const update = async (id, to) => {
    await applicationService.updateApplicationStatus(id, to);
    await load();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg">Ứng viên theo tin</div>
        <select
          value={status}
          onChange={e=>setStatus(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="all">{STATUS_LABELS.all}</option>
          {STATUS_KEYS.map(k => (
            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Đang tải...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Ứng viên</th>
                <th>Email</th>
                <th>CV</th>
                <th>Trạng thái</th>
                <th>Ngày nộp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.candidate?.name}</td>
                  <td>{a.candidate?.email}</td>
                  <td>
                    {a.cv?.filePath
                      ? <a href={a.cv.filePath} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">Xem CV</a>
                      : '—'}
                  </td>
                  {/* Việt hóa nhãn trạng thái */}
                  <td>{STATUS_LABELS[a.status] || a.status}</td>
                  <td>{a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : ''}</td>
                  <td className="text-right">
                    <select
                      className="border rounded px-2 py-1"
                      value={a.status}
                      onChange={e => update(a.id, e.target.value)}
                    >
                      {STATUS_KEYS.map(k => (
                        <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">Chưa có ứng viên</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}