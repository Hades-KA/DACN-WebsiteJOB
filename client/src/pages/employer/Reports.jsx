import React, { useEffect, useState, useMemo } from 'react';
import { analyticsService } from '../../services/api';
import { 
  TrendingUp, FileText, CheckCircle, Eye, Award, Download, RefreshCw,
  TrendingDown, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart
} from 'recharts';

/* ============== Helpers ============== */
const fmtNumber = (n) => {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('vi-VN');
};

const fmtPercent = (n) => {
  const v = Number(n);
  if (Number.isNaN(v)) return '0%';
  return v.toFixed(1) + '%';
};

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* ============== Theme Colors ============== */
const COLORS = {
  primary: '#3B82F6',    // blue-500
  success: '#10B981',    // green-500
  warning: '#F59E0B',    // amber-500
  danger: '#EF4444',     // red-500
  purple: '#8B5CF6',     // violet-500
  indigo: '#6366F1',     // indigo-500
  cyan: '#06B6D4',       // cyan-500
  slate: '#64748B',      // slate-500
};

const PIE_COLORS = [COLORS.success, COLORS.primary, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.slate];

/* ============== Việt hóa trạng thái ============== */
const STATUS_VI = {
  pending: 'Chờ xử lý',
  reviewing: 'Đang xem xét',
  shortlisted: 'Sơ tuyển',
  interviewed: 'Phỏng vấn',
  accepted: 'Đã nhận',
  rejected: 'Từ chối',        // ✅ thêm trạng thái Từ chối
};

/* ============== Components ============== */
const StatCard = ({ icon: Icon, label, value, subValue, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-200',
    green: 'bg-green-50 text-green-600 ring-green-200',
    amber: 'bg-amber-50 text-amber-600 ring-amber-200',
    rose: 'bg-rose-50 text-rose-600 ring-rose-200',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-200',
    slate: 'bg-slate-50 text-slate-600 ring-slate-200',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-slate-600 mb-1">{label}</div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          {subValue && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
          {trend && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${trend.up ? 'text-green-600' : 'text-rose-600'}`}>
              {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} ring-1 flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ title, children, className = '', action }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-6 overflow-hidden ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const SkillBadge = ({ skill, count, type = 'matched' }) => {
  const colors = {
    matched: 'bg-green-100 text-green-800 ring-green-200',
    missing: 'bg-red-100 text-red-800 ring-red-200',
  };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ring-1 ${colors[type]}`}>
      <span>{skill}</span>
      <span className="opacity-75">({count})</span>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
    ))}
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
    <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
    <div className="text-amber-900 font-medium mb-2">Không thể tải dữ liệu</div>
    <div className="text-sm text-amber-700 mb-4">{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
      >
        <RefreshCw className="w-4 h-4" />
        Thử lại
      </button>
    )}
  </div>
);

