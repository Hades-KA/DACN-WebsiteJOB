import { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tự động lấy thông tin user từ localStorage khi khởi động
  console.log('Loading user from localStorage...');
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('=== Bắt đầu tải dữ liệu người dùng ===');
        
        // Lấy token từ localStorage
        const token = localStorage.getItem('token');
        console.log('Token từ localStorage:', token);
        
        if (!token) {
          console.log('Không tìm thấy token, chưa đăng nhập');
          setLoading(false);
          return;
        }
        
        console.log('Đang gọi API lấy thông tin người dùng...');
        const response = await userService.getProfile();
        
        console.log('Phản hồi từ API:', {
          status: response.status,
          data: response.data
        });
        
        if (response.data) {
          console.log('Đã nhận dữ liệu người dùng:', response.data);
          setUser(response.data);
        } else {
          console.error('Không có dữ liệu người dùng trong phản hồi');
          setError('Không nhận được dữ liệu người dùng từ máy chủ');
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin người dùng:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        
        if (err.response?.status === 401) {
          console.log('Phiên đăng nhập hết hạn, xóa token');
          localStorage.removeItem('token');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          window.location.href = '/login';
        } else {
          setError(`Lỗi kết nối: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const updateUser = (userData) => {
    console.log('Updating user data:', userData);
    setUser(prev => ({
      ...prev,
      ...userData
    }));
  };

  const login = async (userData) => {
    console.log('Logging in user:', userData);
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    updateUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('useAuth phải được sử dụng bên trong AuthProvider');
    return {
      user: {
        _id: 'demo-user-id',
        name: 'Người dùng Demo',
        email: 'demo@example.com',
        role: 'seeker'
      },
      isAuthenticated: true,
      loading: false,
      error: null,
      updateUser: () => {},
      login: () => {},
      logout: () => {}
    };
  }
  return context;
};

export default AuthContext;
