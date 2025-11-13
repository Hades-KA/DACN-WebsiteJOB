import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, Flame } from 'lucide-react';
import { jobService } from '../services/api';

const typeViMap = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  contract: 'Thời vụ',
  intern: 'Thực tập',
};

function normalizeJob(j, idx = 0) {
  return {
    id: j.id || j._id || `j-${idx}`,
    title: j.title || j.name || 'Vị trí chưa đặt tên',
    company: j.company || j.employer?.company || j.employer?.name || 'Công ty ẩn danh',
    companyLogo: j.companyLogo || j.employer?.logoUrl || '',
    location: j.location || 'Không rõ',
    salary: j.salary || j.salaryBand || 'Thoả thuận',
    type: j.type || 'full-time',
    createdAt: j.createdAt || j.publishedAt || '',
  };
}

export default function Home() {
  // === STATE & DỮ LIỆU ===
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);

  // Trending carousel
  const trending = ['Java', 'ReactJS', '.NET', 'Tester', 'PHP', 'Business Analyst', 'NodeJS', 'Manager', 'NextJS', 'Python', 'Golang', 'AWS', 'Data Engineer'];
  const [slide, setSlide] = useState(0);
  const pageSize = 8;

  const rawPages = Array.from({ length: Math.ceil(trending.length / pageSize) }, (_, i) =>
    trending.slice(i * pageSize, i * pageSize + pageSize)
  );
  const pages = rawPages.map((group) =>
    group.length < pageSize ? group.concat(trending.slice(0, pageSize - group.length)) : group
  );

  // Tự động chuyển slide trending
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % pages.length), 3000);
    return () => clearInterval(id);
  }, [pages.length]);

  // Thêm shimmer animation vào <head>
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .animated-chip {
        background: linear-gradient(90deg, #ffffff 25%, #7ed9ff 50%, #ffffff 75%);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 2s infinite linear;
        font-weight: 600;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Categories carousel
  const categories = [
    { name: 'Công nghệ thông tin', jobs: 1200, emoji: '💻' },
    { name: 'Marketing', jobs: 800, emoji: '🛍️' },
    { name: 'Tài chính - Kế toán', jobs: 600, emoji: '🏛️' },
    { name: 'Kinh doanh', jobs: 950, emoji: '📈' },
    { name: 'Thiết kế', jobs: 400, emoji: '✏️' },
    { name: 'Nhân sự', jobs: 350, emoji: '👥' },
    { name: 'Khởi nghiệp', jobs: 300, emoji: '🚀' },
    { name: 'Xây dựng', jobs: 550, emoji: '🛠️' },
    { name: 'Y tế', jobs: 420, emoji: '🏥' },
    { name: 'Ngoại ngữ', jobs: 280, emoji: '🌐' },
    { name: 'Giáo dục', jobs: 480, emoji: '🎓' },
    { name: 'Dịch vụ khách hàng', jobs: 630, emoji: '🎧' },
  ];
  const [catSlide, setCatSlide] = useState(0);
  const catPageSize = 6;
  const catRawPages = Array.from({ length: Math.ceil(categories.length / catPageSize) }, (_, i) =>
    categories.slice(i * catPageSize, i * catPageSize + catPageSize)
  );
  const catPages = catRawPages.map((g) =>
    g.length < catPageSize ? g.concat(categories.slice(0, catPageSize - g.length)) : g
  );
  const catTimer = useRef(null);
  useEffect(() => {
    if (catPages.length <= 1) return;
    catTimer.current = setInterval(() => setCatSlide((s) => (s + 1) % catPages.length), 3600);
    return () => catTimer.current && clearInterval(catTimer.current);
  }, [catPages.length]);

  // Featured Jobs (server)
  const [featSlide, setFeatSlide] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        // Lấy job nổi bật trước
        const r1 = await jobService.getAllJobs({ featured: true, limit: 6, sort: 'newest' });
        const list1 = Array.isArray(r1?.data?.data) ? r1.data.data : (Array.isArray(r1?.data) ? r1.data : []);
        if (active && list1.length > 0) {
          setJobs(list1.map((j, i) => normalizeJob(j, i)));
          return;
        }
        // Fallback: lấy newest nếu chưa có featured
        const r2 = await jobService.getAllJobs({ limit: 6, sort: 'newest' });
        const list2 = Array.isArray(r2?.data?.data) ? r2.data.data : (Array.isArray(r2?.data) ? r2.data : []);
        if (active) setJobs(list2.map((j, i) => normalizeJob(j, i)));
      } catch {
        if (active) setJobs([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Tạo pages cho slider nổi bật (3 card mỗi trang)
  const featuredJobs = jobs; // đã giới hạn 6 ở API
  const featPageSize = 3;
  const featRawPages = Array.from({ length: Math.ceil(featuredJobs.length / featPageSize) }, (_, i) =>
    featuredJobs.slice(i * featPageSize, i * featPageSize + featPageSize)
  );
  const featPages = featRawPages;
  const featTimer = useRef(null);
  useEffect(() => {
    if (featPages.length <= 1) return;
    featTimer.current = setInterval(() => setFeatSlide((s) => (s + 1) % featPages.length), 3600);
    return () => featTimer.current && clearInterval(featTimer.current);
  }, [featPages.length]);

  const onSearch = () => {
    const q = search.trim();
    if (!q) return navigate('/jobs');
    navigate(`/jobs?search=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <section className="relative bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 text-white overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-20 relative text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-sm mb-4 backdrop-blur-sm mx-auto">
            <Rocket className="w-4 h-4 mr-2" /> Tìm việc nhanh hơn với AI
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-3 drop-shadow-sm">
            Tìm việc làm mơ ước của bạn
          </h1>
          <p className="text-white/90 mb-6">
            Hơn 10,000 việc làm đang chờ đợi bạn. Tìm kiếm, ứng tuyển và theo dõi thật dễ dàng.
          </p>

          {/* Thanh tìm kiếm */}
          <div className="bg-white rounded-2xl p-2 shadow-xl flex items-center gap-2 max-w-3xl mx-auto">
            <div className="flex items-center flex-1">
              <Search className="w-5 h-5 text-gray-500 ml-2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="Tìm kiếm việc làm, vị trí, công ty..."
                className="flex-1 px-3 py-2 outline-none text-gray-800"
              />
            </div>
            <button onClick={onSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl" type="button">
              Tìm kiếm
            </button>
          </div>

          {/* Trending carousel (có hiệu ứng shimmer) */}
          <div
            className="mt-16 relative overflow-hidden rounded-[30px] border border-white/25 bg-white/5 backdrop-blur-sm pt-3 pb-4 max-w-2xl mx-auto"
            onMouseEnter={() => catTimer.current && clearInterval(catTimer.current)}
            onMouseLeave={() => {
              if (catPages.length > 1) {
                catTimer.current = setInterval(() => setCatSlide((s) => (s + 1) % catPages.length), 3600);
              }
            }}
          >
            <div className="px-4 pb-2 flex items-center text-white/95">
              <Flame className="w-5 h-5 mr-2" />
              <span className="font-semibold text-sm">Xu hướng tuyển dụng nổi bật</span>
            </div>
            <div className="w-full overflow-hidden">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ width: `${pages.length * 100}%`, transform: `translateX(-${slide * (100 / pages.length)}%)` }}
              >
                {pages.map((group, gi) => (
                  <div key={gi} className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 px-4">
                    {group.map((tag, idx) => (
                      <button
                        key={`${gi}-${idx}`}
                        onClick={() => navigate(`/jobs?skill=${encodeURIComponent(tag)}`)}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-white text-sm md:text-[15px] ring-1 ring-white/20 hover:bg-white/10 transition"
                        type="button"
                      >
                        <span className="animated-chip">{tag}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {pages.length > 1 && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                    aria-label={`Trang ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ngành nghề phổ biến */}
      <section className="container mx-auto px-4 mt-10">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">Ngành nghề phổ biến</h2>
        <div
          className="relative max-w-5xl mx-auto overflow-hidden"
          onMouseEnter={() => catTimer.current && clearInterval(catTimer.current)}
          onMouseLeave={() => {
            if (catPages.length > 1) {
              catTimer.current = setInterval(() => setCatSlide((s) => (s + 1) % catPages.length), 3600);
            }
          }}
        >
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
            style={{
              width: `${catPages.length * 100}%`,
              transform: `translateX(-${catSlide * (100 / catPages.length)}%)`,
            }}
          >
            {catPages.map((group, gi) => (
              <div key={gi} className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-1">
                {group.map((c, i) => (
                  <div
                    key={`${gi}-${c.name}-${i}`}
                    className="group bg-white border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border flex items-center justify-center text-xl">
                      <span aria-hidden>{c.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.jobs} việc làm</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      {!loading && featuredJobs.length > 0 && (
        <section className="container mx-auto px-4 mt-12 mb-16">
          <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">Việc làm mới nhất</h2>
          <div
            className="relative max-w-6xl mx-auto overflow-hidden"
            onMouseEnter={() => featTimer.current && clearInterval(featTimer.current)}
            onMouseLeave={() => {
              if (featPages.length > 1) {
                featTimer.current = setInterval(() => setFeatSlide((s) => (s + 1) % featPages.length), 3600);
              }
            }}
          >
            <div
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
              style={{
                width: `${featPages.length * 100}%`,
                transform: `translateX(-${featSlide * (100 / featPages.length)}%)`,
              }}
            >
              {featPages.map((group, gi) => (
                <div key={gi} className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
                  {group.map((job, i) => (
                    <div
                      key={`${gi}-${job.id}-${i}`}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 cursor-pointer"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt="logo" className="w-10 h-10 rounded-lg object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 line-clamp-2">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.company}</p>
                        </div>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4">
                        <li>📍 {job.location}</li>
                        <li>💰 {job.salary}</li>
                        <li>⏱️ {typeViMap[job.type] || job.type}</li>
                      </ul>
                      <button
                        className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white py-2.5 text-sm font-medium hover:opacity-95"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                      >
                        Ứng tuyển ngay
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {featPages.length > 1 && (
              <div className="absolute -bottom-5 inset-x-0 flex justify-center gap-2">
                {featPages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFeatSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${i === featSlide ? 'w-6 bg-gray-700' : 'w-2 bg-gray-300'}`}
                    aria-label={`Trang nổi bật ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Loading skeletons */}
      {loading && (
        <section className="container mx-auto px-4 mt-12 mb-16">
          <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">Việc làm mới nhất</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-9 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}