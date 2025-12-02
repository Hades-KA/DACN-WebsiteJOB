// client/src/pages/Jobs.jsx
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search as SearchIcon,
  MapPin,
  Briefcase,
  SlidersHorizontal,
  XCircle,
  CalendarDays,
  GraduationCap,
  BadgeDollarSign,
  ChevronDown,
  Check,
  Heart,
} from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import api, { jobService } from '../services/api';

/* ================= Filters & Mapping ================= */
const FILTERS = {
  category: ['CNTT', 'Marketing', 'Kinh doanh', 'Thiết kế', 'Tài chính', 'Nhân sự'],
  level: ['Thực tập sinh', 'Nhân viên', 'Trưởng phòng', 'Quản lý', 'Giám đốc'],
  experience: ['Dưới 1 năm', '1-3 năm', '3-5 năm', '5-10 năm', 'Trên 10 năm'],
  salary: ['Dưới 5 triệu', '5-10 triệu', '10-20 triệu', 'Trên 20 triệu'],
  education: ['THPT', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'],
  type: ['Toàn thời gian', 'Bán thời gian', 'Thời vụ', 'Thực tập'],
  posted: ['Hôm nay', '3 ngày', '1 tuần', '2 tuần', '1 tháng'],
};

const typeViMap = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  contract: 'Thời vụ',
  intern: 'Thực tập',
};
const typeEnMap = {
  'Toàn thời gian': 'full-time',
  'Bán thời gian': 'part-time',
  'Thời vụ': 'contract',
  'Thực tập': 'intern',
};

/* ========== BÀI VIẾT MỚI ========== */
const GUIDE_POSTS = [
  {
    id: 1,
    title: 'Cách viết CV ấn tượng cho sinh viên mới ra trường',
    category: 'Kỹ năng viết CV',
    date: '20/3/2024',
    excerpt:
      'Hướng dẫn chi tiết cách tạo CV chuyên nghiệp cho sinh viên mới tốt nghiệp.',
  },
  {
    id: 2,
    title: '10 xu hướng ngành nghề hot nhất 2024',
    category: 'Xu hướng việc làm',
    date: '18/3/2024',
    excerpt:
      'Khám phá những ngành nghề đang có nhu cầu cao nhất trên thị trường.',
  },
  {
    id: 3,
    title: 'Kỹ năng phỏng vấn online hiệu quả',
    category: 'Phỏng vấn',
    date: '15/3/2024',
    excerpt:
      'Những bí quyết để thành công trong buổi phỏng vấn trực tuyến.',
  },
  {
    id: 4,
    title: '5 cách đàm phán lương hiệu quả',
    category: 'Phát triển sự nghiệp',
    date: '12/3/2024',
    excerpt:
      'Chiến lược đàm phán lương thành công cho người đi làm.',
  },
  {
    id: 5,
    title: 'LinkedIn: Công cụ tìm việc hiệu quả',
    category: 'Kỹ năng tìm việc',
    date: '10/3/2024',
    excerpt:
      'Tối ưu hóa profile LinkedIn để thu hút nhà tuyển dụng.',
  },
  {
    id: 6,
    title: 'Quản lý thời gian hiệu quả trong công việc',
    category: 'Kỹ năng làm việc',
    date: '8/3/2024',
    excerpt:
      'Phương pháp quản lý thời gian 4D giúp tăng năng suất.',
  },
  {
    id: 7,
    title: 'Xây dựng Personal Branding trong thời đại số',
    category: 'Phát triển cá nhân',
    date: '5/3/2024',
    excerpt:
      'Chiến lược xây dựng thương hiệu cá nhân trên các nền tảng số.',
  },
  {
    id: 8,
    title: 'Kỹ năng làm việc nhóm trong môi trường đa văn hóa',
    category: 'Kỹ năng mềm',
    date: '2/3/2024',
    excerpt:
      'Những điều cần biết khi làm việc trong môi trường đa quốc gia.',
  },
];

