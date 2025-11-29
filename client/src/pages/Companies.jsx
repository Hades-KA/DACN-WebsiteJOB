// client/src/pages/Companies.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../services/api';
import { Building2, Search, MapPin, ArrowRight, Filter, Briefcase } from 'lucide-react';
import { vietnamLocations } from '../data/vietnam-locations';

const HOT_PROVINCE_CODES = ['HN', 'HCM', 'DN', 'CT', 'HP', 'BD', 'DNA'];

const toDisplayLabel = (p) => {
  const n = p.name;
  if (n.startsWith('TP.')) return n;
  if (['Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'].includes(n)) {
    return `TP. ${n}`;
  }
  return `Tỉnh ${n}`;
};

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProvinces, setSelectedProvinces] = useState([]);
  const navigate = useNavigate();

  const provinces = useMemo(() => {
    const byCode = {};
    vietnamLocations.forEach((p) => (byCode[p.code] = p));
    const hot = HOT_PROVINCE_CODES.map((c) => byCode[c]).filter(Boolean);
    const others = vietnamLocations
      .filter((p) => !HOT_PROVINCE_CODES.includes(p.code))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return [...hot, ...others];
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await companyService.getCompanies({ page: 1, limit: 100 });
        const data = res.data?.data || res.data || [];
        setCompanies(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('Không tải được danh sách công ty');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isCompanyInProvince = (c, province) => {
    const city = (c.companyCity || '').toLowerCase();
    if (!city) return false;
    return city.includes(province.name.toLowerCase());
  };

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      const name = (c.company || c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const city = (c.companyCity || '').toLowerCase();
      
      const matchSearch = !q || name.includes(q) || email.includes(q) || city.includes(q);
      
      const matchProvince = selectedProvinces.length === 0 || selectedProvinces.some((code) => {
        const province = provinces.find((p) => p.code === code);
        return province && isCompanyInProvince(c, province);
      });

      return matchSearch && matchProvince;
    });
  }, [companies, search, selectedProvinces, provinces]);

  const toggleProvince = (code) => {
    setSelectedProvinces((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      {/* 1. HERO SECTION */}
      {/* Thay đổi: w-full để nền tràn viền, nội dung bên trong dùng px-6 hoặc px-10 để canh lề nhẹ */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white pt-16 pb-24 relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <Building2 className="w-96 h-96 -translate-x-1/2 -translate-y-1/2 absolute top-0 left-0 rotate-12" />
           <Briefcase className="w-64 h-64 translate-x-1/3 translate-y-1/2 absolute bottom-0 right-0 -rotate-12" />
        </div>

        {/* Nội dung Hero vẫn nên căn giữa cho đẹp mắt */}
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Khám phá Nhà tuyển dụng
          </h1>
          <p className="text-blue-100 max-w-2xl mx-auto text-lg mb-8 font-light">
            Tìm kiếm cơ hội phát triển sự nghiệp tại các công ty uy tín.
          </p>

          <div className="max-w-3xl mx-auto bg-white p-2 rounded-full shadow-xl flex items-center">
            <div className="pl-4 pr-2 text-gray-400">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm công ty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 py-3 px-2 text-gray-700 outline-none bg-transparent text-base truncate"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-colors duration-200 hidden sm:block">
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT: PHẦN QUAN TRỌNG CẦN SỬA */}
      {/* 
          THAY ĐỔI CHÍNH: 
          - Xóa 'max-w-7xl mx-auto' (gây ra khoảng trống 2 bên).
          - Thay bằng 'w-full px-4 lg:px-8 xl:px-12' để nội dung tràn ra 2 bên, chỉ chừa lề nhỏ.
      */}
      <div className="w-full px-4 lg:px-8 xl:px-12 -mt-12 relative z-20 pb-20">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* SIDEBAR: FILTER - Sẽ nằm sát bên trái hơn */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Bộ lọc
                </h3>
                {selectedProvinces.length > 0 && (
                    <button 
                        onClick={() => setSelectedProvinces([])}
                        className="text-xs text-blue-600 hover:underline font-medium"
                    >
                        Xóa
                    </button>
                )}
              </div>
              
              <div className="p-4">
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                  Khu vực
                </h4>
                <div className="space-y-1 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {provinces.map((p) => {
                    const checked = selectedProvinces.includes(p.code);
                    return (
                      <label
                        key={p.code}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all ${
                          checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={checked}
                            onChange={() => toggleProvince(p.code)}
                        />
                        <span className={`text-sm ${checked ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                          {toDisplayLabel(p)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* COMPANY LIST */}
          <section className="flex-1">
            <div className="flex justify-between items-end mb-4 px-1">
               <p className="text-gray-500 text-sm">
                 Kết quả: <span className="font-bold text-gray-900">{filteredCompanies.length}</span> công ty
               </p>
            </div>

            {loading ? (
              // Loading skeleton...
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                 {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white h-48 rounded-xl shadow-sm animate-pulse"></div>
                 ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
                {error}
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Không tìm thấy công ty nào.</p>
              </div>
            ) : (
              // GRID LIST: Thêm cột cho màn hình lớn (2xl:grid-cols-4)
              // Khi không gian rộng ra, ta hiển thị 4 cột thay vì 3 để lấp đầy khoảng trống bên phải
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {filteredCompanies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/jobs?companyId=${c.id}`)}
                    className="group bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-14 h-14 shrink-0 rounded-lg bg-white border border-gray-200 p-1 flex items-center justify-center">
                        {c.logoUrl ? (
                          <img
                            src={c.logoUrl}
                            alt={c.company}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {c.company || c.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                           {c.email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{c.companyCity || 'N/A'}</span>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}