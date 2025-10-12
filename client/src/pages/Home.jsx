import React, { useEffect, useState } from 'react';
import { Search, Briefcase, Building2, MapPin, Rocket } from 'lucide-react';
import JobCard from '../components/JobCard';
import { jobService } from '../services/api';

function Home() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await jobService.getAllJobs();
        setJobs(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (e) {
        console.log('Server chưa chạy hoặc lỗi kết nối:', e.message);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div>
      {/* Hero section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-sm mb-4">
              <Rocket className="w-4 h-4 mr-2" /> Tìm việc nhanh hơn với AI
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
              Khám phá công việc phù hợp nhất dành cho bạn
            </h1>
            <p className="text-white/90 mb-6">
              Tìm kiếm, ứng tuyển và theo dõi cơ hội nghề nghiệp chỉ với vài cú click.
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-xl p-2 shadow-lg flex items-center">
              <Search className="w-5 h-5 text-gray-500 ml-2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Vị trí, kỹ năng, công ty..."
                className="flex-1 px-3 py-2 outline-none text-gray-800"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="container mx-auto px-4 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center">
            <Briefcase className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="font-semibold">Việc làm chất lượng</p>
              <p className="text-gray-500 text-sm">Được kiểm duyệt kỹ càng</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center">
            <Building2 className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="font-semibold">Nhà tuyển dụng uy tín</p>
              <p className="text-gray-500 text-sm">Từ SMEs đến Enterprise</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center">
            <MapPin className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="font-semibold">Đa dạng địa điểm</p>
              <p className="text-gray-500 text-sm">Làm tại văn phòng hoặc từ xa</p>
            </div>
          </div>
        </div>
      </section>

      {/* Jobs list */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Việc làm mới nhất</h2>
          <button className="text-blue-600 hover:text-blue-700">Xem tất cả</button>
        </div>

        {loading ? (
          <div className="text-gray-500">Đang tải...</div>
        ) : jobs.length === 0 ? (
          <div className="text-gray-500">Chưa có tin tuyển dụng nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;