/* ================= UI: Select pill ================= */
function SelectPill({ icon: Icon, value, onChange, placeholder, options, className }) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className || ''}`}>
        <Listbox.Button
          className="
            group flex items-center gap-2 bg-white text-gray-700
            rounded-full h-11 pl-3 pr-9 border border-gray-200 shadow-sm
            hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40
            w-full min-w-0
          "
        >
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          <span className={`text-sm truncate ${!value ? 'text-gray-400' : ''}`}>
            {value || placeholder}
          </span>
          <ChevronDown className="pointer-events-none absolute right-3 w-4 h-4 text-gray-400" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Listbox.Options
            className="
              absolute z-50 mt-2 w-full max-h-72 overflow-auto
              rounded-2xl bg-white p-2 shadow-xl ring-0 border border-gray-200
            "
          >
            {options.map((o) => (
              <Listbox.Option
                key={o}
                value={o}
                className={({ active }) =>
                  `flex items-center justify-between gap-2 cursor-pointer select-none
                   rounded-lg px-3 py-2 text-sm
                   ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                }
              >
                {({ selected }) => (
                  <>
                    <span className="whitespace-nowrap">{o}</span>
                    {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

/* ================= Helpers ================= */
function timeAgo(d) {
  if (!d) return '';
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const day = Math.floor(diff / 86400000);
  if (day <= 0) return 'Hôm nay';
  if (day === 1) return '1 ngày trước';
  return `${day} ngày trước`;
}

/* ================= List Item (giống video + nút Lưu) ================= */
function JobListItem({ job, onClick, saved, saving, onToggleSave, useAI }) {
  return (
    <div
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="relative bg-white border rounded-xl p-4 hover:shadow-sm transition cursor-pointer min-h-[92px]"
    >
      {/* Nội dung trái (logo + info) */}
      <div className="flex items-start gap-3 pr-24">
        {job.companyLogo ? (
          <img
            src={job.companyLogo}
            alt="logo"
            className="w-25 h-20 rounded-md object-cover border"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-gray-100 border" />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{job.title}</p>
          <p className="text-sm text-gray-500 truncate">{job.company}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-rose-600 font-semibold">
              {job.salary || job.salaryBand || 'Thoả thuận'}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location || 'Không rõ'}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              {timeAgo(job.createdAt) || 'Mới đăng'}
            </span>
          </div>

          {/* Thông tin AI gợi ý */}
          {useAI && typeof job.scoreTotal === 'number' && (
            <div className="mt-1 text-xs text-blue-600">
              AI đánh giá mức độ phù hợp: {Math.round(job.scoreTotal)}%
            </div>
          )}
          {useAI && job.explanation && (
            <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">
              {job.explanation}
            </div>
          )}
        </div>
      </div>

      {/* Nút lưu job */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.(job);
        }}
        disabled={saving}
        className={`absolute right-4 bottom-3 text-sm inline-flex items-center gap-1 px-2 py-1 rounded-md
          ${
            saved
              ? 'text-rose-600 hover:text-rose-700'
              : 'text-violet-600 hover:text-violet-700'
          }
          disabled:opacity-60`}
        title={saved ? 'Bỏ lưu' : 'Lưu'}
      >
        <Heart
          className="w-4 h-4"
          fill={saved ? 'currentColor' : 'none'}
          strokeWidth={1.8}
        />
        {saving ? '...' : saved ? 'Đã lưu' : 'Lưu'}
      </button>
    </div>
  );
}

/* ================= Page ================= */
export default function Jobs() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const currentYear = new Date().getFullYear();

  // State filter từ URL
  const [keyword, setKeyword] = useState(params.get('search') || '');
  const [skill, setSkill] = useState(params.get('skill') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [level, setLevel] = useState(params.get('level') || '');
  const [experience, setExperience] = useState(params.get('experience') || '');
  const [salary, setSalary] = useState(params.get('salary') || '');
  const [education, setEducation] = useState(params.get('education') || '');
  const [type, setType] = useState(params.get('type') || '');
  const [posted, setPosted] = useState(params.get('posted') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(params.get('page') || '1', 10) || 1);
  const limit = 12;

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ totalItems: 0, totalPages: 0 });

  // Saved map: jobId -> savedId (hoặc true)
  const [savedMap, setSavedMap] = useState({});
  const [savingMap, setSavingMap] = useState({});

  // AI mode
  const [useAI, setUseAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // Fetch saved jobs (nếu đã đăng nhập)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const res = await api.get('/saved-jobs');
        const list = res?.data?.data || res?.data || [];
        const map = {};
        list.forEach((it) => {
          const j = it?.job || it || {};
          const jid = j.id || j._id;
          const sid = it?.id || it?.savedId || it?._id || null;
          if (jid) map[jid] = sid || true;
        });
        if (active) setSavedMap(map);
      } catch {
        if (active) setSavedMap({});
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch server-side / AI mỗi khi filter/sort/page/useAI đổi
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setAiError('');

        if (useAI) {
          // ===== CHẾ ĐỘ AI: gọi API gợi ý job =====
          const token = localStorage.getItem('token');
          if (!token) {
            if (active) {
              setJobs([]);
              setMeta({ totalItems: 0, totalPages: 0 });
              setAiError('Vui lòng đăng nhập để AI gợi ý việc làm phù hợp.');
            }
            return;
          }

          // Lấy candidateId từ localStorage.user
          let me = null;
          try {
            const raw = localStorage.getItem('user');
            if (raw && raw !== 'undefined' && raw !== 'null') {
              me = JSON.parse(raw);
            }
          } catch {
            me = null;
          }
          const candidateId = me?.id || me?.userId || me?._id || null;
          if (!candidateId) {
            if (active) {
              setJobs([]);
              setMeta({ totalItems: 0, totalPages: 0 });
              setAiError(
                'Không xác định được hồ sơ ứng viên. Vui lòng đăng nhập lại.'
              );
            }
            return;
          }

          const res = await api.get(
            `/ai/job-recommendations/${candidateId}?threshold=60`
          );
          if (!active) return;
          const list = res?.data?.data || res?.data || [];
          const mapped = Array.isArray(list)
            ? list.map((item, i) => ({
                id: item.job.id || `ai-${i}`,
                title: item.job.title,
                company: item.job.company,
                companyLogo: item.job.companyLogo || '',
                location: item.job.location || '',
                salary: item.job.salary || 'Thoả thuận',
                createdAt: item.job.createdAt || null,   // ✅ DÙNG NGÀY TỪ BACKEND
                category: '',
                scoreTotal: item.scoreTotal || 0,
                explanation: item.explanation || '',
              }))
            : [];

          setJobs(mapped);
          setMeta({ totalItems: mapped.length, totalPages: 1 });
        } else {
          // ===== CHẾ ĐỘ THƯỜNG: gọi jobService như trước =====
          const query = { page, limit, sort };
          if (keyword.trim()) query.search = keyword.trim();
          if (skill.trim()) query.skills = skill.trim();
          if (location.trim()) query.location = location.trim();
          if (category) query.category = category;
          if (level) query.level = level;
          if (experience) query.experience = experience;
          if (salary) query.salary = salary;
          if (education) query.education = education;
          if (type) query.type = typeEnMap[type] || type;
          if (posted) query.posted = posted;

          const res = await jobService.getAllJobs(query);
          const raw = res?.data || {};
          const list = Array.isArray(raw.data)
            ? raw.data
            : Array.isArray(raw)
            ? raw
            : [];
          const pagination =
            raw.pagination || raw.meta || { totalItems: list.length, totalPages: 1 };

          if (!active) return;
          setJobs(
            list.map((j, i) => ({
              id: j.id || j._id || `j-${i}`,
              title: j.title || j.name || '',
              company:
                j.company ||
                j.employer?.company ||
                j.employer?.name ||
                'Công ty ẩn danh',
              companyLogo: j.companyLogo || j.employer?.logoUrl || '',
              location: j.location || '',
              salary: j.salary || '',
              salaryBand: j.salaryBand || '',
              type: j.type || '',
              createdAt: j.createdAt || j.publishedAt || '',
              category: j.category || '',
            }))
          );
          setMeta({
            totalItems: parseInt(pagination.totalItems || 0, 10),
            totalPages: parseInt(pagination.totalPages || 1, 10),
          });
        }
      } catch (e) {
        if (!active) return;
        setJobs([]);
        setMeta({ totalItems: 0, totalPages: 0 });
        if (useAI) {
          setAiError(
            e?.response?.data?.message ||
              e.message ||
              'Không thể lấy danh sách việc làm gợi ý từ AI.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    keyword,
    skill,
    location,
    category,
    level,
    experience,
    salary,
    education,
    type,
    posted,
    sort,
    page,
    useAI,
  ]);

  // Đồng bộ URL (không sync useAI vào URL)
  useEffect(() => {
    const next = new URLSearchParams();
    if (keyword.trim()) next.set('search', keyword.trim());
    if (skill.trim()) next.set('skill', skill.trim());
    if (location.trim()) next.set('location', location.trim());
    if (category) next.set('category', category);
    if (level) next.set('level', level);
    if (experience) next.set('experience', experience);
    if (salary) next.set('salary', salary);
    if (education) next.set('education', education);
    if (type) next.set('type', type);
    if (posted) next.set('posted', posted);
    if (sort) next.set('sort', sort);
    next.set('page', String(page));
    setParams(next, { replace: true });
  }, [
    keyword,
    skill,
    location,
    category,
    level,
    experience,
    salary,
    education,
    type,
    posted,
    sort,
    page,
    setParams,
  ]);

  const total = meta.totalItems || jobs.length;

  const resetFilters = () => {
    setKeyword('');
    setSkill('');
    setLocation('');
    setCategory('');
    setLevel('');
    setExperience('');
    setSalary('');
    setEducation('');
    setType('');
    setPosted('');
    setSort('newest');
    setPage(1);
  };

  const isSaved = (jobId) => !!savedMap[jobId];
  const isSaving = (jobId) => !!savingMap[jobId];

  const toggleSave = async (job) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      setSavingMap((m) => ({ ...m, [job.id]: true }));
      if (!isSaved(job.id)) {
        const res = await api.post('/saved-jobs', { jobId: job.id });
        const data = res?.data?.data || res?.data || {};
        const sid = data.id || data.savedId || job.id;
        setSavedMap((m) => ({ ...m, [job.id]: sid }));
      } else {
        const delId = savedMap[job.id] || job.id;
        await api.delete(`/saved-jobs/${delId}`);
        setSavedMap((m) => {
          const n = { ...m };
          delete n[job.id];
          return n;
        });
      }
    } catch {
      // im lặng
    } finally {
      setSavingMap((m) => {
        const n = { ...m };
        delete n[job.id];
        return n;
      });
    }
  };

  return (
    <div>
      {/* Filter bar */}
      <section className="relative bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 text-white border-b border-gray-200">
        <div className="container mx-auto max-w-7xl px-4 py-5">
          {/* Hàng 1 */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 min-w-0">
              <div className="relative flex items-center gap-2 bg-white text-gray-800 rounded-full px-4 h-11 border border-gray-200 shadow-sm w-full">
                <SearchIcon className="w-5 h-5 text-gray-500" />
                <input
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm kiếm cơ hội việc làm"
                  className="flex-1 bg-transparent outline-none text-sm"
                  disabled={useAI}
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-3 min-w-0">
              <SelectPill
                icon={Briefcase}
                value={skill}
                onChange={(v) => {
                  setSkill(v);
                  setPage(1);
                }}
                placeholder="Lọc theo nghề nghiệp"
                options={['Java', 'ReactJS', 'NodeJS', 'Python']}
                className="w-full"
              />
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={MapPin}
                value={location}
                onChange={(v) => {
                  setLocation(v);
                  setPage(1);
                }}
                placeholder="Lọc theo tỉnh thành"
                options={['Hà Nội', 'Đà Nẵng', 'TP.HCM']}
                className="w-full"
              />
            </div>
          </div>

          {/* Hàng 2 */}
          <div className="mt-3 grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={Briefcase}
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
                placeholder="Ngành nghề"
                options={FILTERS.category}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={SlidersHorizontal}
                value={level}
                onChange={(v) => {
                  setLevel(v);
                  setPage(1);
                }}
                placeholder="Cấp bậc"
                options={FILTERS.level}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={SlidersHorizontal}
                value={experience}
                onChange={(v) => {
                  setExperience(v);
                  setPage(1);
                }}
                placeholder="Kinh nghiệm"
                options={FILTERS.experience}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={BadgeDollarSign}
                value={salary}
                onChange={(v) => {
                  setSalary(v);
                  setPage(1);
                }}
                placeholder="Mức lương"
                options={FILTERS.salary}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={GraduationCap}
                value={education}
                onChange={(v) => {
                  setEducation(v);
                  setPage(1);
                }}
                placeholder="Học vấn"
                options={FILTERS.education}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={Briefcase}
                value={type}
                onChange={(v) => {
                  setType(v);
                  setPage(1);
                }}
                placeholder="Loại công việc"
                options={FILTERS.type}
              />
            </div>
          </div>

          {/* Hàng 3 */}
          <div className="mt-3 grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <SelectPill
                icon={CalendarDays}
                value={posted}
                onChange={(v) => {
                  setPosted(v);
                  setPage(1);
                }}
                placeholder="Đăng trong"
                options={FILTERS.posted}
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2 min-w-0">
              <button
                onClick={resetFilters}
                type="button"
                className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-sm shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Nội dung */}
      <section className="container mx-auto max-w-7xl px-4 pt-4 pb-6">
        <div className="mb-4">
          <div className="text-sm">
            <Link to="/" className="text-blue-600 hover:underline">
              Trang Chủ
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600">Tuyển dụng</span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {useAI ? (
                  <>
                    Việc làm phù hợp với bạn (AI){' '}
                    <span className="text-blue-600">{total}</span> việc
                  </>
                ) : (
                  <>
                    Tuyển dụng{' '}
                    <span className="text-blue-600">{total}</span> việc làm mới
                    nhất năm <span className="text-rose-600">{currentYear}</span>
                  </>
                )}
              </h1>
              {useAI && (
                <p className="text-xs text-gray-500">
                  AI phân tích CV của bạn và gợi ý những công việc có mức độ phù
                  hợp kỹ năng cao nhất.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setUseAI((prev) => !prev);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  useAI
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}
                title="AI sẽ dựa trên CV của bạn để gợi ý việc làm phù hợp"
              >
                {useAI ? 'Đang xem việc phù hợp (AI)' : 'Tìm việc phù hợp (AI)'}
              </button>

              {!useAI && (
                <>
                  <label
                    htmlFor="sort"
                    className="text-sm text-gray-500"
                  >
                    Sắp xếp:
                  </label>
                  <select
                    id="sort"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 px-3 text-sm bg-white border rounded-lg"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {useAI && aiError && (
            <div className="mt-2 text-sm text-red-500">{aiError}</div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Danh sách việc làm */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[96px] bg-white border rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 border rounded-2xl bg-white">
                <div className="text-3xl mb-2">🗂️</div>
                <p>0 việc làm</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobListItem
                    key={job.id}
                    job={job}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    saved={!!savedMap[job.id]}
                    saving={!!savingMap[job.id]}
                    onToggleSave={toggleSave}
                    useAI={useAI}
                  />
                ))}
              </div>
            )}

            {/* Pagination - chỉ dùng khi không phải AI mode */}
            {!useAI && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 h-9 rounded-full border bg-white text-gray-700 disabled:opacity-50"
                >
                  ← Trước
                </button>
                <span className="text-sm text-gray-600">
                  Trang {page} / {Math.max(1, meta.totalPages || 1)}
                </span>
                <button
                  onClick={() =>
                    setPage((p) =>
                      meta.totalPages
                        ? Math.min(meta.totalPages, p + 1)
                        : p + 1
                    )
                  }
                  disabled={meta.totalPages ? page >= meta.totalPages : false}
                  className="px-4 h-9 rounded-full border bg-white text-gray-700 disabled:opacity-50"
                >
                  Sau →
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Công ty nổi bật */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Công ty nổi bật
              </h3>
              <div className="text-sm text-gray-500 flex items-center justify-center h-24">
                No data
              </div>
            </div>

            {/* Bài viết mới */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Bài viết mới</h3>
              <div className="space-y-3">
                {GUIDE_POSTS.slice(0, 6).map((post) => (
                  <div
                    key={post.id}
                    className="pb-3 border-b last:border-b-0 last:pb-0"
                  >
                    <Link
                      to="/guide"
                      className="block text-sm font-semibold text-pink-700 hover:underline"
                    >
                      {post.title}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-pink-600 font-medium">
                      {post.category}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="mt-1 flex items-center text-[11px] text-gray-400 gap-1">
                      <CalendarDays className="w-3 h-3" />
                      <span>{post.date}</span>
                    </div>
                  </div>
                ))}
                <Link
                  to="/guide"
                  className="block mt-1 text-xs text-pink-600 hover:underline text-right"
                >
                  Xem tất cả
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}