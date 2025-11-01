import React, { useEffect, useState } from 'react';
import { userService } from '../../services/api';
import { Edit, Save, X, Upload, FileText, User, Mail, Phone, MapPin, Briefcase, Award } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Personal() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '',
    phone: '',
    position: '', 
    location: '',
    about: '',
    skills: [],
    experience: '',
    education: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    try {
      console.log('Loading profile data...');
      const response = await userService.getProfile();
      const data = response?.data?.data || response?.data || {};
      console.log('Profile data loaded:', data);
      
      setProfile(data);
      
      // Cập nhật form với dữ liệu mới
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        position: data.position || '',
        location: data.location || '',
        about: data.about || '',
        skills: Array.isArray(data.skills) 
          ? data.skills.join(', ') 
          : (data.skills || ''),
        experience: data.experience || '',
        education: data.education || ''
      });

      // Cập nhật thông tin CV nếu có
      if (data.cvUrl) {
        setCvFile({ 
          name: data.cvName || 'CV của tôi.pdf',
          url: data.cvUrl,
          size: data.cvSize
        });
      } else {
        setCvFile(null);
      }
      
      return data;
    } catch (error) {
      console.error('Error loading profile:', {
        message: error.message,
        response: error.response?.data
      });
      
      const errorMsg = error.response?.data?.message || 'Không tải được thông tin hồ sơ';
      setError(errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form data before submit:', form);
    
    try {
      setIsUploading(true);
      
      // Kiểm tra dữ liệu bắt buộc
      if (!form.name?.trim() || !form.email?.trim()) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      // Chuẩn bị dữ liệu gửi lên server
      const profileData = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || '',
        position: form.position?.trim() || '',
        location: form.location?.trim() || '',
        about: form.about?.trim() || '',
        skills: typeof form.skills === 'string' 
          ? form.skills.split(',').map(skill => skill.trim()).filter(Boolean)
          : form.skills || [],
        experience: form.experience?.trim() || '',
        education: form.education?.trim() || ''
      };
      
      console.log('Sending to server:', profileData);
      
      // Gọi API cập nhật thông tin
      const response = await userService.updateProfile(profileData);
      console.log('Server response:', response);
      
      if (response.data) {
        // Cập nhật state với dữ liệu mới từ server
        const updatedData = response.data.data || response.data;
        setProfile(prev => ({ ...prev, ...updatedData }));
        
        // Cập nhật form để đảm bảo đồng bộ
        setForm(prev => ({
          ...prev,
          ...updatedData,
          skills: Array.isArray(updatedData.skills) 
            ? updatedData.skills.join(', ') 
            : updatedData.skills || ''
        }));
        
        toast.success('Cập nhật thông tin thành công');
        setIsEditing(false);
      }
      
    } catch (error) {
      console.error('Update profile error:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Hiển thị thông báo lỗi chi tiết từ server nếu có
      const serverError = error.response?.data;
      let errorMessage = 'Có lỗi xảy ra khi cập nhật thông tin';
      
      if (serverError?.errors && serverError.errors.length > 0) {
        // Nếu có thông báo lỗi validation từ server
        errorMessage = serverError.errors.map(err => err.msg || err.message).join('\n');
      } else if (serverError?.message) {
        errorMessage = serverError.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Kiểm tra định dạng file
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const fileType = file.type.toLowerCase();
      const isAllowedType = allowedTypes.some(type => fileType.includes(type.split('/').pop()));
      
      if (!isAllowedType) {
        toast.error('Chỉ chấp nhận file PDF hoặc Word (DOC/DOCX)');
        return;
      }
      
      // Kiểm tra kích thước file (tối đa 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước file không được vượt quá 5MB');
        return;
      }
      
      // Reset input file để có thể chọn lại file cùng tên
      e.target.value = null;
      
      handleUploadCV(file);
    }
  };

  const handleUploadCV = async (file) => {
    try {
      setIsUploading(true);
      
      // Tạo FormData để gửi file
      const formData = new FormData();
      formData.append('cv', file);
      
      // Gọi API upload file
      const response = await userService.updateProfile(formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Cập nhật state hiển thị
      setCvFile({
        name: file.name,
        url: response.data.cvUrl || URL.createObjectURL(file)
      });
      
      // Làm mới thông tin profile
      await loadProfile();
      
      toast.success('Tải lên CV thành công');
    } catch (error) {
      console.error('Lỗi khi tải lên CV:', {
        message: error.message,
        response: error.response?.data
      });
      toast.error(error?.response?.data?.message || 'Lỗi khi tải lên CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCV = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa CV này không?')) {
      return;
    }
    
    try {
      // Gọi API xóa CV
      await userService.updateProfile({
        cvUrl: null,
        cvName: null
      });
      
      // Cập nhật state
      setCvFile(null);
      
      toast.success('Đã xóa CV thành công');
    } catch (error) {
      console.error('Lỗi khi xóa CV:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi xóa CV');
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header với nút chỉnh sửa */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit size={16} />
            Chỉnh sửa
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Đang lưu...' : 'Lưu thay đổi'}
              {!isUploading && <Save size={16} />}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Form chỉnh sửa */}
      <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900">Thông tin cơ bản</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    {profile.name || 'Chưa cập nhật'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  {profile.email || 'Chưa cập nhật'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {profile.phone || 'Chưa cập nhật'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({...form, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ví dụ: Hà Nội, Việt Nam"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    {profile.location || 'Chưa cập nhật'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
              {isEditing ? (
                <textarea
                  value={form.about}
                  onChange={(e) => setForm({...form, about: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Giới thiệu ngắn gọn về bản thân..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-line">
                  {profile.about || 'Chưa có thông tin giới thiệu'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Kinh nghiệm làm việc */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
              Kinh nghiệm làm việc
            </h2>
          </div>
          
          <div className="p-6">
            {isEditing ? (
              <textarea
                value={form.experience}
                onChange={(e) => setForm({...form, experience: e.target.value})}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mô tả kinh nghiệm làm việc của bạn..."
              />
            ) : (
              <div className="prose max-w-none">
                {profile.experience ? (
                  <div dangerouslySetInnerHTML={{ __html: profile.experience.replace(/\n/g, '<br>') }} />
                ) : (
                  <p className="text-gray-500">Chưa cập nhật thông tin kinh nghiệm</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Kỹ năng */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-blue-600" />
              Kỹ năng
            </h2>
          </div>
          
          <div className="p-6">
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({...form, skills: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ví dụ: JavaScript, React, Node.js, ..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Nhập các kỹ năng của bạn, cách nhau bởi dấu phẩy
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills && profile.skills.length > 0 ? (
                  Array.isArray(profile.skills) ? (
                    profile.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {skill.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {profile.skills}
                    </span>
                  )
                ) : (
                  <p className="text-gray-500">Chưa cập nhật kỹ năng</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CV/Resume */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Hồ sơ đính kèm
            </h2>
          </div>
          
          <div className="p-6">
            {cvFile ? (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{cvFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {cvFile.size ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB` : 'Đã tải lên'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {cvFile.url && (
                    <a
                      href={cvFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Xem
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveCV}
                    disabled={isUploading}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="text-blue-600 font-medium">Tải lên CV</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Hỗ trợ: PDF, DOC, DOCX (tối đa 5MB)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
