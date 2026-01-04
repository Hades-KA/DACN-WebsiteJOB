// client/src/pages/CareerGuide.jsx
import React, { useMemo, useState } from 'react';
import { Search, Calendar, User as UserIcon, Tag } from 'lucide-react';

// ===== BÀI VIẾT NỔI BẬT =====
const featuredPost = {
  id: 1,
  title: 'Cách viết CV ấn tượng cho sinh viên mới ra trường',
  category: 'Kỹ năng viết CV',
  date: '20/3/2024',
  author: 'JobPortal Blog',
  excerpt:
    'Hướng dẫn chi tiết cách tạo CV chuyên nghiệp cho sinh viên mới tốt nghiệp, dù chưa có nhiều kinh nghiệm làm việc.',
  imageUrl:
    'https://images.pexels.com/photos/7606061/pexels-photo-7606061.jpeg?auto=compress&cs=tinysrgb&w=1200',
};

// ===== TẤT CẢ BÀI VIẾT =====
const allPosts = [
  {
    id: 2,
    title: '10 xu hướng ngành nghề hot nhất 2024',
    category: 'Xu hướng việc làm',
    date: '18/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      'Khám phá những ngành nghề đang có nhu cầu cao nhất trên thị trường lao động năm 2024.',
    imageUrl:
      'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 3,
    title: 'Kỹ năng phỏng vấn online hiệu quả',
    category: 'Phỏng vấn',
    date: '15/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      'Những bí quyết để thành công trong buổi phỏng vấn trực tuyến, từ chuẩn bị thiết bị đến cách giao tiếp qua màn hình.',
    imageUrl:
      'https://images.pexels.com/photos/1181605/pexels-photo-1181605.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 4,
    title: '5 cách đàm phán lương hiệu quả',
    category: 'Phát triển sự nghiệp',
    date: '12/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      '5 chiến lược đàm phán lương giúp bạn tự tin thương lượng và đạt được mức thu nhập mong muốn.',
    imageUrl:
      'https://images.pexels.com/photos/4968633/pexels-photo-4968633.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 5,
    title: 'LinkedIn: Công cụ tìm việc hiệu quả',
    category: 'Kỹ năng tìm việc',
    date: '10/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      'Cách tối ưu hóa profile LinkedIn để thu hút nhà tuyển dụng và mở rộng cơ hội việc làm.',
    imageUrl:
      'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 6,
    title: 'Quản lý thời gian hiệu quả trong công việc',
    category: 'Kỹ năng làm việc',
    date: '8/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      'Giới thiệu phương pháp quản lý thời gian 4D giúp bạn tăng hiệu suất và giảm căng thẳng trong công việc.',
    imageUrl:
      'https://images.pexels.com/photos/1181355/pexels-photo-1181355.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 7,
    title: 'Xây dựng Personal Branding trong thời đại số',
    category: 'Phát triển cá nhân',
    date: '5/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      'Chiến lược xây dựng thương hiệu cá nhân toàn diện trên các nền tảng số để tạo lợi thế cạnh tranh.',
    imageUrl:
      'https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 8,
    title: 'Kỹ năng làm việc nhóm trong môi trường đa văn hóa',
    category: 'Kỹ năng mềm',
    date: '2/3/2024',
    author: 'JobPortal Blog',
    excerpt:
      'Những điều cần biết khi làm việc trong môi trường đa quốc gia, đa văn hóa để tránh xung đột và làm việc hiệu quả.',
    imageUrl:
      'https://images.pexels.com/photos/1181562/pexels-photo-1181562.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const CareerGuide = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả bài viết');

  const categories = useMemo(() => {
    const set = new Set(allPosts.map((p) => p.category));
    return ['Tất cả bài viết', ...Array.from(set)];
  }, []);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const matchCategory =
        selectedCategory === 'Tất cả bài viết' || post.category === selectedCategory;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        post.title.toLowerCase().includes(term) ||
        post.excerpt.toLowerCase().includes(term);
      return matchCategory && matchSearch;
    });
  }, [searchTerm, selectedCategory]);

  const displayedFeatured = featuredPost;
  const otherPosts = filteredPosts;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Banner gradient - căn giữa */}
      <section className="bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Cẩm nang tìm việc
          </h1>
          <p className="text-sm md:text-base text-fuchsia-100 max-w-2xl mx-auto">
            Khám phá những kiến thức và kỹ năng cần thiết cho sự nghiệp của bạn.
          </p>
        </div>
      </section>

      {/* Thanh search + filter (một khối bo tròn) */}
      <section className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-stretch rounded-full border border-gray-300 bg-white shadow-sm overflow-hidden">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border-none focus:outline-none focus:ring-0 bg-transparent"
                />
              </div>

              {/* Select category */}
              <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-gray-200">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-full px-4 py-2 text-sm border-none bg-transparent focus:outline-none focus:ring-0"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nội dung */}
      <section className="container mx-auto px-4 py-8 md:py-10 max-w-6xl">
        {/* Bài viết nổi bật */}
        <div className="mb-10">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Bài viết nổi bật
          </h2>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/2 h-56 md:h-auto">
              <img
                src={displayedFeatured.imageUrl}
                alt={displayedFeatured.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:w-1/2 p-5 md:p-6 flex flex-col justify-center">
              <div className="mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  <Tag className="w-3 h-3 mr-1" />
                  {displayedFeatured.category}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {displayedFeatured.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {displayedFeatured.excerpt}
              </p>
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                <span className="inline-flex items-center">
                  <UserIcon className="w-3.5 h-3.5 mr-1" />
                  {displayedFeatured.author}
                </span>
                <span className="inline-flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {displayedFeatured.date}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tất cả bài viết */}
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Tất Cả Bài Viết
          </h2>

          {otherPosts.length === 0 ? (
            <p className="text-sm text-gray-500">
              Không tìm thấy bài viết nào phù hợp với từ khóa và bộ lọc hiện tại.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
                >
                  <div className="h-40">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                        <Tag className="w-3 h-3 mr-1" />
                        {post.category}
                      </span>
                      <span className="inline-flex items-center text-[11px] text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {post.date}
                      </span>
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto pt-2 border-t border-gray-100 text-[11px] text-gray-500 inline-flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      <span>{post.author}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CareerGuide;