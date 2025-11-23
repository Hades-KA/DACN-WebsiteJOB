// client/src/pages/SavedJobs.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { jobService } from '../services/api';
import { 
  Briefcase, MapPin, DollarSign, Clock, Heart, 
  Trash2, ExternalLink, Filter, Search,
  Calendar, Building2, Sparkles, ArrowRight,
  ChevronDown, Check, XCircle, Layers
} from 'lucide-react';

const typeViMap = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  contract: 'Hợp đồng',
  intern: 'Thực tập',
};

const API_ORIGIN = (api?.defaults?.baseURL || '').replace(/\/api\/?$/i, '');

const toAbsoluteUrl = (u) => {
  if (!u) return '';
  const s = String(u);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `${API_ORIGIN}${s}`;
  return s;
};

function pickLogo(job = {}) {
  const candidates = [
    job.companyLogo,
    job.logoUrl,
    job.logo,
    job.company_logo,
    job.companyLogoUrl,
    job.company?.logoUrl,
    job.company?.logo,
    job.employer?.logoUrl,
    job.image,
  ];
  for (const u of candidates) {
    if (u && String(u).trim()) return toAbsoluteUrl(u);
  }
  return '';
}

function normalizeSaved(item, idx = 0) {
  const j = item?.job || item || {};
  const companyName = j.company?.name || j.company?.companyName || j.company || 'Công ty ẩn danh';

  return {
    savedId: item?.job ? (item.id || item.savedId || null) : null,
    id: j.id || j._id || `j-${idx}`,
    title: j.title || j.name || 'Vị trí chưa đặt tên',
    company: companyName,
    companyLogo: pickLogo(j),
    location: j.location || '',
    salary: j.salary || j.salaryBand || 'Thoả thuận',
    type: j.type || '',
    postedAt: j.createdAt || j.publishedAt || j.created_at || null,
  };
}

function formatDate(d) {
  try {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const now = new Date();
    const diff = now - dt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    return dt.toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
}

function Logo({ src, alt }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
        <Building2 className="w-8 h-8" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || 'logo'}
      className="w-16 h-16 rounded-2xl object-contain border-2 border-white bg-white shadow-lg"
      loading="lazy"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg w-3/4" />
          <div className="h-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg w-2/5" />
          <div className="flex gap-2">
            <div className="h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24" />
            <div className="h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-28" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <div className="h-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex-1" />
        <div className="h-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl w-24" />
      </div>
    </div>
  );
}

