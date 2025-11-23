// client/src/pages/admin/CompanyDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import { 
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin, 
  Users, Briefcase, TrendingUp, Calendar, ExternalLink
} from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#9CA3AF'];

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getCompanyById(id);
      setData(res?.data?.data || res?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được thông tin công ty');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!data?.company) return;
    const next = !data.company.isActive;
    const msg = next ? 'Khôi phục công ty này?' : 'Tạm ngưng công ty này?';
    if (!window.confirm(msg)) return;
    try {
      await adminService.updateCompanyStatus(id, next);
      fetchDetail();
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const pieData = useMemo(() => {
    if (!data?.applicationStats) return [];
    const s = data.applicationStats;
    return [
      { name: 'Chờ duyệt', value: Number(s.pending || 0) },
      { name: 'Đang xem', value: Number(s.reviewing || 0) },
      { name: 'Sơ tuyển', value: Number(s.shortlisted || 0) },
      { name: 'Phỏng vấn', value: Number(s.interviewed || 0) },
      { name: 'Đã nhận', value: Number(s.accepted || 0) },
      { name: 'Từ chối', value: Number(s.rejected || 0) },
    ].filter(d => d.value > 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
        <button
          onClick={() => navigate('/admin/companies')}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (!data?.company) return null;

  const company = data.company;
  const jobs = data.recentJobs || [];
  const appStats = data.applicationStats || {};
  const jobsOpen = jobs.filter(j => j.isActive).length;
  const totalApps = Number(appStats.total || 0);
  const conversionRate = totalApps > 0
    ? ((Number(appStats.accepted || 0) / totalApps) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/companies')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết công ty</h1>
            <p className="text-sm text-gray-500 mt-1">
              {company.company || company.name || '—'}
            </p>
          </div>
        </div>

        <button
          onClick={toggleStatus}
          className={`px-4 py-2 rounded-lg text-white font-medium ${
            company.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {company.isActive ? 'Tạm ngưng' : 'Khôi phục'}
        </button>
      </div>

      {/* Company Info Card */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">
              {company.company || company.name || '—'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {company.email && (
                <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={company.email} />
              )}
              {company.phone && (
                <InfoItem icon={<Phone className="w-4 h-4" />} label="Điện thoại" value={company.phone} />
              )}
              {company.companyWebsite && (
                <InfoItem
                  icon={<Globe className="w-4 h-4" />}
                  label="Website"
                  value={
                    <a
                      href={company.companyWebsite.startsWith('http') ? company.companyWebsite : `https://${company.companyWebsite}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {company.companyWebsite}
                    </a>
                  }
                />
              )}
              {company.companySize && (
                <InfoItem icon={<Users className="w-4 h-4" />} label="Quy mô" value={company.companySize} />
              )}
              {company.industry && (
                <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Ngành nghề" value={company.industry} />
              )}
              {(company.companyCity || company.companyAddress) && (
                <InfoItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Địa chỉ"
                  value={`${company.companyCity || ''} ${company.companyAddress || ''}`.trim()}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Tổng tin tuyển dụng" 
          value={jobs.length}
          icon={<Briefcase className="w-5 h-5" />}
          color="blue"
        />
        <StatCard 
          label="Tin đang mở" 
          value={jobsOpen}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard 
          label="Tổng ứng tuyển" 
          value={totalApps}
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
        <StatCard 
          label="Tỷ lệ chuyển đổi" 
          value={`${conversionRate}%`}
          icon={<Calendar className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Charts & Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Phân bố ứng tuyển</h3>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={90} 
                    label
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Chưa có ứng tuyển
              </div>
            )}
          </div>
        </div>

        {/* Recent jobs */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Tin tuyển dụng gần đây</h3>
          <div className="space-y-3 max-h-64 overflow-auto">
            {jobs.length > 0 ? (
              jobs.map(job => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {job.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {job.location} · {job.createdAt ? new Date(job.createdAt).toLocaleDateString('vi-VN') : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {job.isActive ? 'Đang mở' : 'Đã tắt'}
                    </span>
                    <Link
                      to={`/jobs/${job.id}`}
                      target="_blank"
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Xem chi tiết"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                Chưa có tin tuyển dụng
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== Sub components ============== */

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 truncate">{value || '—'}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center`}>
          {icon}
        </div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}