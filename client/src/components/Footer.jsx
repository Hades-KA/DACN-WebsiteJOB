import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    // Giữ màu nền Xanh đen (Slate) thân thiện, chuyên nghiệp
    <footer className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-slate-300 border-t border-slate-800">
      <div className="container mx-auto px-4 py-14">
        
        {/* GRID 4 CỘT: Nội dung giống hệt ảnh bạn gửi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* CỘT 1: Về chúng tôi */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Về chúng tôi</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="hover:text-blue-400 transition-colors">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-400 transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue-400 transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: Dành cho ứng viên */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Dành cho ứng viên</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/jobs" className="hover:text-blue-400 transition-colors">
                  Việc làm mới nhất
                </Link>
              </li>
              <li>
                <Link to="/create-cv" className="hover:text-blue-400 transition-colors">
                  Tạo CV
                </Link>
              </li>
              <li>
                <Link to="/career-blog" className="hover:text-blue-400 transition-colors">
                  Cẩm nang nghề nghiệp
                </Link>
              </li>
              <li>
                <Link to="/salary" className="hover:text-blue-400 transition-colors">
                  Tra cứu lương
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: Dành cho nhà tuyển dụng */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Dành cho nhà tuyển dụng</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/post-job" className="hover:text-blue-400 transition-colors">
                  Đăng tin tuyển dụng
                </Link>
              </li>
              <li>
                <Link to="/search-cv" className="hover:text-blue-400 transition-colors">
                  Tìm hồ sơ
                </Link>
              </li>
              <li>
                <Link to="/hr-solutions" className="hover:text-blue-400 transition-colors">
                  Giải pháp HR
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-blue-400 transition-colors">
                  Bảng giá dịch vụ
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: Kết nối với chúng tôi */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6">Kết nối với chúng tôi</h3>
            <div className="flex space-x-4">
              <a href="#" className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center hover:bg-blue-700 hover:text-white transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>

        {/* DÒNG CUỐI CÙNG: Copyright */}
        <div className="border-t border-slate-800 mt-12 pt-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2025 JobHire. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;