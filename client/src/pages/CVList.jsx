import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Star, User, MapPin, Calendar } from 'lucide-react';
import { cvService } from '../services/api';

const CVList = () => {
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      const response = await cvService.getAllCVs();
      setCvs(response.data);
    } catch (error) {
      console.error('Error fetching CVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await cvService.searchCVs({
        keyword: searchTerm,
        jobId: selectedJob
      });
      setCvs(response.data);
    } catch (error) {
      console.error('Error searching CVs:', error);
    }
  };

  const handleSort = (sortType) => {
    setSortBy(sortType);
    // Implement sorting logic
  };

  const handleDownloadCV = async (cvId) => {
    try {
      await cvService.downloadCV(cvId);
    } catch (error) {
      console.error('Error downloading CV:', error);
    }
  };

  const handleViewCV = (cvId) => {
    // Open CV in new tab or modal
    window.open(`/cv/${cvId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Danh sách CV ứng viên
          </h1>
          <p className="text-gray-600">
            Tìm kiếm và quản lý hồ sơ ứng viên với AI phân tích
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, kỹ năng, kinh nghiệm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả vị trí</option>
                <option value="frontend">Frontend Developer</option>
                <option value="backend">Backend Developer</option>
                <option value="fullstack">Full Stack Developer</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Bộ lọc
              </button>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tìm kiếm
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kinh nghiệm
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Tất cả</option>
                    <option value="0-1">0-1 năm</option>
                    <option value="1-3">1-3 năm</option>
                    <option value="3-5">3-5 năm</option>
                    <option value="5+">5+ năm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Địa điểm
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Tất cả</option>
                    <option value="hanoi">Hà Nội</option>
                    <option value="hcm">TP. Hồ Chí Minh</option>
                    <option value="danang">Đà Nẵng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Điểm AI
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Tất cả</option>
                    <option value="high">Cao (8-10)</option>
                    <option value="medium">Trung bình (6-8)</option>
                    <option value="low">Thấp (0-6)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Tìm thấy <span className="font-semibold">{cvs.length}</span> hồ sơ
          </p>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Sắp xếp theo:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="relevance">Độ phù hợp</option>
              <option value="date">Ngày nộp</option>
              <option value="score">Điểm AI</option>
              <option value="experience">Kinh nghiệm</option>
            </select>
          </div>
        </div>

        {/* CV List */}
        <div className="space-y-4">
          {cvs.map((cv) => (
            <div key={cv.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cv.candidateName}
                      </h3>
                      <p className="text-gray-600">{cv.position}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {cv.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {cv.experience} năm kinh nghiệm
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="w-4 h-4 mr-2 text-yellow-500" />
                      Điểm AI: {cv.aiScore}/10
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Kỹ năng chính:</h4>
                    <div className="flex flex-wrap gap-2">
                      {cv.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Đánh giá AI:</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Điểm mạnh:</span> {cv.aiAnalysis.strengths}
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Điểm cần cải thiện:</span> {cv.aiAnalysis.improvements}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Dự đoán hiệu quả:</span> {cv.aiAnalysis.efficiency}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-6">
                  <button
                    onClick={() => handleViewCV(cv.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Xem CV
                  </button>
                  <button
                    onClick={() => handleDownloadCV(cv.id)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Tải xuống
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Liên hệ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-2">
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Trước
            </button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-lg">
              1
            </button>
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              3
            </button>
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Sau
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default CVList;