// Custom Dropdown Component (ĐÃ BỎ COUNT)
function CustomDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const Icon = selectedOption?.icon || Filter;

  return (
    <div className="relative min-w-[240px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-medium text-gray-700">{selectedOption?.label}</span>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-slideDown">
          <div className="p-2">
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all group ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-white/20'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50'
                    }`}>
                      <OptionIcon className={`w-4 h-4 ${
                        isSelected ? 'text-white' : 'text-blue-600'
                      }`} />
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  
                  {isSelected && (
                    <Check className="w-5 h-5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

async function withConcurrency(list, limit, worker) {
  const ret = new Array(list.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++;
      ret[idx] = await worker(list[idx], idx);
    }
  });
  await Promise.all(runners);
  return ret;
}

export default function SavedJobs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unsavingId, setUnsavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/saved-jobs');
      const raw = res?.data?.data || res?.data || [];
      const list = Array.isArray(raw) ? raw : [];
      let normalized = list.map((it, i) => normalizeSaved(it, i));

      const needLogo = normalized
        .map((it, idx) => ({ it, idx }))
        .filter(({ it }) => !it.companyLogo);

      if (needLogo.length) {
        const enriched = await withConcurrency(needLogo, 5, async ({ it, idx }) => {
          try {
            const d = await jobService.getJobById(it.id);
            const j = d?.data?.data || d?.data || {};
            const logo = pickLogo(j);
            return {
              idx,
              patch: {
                companyLogo: logo || it.companyLogo,
                location: it.location || j.location || '',
                salary: it.salary || j.salary || j.salaryBand || 'Thoả thuận',
                type: it.type || j.type || '',
                postedAt: it.postedAt || j.createdAt || j.publishedAt || null,
              },
            };
          } catch {
            return { idx, patch: {} };
          }
        });

        enriched.forEach(({ idx, patch }) => {
          normalized[idx] = { ...normalized[idx], ...patch };
        });
      }

      setItems(normalized);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được danh sách đã lưu');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUnsave = async (item) => {
    const idForApi = item.savedId || item.id;
    if (!idForApi) return;
    try {
      setUnsavingId(idForApi);
      await api.delete(`/saved-jobs/${idForApi}`);
      setItems((prev) => prev.filter((x) => (x.savedId || x.id) !== idForApi));
    } catch (err) {
      alert(err?.response?.data?.message || 'Bỏ lưu thất bại, vui lòng thử lại');
    } finally {
      setUnsavingId(null);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'Tất cả loại hình', icon: Layers },
    { value: 'full-time', label: 'Toàn thời gian', icon: Briefcase },
    { value: 'part-time', label: 'Bán thời gian', icon: Clock },
    { value: 'contract', label: 'Hợp đồng', icon: Calendar },
    { value: 'intern', label: 'Thực tập', icon: Building2 },
  ];

  const filteredItems = items.filter(job => {
    const matchSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || job.type === filterType;
    return matchSearch && matchType;
  });

  const count = filteredItems.length;
  const totalCount = items.length;
  const hasError = !!error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-16 relative">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Heart className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                Việc làm đã lưu
                <Sparkles className="w-7 h-7 text-yellow-300" />
              </h1>
              <p className="text-blue-100 text-base mt-2">
                Quản lý các cơ hội nghề nghiệp yêu thích của bạn
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 pb-12 relative z-10">
        {!loading && !hasError && totalCount > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên công việc hoặc công ty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              <CustomDropdown
                value={filterType}
                onChange={setFilterType}
                options={filterOptions}
              />
            </div>

            {(searchTerm || filterType !== 'all') && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Tìm thấy <span className="font-semibold text-blue-600">{count}</span> kết quả
                  {filterType !== 'all' && (
                    <span className="text-gray-500">
                      {' '}trong "{filterOptions.find(o => o.value === filterType)?.label}"
                    </span>
                  )}
                </div>
                {(searchTerm || filterType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {hasError && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto mb-4">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Oops! Có lỗi xảy ra</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={load}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {loading && !hasError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !hasError && totalCount === 0 && (
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-2xl border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white grid place-items-center mx-auto shadow-lg">
              <Heart className="w-10 h-10" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Chưa có việc làm được lưu</h2>
            <p className="mt-3 text-gray-600 max-w-md mx-auto">
              Hãy khám phá hàng nghìn cơ hội việc làm tuyệt vời và lưu lại những vị trí yêu thích để xem sau.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all"
              >
                <Search className="w-5 h-5" />
                Khám phá việc làm
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 border border-gray-200 transition-all"
              >
                Hoàn thiện hồ sơ
              </Link>
            </div>
          </div>
        )}

        {!loading && !hasError && totalCount > 0 && count === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 grid place-items-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Không tìm thấy kết quả</h3>
            <p className="text-gray-600 mt-2">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {!loading && !hasError && count > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((job) => (
              <div
                key={`${job.savedId || job.id}`}
                className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-300 overflow-hidden"
              >
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Logo src={job.companyLogo} alt={job.company} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 text-lg leading-tight mb-2">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate font-medium">{job.company}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-green-600">{job.salary}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {job.type && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {typeViMap[job.type] || job.type}
                      </span>
                    )}
                    {job.postedAt && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-100">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(job.postedAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 group/btn"
                    >
                      <span>Xem chi tiết</span>
                      <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </Link>
                    <button
                      onClick={() => handleUnsave(job)}
                      disabled={unsavingId === (job.savedId || job.id)}
                      className="px-4 py-3 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all group/del"
                      title="Bỏ lưu"
                    >
                      {unsavingId === (job.savedId || job.id) ? (
                        <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-5 h-5 group-hover/del:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .bg-grid-white\/10 {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}