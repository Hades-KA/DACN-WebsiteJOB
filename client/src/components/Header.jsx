import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Briefcase, FileText, BarChart3 } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const user = userString && userString !== 'undefined' && userString !== 'null' ? JSON.parse(userString) : {};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    setIsUserMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">JobHire</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {token && (
              <>
                <Link 
                  to="/" 
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Trang chủ
                </Link>
                <Link 
                  to="/cv-list" 
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Danh sách CV
                </Link>
                <Link 
                  to="/post-job" 
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center"
                >
                  <Briefcase className="w-4 h-4 mr-1" />
                  Đăng tin
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center space-x-4">
            {token ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden md:block">{user.name || user.email || 'User'}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/cv-list"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Danh sách CV
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="inline-flex items-center h-9 px-4 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 text-white rounded-full shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              {token && (
                <>
                  <Link
                    to="/"
                    className="px-4 py-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Trang chủ
                  </Link>
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/cv-list"
                    className="px-4 py-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Danh sách CV
                  </Link>
                  <Link
                    to="/post-job"
                    className="px-4 py-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng tin
                  </Link>
                </>
              )}
              {!token && (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng ký
                  </Link>
                </>
              )}
    </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;