/* ============== Main Component ============== */
export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [aiPerformance, setAiPerformance] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [trends, setTrends] = useState([]);
  const [topJobs, setTopJobs] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [overviewRes, aiPerfRes, funnelRes, trendsRes, topJobsRes] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getAIPerformance(),
        analyticsService.getFunnel(),
        analyticsService.getTrends({ days: 28 }),
        analyticsService.getTopJobs(),
      ]);

      setOverview(overviewRes.data?.data || null);
      setAiPerformance(aiPerfRes.data?.data || null);
      setFunnel(funnelRes.data?.data || []);
      setTrends(trendsRes.data?.data || []);
      setTopJobs(topJobsRes.data?.data || []);
    } catch (e) {
      console.error('Load analytics error:', e);
      setError(e.response?.data?.message || e.message || 'Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sanitize trends (đảm bảo number)
  const trendsSafe = useMemo(() => {
    return (trends || []).map(t => ({
      month: t.month,
      applications: toNumber(t.applications),
      avgScore: toNumber(t.avgScore),
    }));
  }, [trends]);

  const hasTrends = trendsSafe && trendsSafe.length > 0;

  // Phân bổ trạng thái (Pie) – Việt hóa nhãn
  const statusDistribution = useMemo(() => {
    if (!overview?.statusCounts) return [];
    return Object.entries(overview.statusCounts)
      .filter(([_, value]) => toNumber(value) > 0)
      .map(([key, value]) => ({
        name: STATUS_VI[key] || key,
        value: toNumber(value),
      }));
  }, [overview]);

  // Phân bố điểm AI
  const scoreDistribution = useMemo(() => {
    const r = overview?.aiMetrics?.scoreRanges;
    if (!r) return [];
    const data = [
      { name: 'Xuất sắc (80-100%)', value: toNumber(r.excellent), color: COLORS.success },
      { name: 'Tốt (60-79%)', value: toNumber(r.good), color: COLORS.primary },
      { name: 'Trung bình (40-59%)', value: toNumber(r.fair), color: COLORS.warning },
      { name: 'Yếu (0-39%)', value: toNumber(r.poor), color: COLORS.danger },
    ];
    return data.filter(item => item.value > 0);
  }, [overview]);

  /* ============== Phễu tuyển dụng + Từ chối ============== */
  const funnelWithRates = useMemo(() => {
    const stages = [];

    // Nếu API funnel có dữ liệu
    if (funnel.length) {
      const total = toNumber(funnel[0]?.count) || 1;

      funnel.forEach(stage => {
        const count = toNumber(stage.count);
        const avgDays = toNumber(stage.avgDays);

        stages.push({
          ...stage,
          count,
          avgDays,
          statusLabel: STATUS_VI[stage.status] || stage.status,
          rate: ((count / total) * 100).toFixed(1),
        });
      });

      // Nếu có số lượng rejected trong overview nhưng chưa có stage rejected trong funnel
      const rejectedCount = toNumber(overview?.statusCounts?.rejected);
      const hasRejectedInFunnel = stages.some(s => s.status === 'rejected');

      if (rejectedCount > 0 && !hasRejectedInFunnel) {
        stages.push({
          status: 'rejected',
          count: rejectedCount,
          avgDays: 0,
          statusLabel: STATUS_VI.rejected,
          rate: ((rejectedCount / total) * 100).toFixed(1),
        });
      }

      return stages;
    }

    // Fallback: không có funnel, dựng từ overview.statusCounts
    const counts = overview?.statusCounts || {};
    const totalApps = toNumber(overview?.totalApplications) || 1;

    Object.entries(counts).forEach(([status, countRaw]) => {
      const count = toNumber(countRaw);
      stages.push({
        status,
        count,
        avgDays: 0,
        statusLabel: STATUS_VI[status] || status,
        rate: ((count / totalApps) * 100).toFixed(1),
      });
    });

    return stages;
  }, [funnel, overview]);

  // Xác định max cho trục X biểu đồ phễu để không dư khoảng trắng
  const funnelXMax = useMemo(() => {
    if (!funnelWithRates.length) return 1;
    let max = 0;
    for (const s of funnelWithRates) {
      max = Math.max(max, toNumber(s.count), toNumber(s.avgDays));
    }
    return Math.max(1, max);
  }, [funnelWithRates]);

  // Sanitize accuracy data
  const accuracyData = useMemo(() => {
    const arr = aiPerformance?.accuracy || [];
    return arr.map(a => ({ ...a, accuracy: toNumber(a.accuracy) }));
  }, [aiPerformance]);

  const hasAccuracy = accuracyData && accuracyData.some(a => a.accuracy > 0);

  // Tổng ứng viên có score
  const totalAppsForSkills = useMemo(() => {
    const metaTotal = toNumber(aiPerformance?.meta?.totalApps);
    if (metaTotal) return metaTotal;
    const scored = toNumber(overview?.aiMetrics?.totalScored);
    if (scored) return scored;
    return Math.max(1, toNumber(overview?.totalApplications, 1));
  }, [aiPerformance, overview]);

  // Xuất báo cáo
  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      overview,
      aiPerformance,
      funnel,
      trends,
      topJobs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Báo cáo & Thống kê</h1>
            <p className="text-sm text-slate-500 mt-1">Đang tải dữ liệu...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo & Thống kê</h1>
          <p className="text-sm text-slate-500 mt-1">
            Phân tích hiệu quả tuyển dụng và AI matching
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
          >
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
          
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={FileText}
          label="Tổng số đơn ứng tuyển"
          value={fmtNumber(overview?.totalApplications || 0)}
          subValue={`${overview?.totalJobs || 0} tin tuyển dụng`}
          color="blue"
        />
        <StatCard 
          icon={CheckCircle}
          label="Tỷ lệ chấp nhận"
          value={`${overview?.conversionRate || 0}%`}
          subValue={`${fmtNumber(overview?.statusCounts?.accepted || 0)} ứng viên`}
          color="green"
        />
        <StatCard 
          icon={Award}
          label="Điểm AI trung bình"
          value={`${toNumber(overview?.aiMetrics?.avgScore).toFixed(1)}%`}
          subValue={`${fmtNumber(overview?.aiMetrics?.totalScored || 0)} CV đã chấm`}
          color="indigo"
        />
        <StatCard 
          icon={Eye}
          label="Tổng lượt xem"
          value={fmtNumber(overview?.totalViews || 0)}
          color="amber"
        />
      </div>

      {/* Charts Row 1: Trends + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Xu hướng ứng tuyển (4 tuần qua)" className="lg:col-span-2">
          <div className="h-80">
            {hasTrends ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsSafe}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="applications" 
                    stroke={COLORS.primary} 
                    fillOpacity={1}
                    fill="url(#colorApplications)"
                    name="Số đơn ứng tuyển"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="avgScore" 
                    stroke={COLORS.success} 
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    name="Điểm AI TB (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-slate-400 mb-2">
                    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Chưa có dữ liệu trong 12 tháng qua</p>
                  <p className="text-xs text-slate-400 mt-1">Dữ liệu sẽ hiển thị khi có ứng viên mới</p>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Phân bố trạng thái">
          <div className="h-80">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Chưa có dữ liệu trạng thái
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Charts Row 2: AI Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Phân bố điểm AI">
          <div className="h-80">
            {scoreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip />
                  <Bar dataKey="value" name="Số lượng">
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Chưa có dữ liệu điểm AI
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Độ chính xác AI theo điểm số">
          <div className="h-80">
            {hasAccuracy ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip formatter={(value) => `${toNumber(value).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="accuracy" fill={COLORS.indigo} name="Tỷ lệ chính xác (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-slate-400 mb-2">
                    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6l2 2v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5l2-2z" 
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Chưa đủ dữ liệu để tính độ chính xác</p>
                  <p className="text-xs text-slate-400 mt-1">Cần có ứng viên "Đã nhận" theo nhóm điểm</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 text-sm text-slate-600">
            <p>📊 Tỷ lệ chính xác = (Số ứng viên được nhận / Tổng số ứng viên trong nhóm điểm) × 100%</p>
          </div>
        </SectionCard>
      </div>

      {/* Charts Row 3: Funnel */}
      <SectionCard title="Phễu tuyển dụng">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funnelWithRates}
              layout="vertical"
              margin={{ left: 0, right: 0, top: 5, bottom: 5 }}
              barCategoryGap={8}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, funnelXMax]}
                allowDecimals={false}
              />
              <YAxis type="category" dataKey="statusLabel" width={120} />
              <Tooltip 
                labelFormatter={(label) => `Giai đoạn: ${label}`}
                formatter={(value, name) => {
                  if (name === 'count') return [value, 'Số lượng'];
                  if (name === 'avgDays') return [value + ' ngày', 'Thời gian TB'];
                  if (name === 'rate') return [value + '%', 'Tỷ lệ'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="count" fill={COLORS.primary} name="Số lượng" />
              <Bar dataKey="avgDays" fill={COLORS.warning} name="Thời gian TB (ngày)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hàng số liệu từng stage */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr gap-4">
          {funnelWithRates.map((stage, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl font-bold text-slate-900">{stage.count}</div>
              <div className="text-xs text-slate-500 mt-1">{stage.statusLabel}</div>
              <div
                className={`text-xs mt-1 ${
                  stage.status === 'rejected' ? 'text-rose-600' : 'text-green-600'
                }`}
              >
                {stage.status === 'rejected'
                  ? `${stage.rate}% bị từ chối`
                  : `${stage.rate}% tỷ lệ giữ lại`}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Skills Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="🎯 Top kỹ năng được match">
          <div className="space-y-3">
            {aiPerformance?.topMatchedSkills?.length ? (
              aiPerformance.topMatchedSkills.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <SkillBadge skill={item.skill} count={item.count} type="matched" />
                  <div className="text-sm text-slate-500">
                    {((toNumber(item.count) / totalAppsForSkills) * 100).toFixed(1)}%
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">Chưa có dữ liệu</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="⚠️ Top kỹ năng bị thiếu">
          <div className="space-y-3">
            {aiPerformance?.topMissingSkills?.length ? (
              aiPerformance.topMissingSkills.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <SkillBadge skill={item.skill} count={item.count} type="missing" />
                  <div className="text-sm text-slate-500">
                    {((toNumber(item.count) / totalAppsForSkills) * 100).toFixed(1)}%
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">Chưa có dữ liệu</div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Top Jobs Table */}
      <SectionCard title="Top công việc theo hiệu suất">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tiêu đề công việc
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Lượt xem
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ứng tuyển
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tỷ lệ chuyển đổi
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Điểm AI TB
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {topJobs.length ? (
                topJobs.map((job, index) => (
                  <tr key={job.id || index} className="hover:bg-slate-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900">
                      <div className="font-medium">{job.title}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 text-center">
                      {fmtNumber(job.views)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 text-center">
                      {fmtNumber(job.applications)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(job.conversionRate) >= 5 
                          ? 'bg-green-100 text-green-800' 
                          : parseFloat(job.conversionRate) >= 2
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {job.conversionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(job.avgScore) >= 70 
                          ? 'bg-green-100 text-green-800' 
                          : parseFloat(job.avgScore) >= 50
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {job.avgScore}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}