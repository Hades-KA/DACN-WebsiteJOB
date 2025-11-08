import React, { useEffect, useRef, useState } from 'react';
import api, { userService } from '../../services/api';
import { Edit, Save, Upload, FileText, User, Mail, Phone, MapPin, Briefcase, Award, Trash2, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Viewer PDF
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Helpers loại file
const isPdf = (nameOrUrl) => /\.(pdf)$/i.test(String(nameOrUrl || ''));
const isDoc = (nameOrUrl) => /\.(doc|docx)$/i.test(String(nameOrUrl || ''));
const getOfficeViewerUrl = (url) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

// Danh sách tỉnh/thành phố Việt Nam
const provinces = [
  'Hà Nội','Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','An Giang','Bà Rịa Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Dương','Bình Định','Bình Phước','Bình Thuận','Cà Mau','Cao Bằng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Tĩnh','Hải Dương','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];

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
    skills: '',
    experience: '',
    education: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [error, setError] = useState('');

  // drag-n-drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const pdfDefaultLayout = defaultLayoutPlugin();

  const loadProfile = async () => {
    try {
      const response = await userService.getProfile();
      const data = response?.data?.data || response?.data || response || {};

      setProfile(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        position: data.position || '',
        location: provinces.includes(data.location) ? data.location : '',
        about: data.about || '',
        skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
        experience: data.experience || '',
        education: data.education || ''
      });

      if (data.cvUrl) {
        setCvFile({
          name: data.cvName || 'CV.pdf',
          url: data.cvUrl,
          size: data.cvSize
        });
      } else {
        setCvFile(null);
      }

      setError('');
      return data;
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Không tải được thông tin hồ sơ';
      setError(errMsg);
      toast.error(errMsg);
      throw err;
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isSaving) return;
    setIsSaving(true);
    setError('');

    try {
      const skillsArray =
        typeof form.skills === 'string'
          ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
          : Array.isArray(form.skills) ? form.skills : [];

      const payload = {
        name: String(form.name || '').trim(),
        phone: String(form.phone || '').trim(),
        position: String(form.position || '').trim(),
        location: String(form.location || '').trim(),
        about: String(form.about || '').trim(),
        skills: skillsArray,
        experience: String(form.experience || '').trim(),
        education: String(form.education || '').trim()
      };

      if (!payload.name) {
        toast.error('Vui lòng nhập Họ và tên');
        setIsSaving(false);
        return;
      }
      if (!payload.location) {
        toast.error('Vui lòng chọn Địa điểm');
        setIsSaving(false);
        return;
      }

      let res;
      try {
        res = await userService.updateProfile(payload);
      } catch (err) {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          res = await api.put('/users/profile', payload);
        } else {
          throw err;
        }
      }

      await loadProfile();
      toast.success(res?.data?.message || 'Cập nhật thông tin thành công');
      setIsEditing(false);
    } catch (err) {
      console.error('Save profile error:', err);
      const serverData = err?.response?.data;
      let msg = serverData?.message || 'Có lỗi xảy ra khi lưu thông tin';
      if (serverData?.errors?.length) {
        msg += ': ' + serverData.errors.map(x => x.msg || x.message).join('; ');
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const validateFile = (file) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!file) return 'Không có file';
    if (!allowed.includes(file.type)) return 'Chỉ chấp nhận file PDF hoặc Word (DOC/DOCX)';
    if (file.size > 5 * 1024 * 1024) return 'Kích thước file không được vượt quá 5MB';
    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const errMsg = validateFile(file);
    if (errMsg) {
      toast.error(errMsg);
      return;
    }
    e.target.value = null;
    handleUploadCV(file);
  };

  const handleUploadCV = async (file) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const response = await api.post('/users/profile/cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = response?.data?.data || response?.data || {};
      setCvFile({
        name: data.cvName || file.name,
        url: data.cvUrl || data.url || URL.createObjectURL(file),
        size: data.cvSize || file.size
      });

      await loadProfile();
      toast.success('Tải lên CV thành công');
    } catch (err) {
      console.error('Upload CV error:', err);
      toast.error(err?.response?.data?.message || 'Lỗi khi tải lên CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCV = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa CV này không?')) return;
    setIsUploading(true);
    try {
      await api.delete('/users/profile/cv');
      setCvFile(null);
      await loadProfile();
      toast.success('Đã xóa CV thành công');
    } catch (err) {
      console.error('Remove CV error:', err);
      toast.error(err?.response?.data?.message || 'Lỗi khi xóa CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadCV = () => {
    if (!cvFile?.url) return;
    const a = document.createElement('a');
    a.href = cvFile.url;
    a.download = (cvFile.name || 'CV.pdf').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Drag n drop handlers
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    const errMsg = validateFile(file);
    if (errMsg) return toast.error(errMsg);
    handleUploadCV(file);
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const fileNameForType = cvFile?.name || cvFile?.url || '';
  const showExternalLink = cvFile?.url && !isPdf(fileNameForType); // chỉ hiện “Mở tab” nếu không phải PDF

  return (
    <div className="space-y-6">
      {/* Header */}
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
              type="button"
              onClick={() => {
                setForm({
                  name: profile.name || '',
                  email: profile.email || '',
                  phone: profile.phone || '',
                  position: profile.position || '',
                  location: provinces.includes(profile.location) ? profile.location : '',
                  about: profile.about || '',
                  skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || ''),
                  experience: profile.experience || '',
                  education: profile.education || ''
                });
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={isSaving || isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              {!isSaving && <Save size={16} />}
            </button>
          </div>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>}

      <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin cơ bản */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900">Thông tin cơ bản</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center"><User className="w-4 h-4 mr-2 text-gray-500" />{profile.name || 'Chưa cập nhật'}</p>
                )}
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-500" />{profile.email || 'Chưa cập nhật'}</p>
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-500" />{profile.phone || 'Chưa cập nhật'}</p>
                )}
              </div>
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                {isEditing ? (
                  <select
                    id="location"
                    name="location"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <p className="text-gray-900 flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500" />{profile.location || 'Chưa cập nhật'}</p>
                )}
              </div>
            </div>
            {/* About */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
              {isEditing ? (
                <textarea
                  value={form.about}
                  onChange={(e) => setForm({ ...form, about: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Giới thiệu ngắn gọn về bản thân..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-line">{profile.about || 'Chưa có thông tin giới thiệu'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Kinh nghiệm */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" /> Kinh nghiệm làm việc
            </h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <textarea
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mô tả kinh nghiệm làm việc của bạn..."
              />
            ) : (
              <div className="prose max-w-none">
                {profile.experience ? (
                  <div dangerouslySetInnerHTML={{ __html: String(profile.experience).replace(/\n/g, '<br>') }} />
                ) : <p className="text-gray-500">Chưa cập nhật thông tin kinh nghiệm</p>}
              </div>
            )}
          </div>
        </div>

        {/* Kỹ năng */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-blue-600" /> Kỹ năng
            </h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ví dụ: JavaScript, React, Node.js, ..."
                />
                <p className="mt-1 text-sm text-gray-500">Nhập các kỹ năng của bạn, cách nhau bởi dấu phẩy</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills && profile.skills.length > 0 ? (
                  Array.isArray(profile.skills)
                    ? profile.skills.map((skill, i) => (
                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {String(skill).trim()}
                        </span>
                      ))
                    : <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">{String(profile.skills)}</span>
                ) : <p className="text-gray-500">Chưa cập nhật kỹ năng</p>}
              </div>
            )}
          </div>
        </div>

        {/* CV của bạn */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header + nút tải/xóa */}
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">CV của bạn</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCV}
                disabled={!cvFile?.url}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                title={cvFile?.url ? 'Tải CV của bạn' : 'Chưa có CV để tải'}
              >
                <Download size={16} /> Tải CV của bạn
              </button>
              {cvFile?.url && (
                <button
                  type="button"
                  onClick={handleRemoveCV}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Xóa CV"
                >
                  <Trash2 size={16} /> Xóa
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Khu kéo thả / click chọn CV */}
            <div
              onDragEnter={onDragOver}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 p-8 text-center transition
                ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-300'}`}
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-gray-900 font-medium">
                  Kéo thả hoặc click để {cvFile ? 'thay đổi' : 'tải lên'} CV
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Hỗ trợ: PDF (xem trực tiếp), DOC/DOCX (Office Viewer) — tối đa 5MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* File info (tóm tắt) */}
            {cvFile && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{cvFile.name}</p>
                    <p className="text-sm text-gray-500">{cvFile.size ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                  </div>
                </div>
                {/* Link mở tab chỉ khi không phải PDF */}
                {cvFile.url && !isPdf(fileNameForType) && (
                  <a
                    href={cvFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mở tab
                  </a>
                )}
              </div>
            )}

            {/* Viewer */}
            {cvFile?.url && isPdf(fileNameForType) && (
              <div className="border rounded-lg overflow-hidden" style={{ height: '80vh' }}>
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <Viewer fileUrl={cvFile.url} plugins={[pdfDefaultLayout]} />
                </Worker>
              </div>
            )}

            {cvFile?.url && !isPdf(fileNameForType) && isDoc(fileNameForType) && (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  title="CV Preview (DOC/DOCX)"
                  src={getOfficeViewerUrl(cvFile.url)}
                  className="w-full"
                  style={{ height: '80vh' }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Nếu không xem được trực tiếp (đặc biệt trên localhost), hãy dùng “Mở tab” ở trên.
                </p>
              </div>
            )}

            {cvFile?.url &&
              !isPdf(fileNameForType) &&
              !isDoc(fileNameForType) && (
                <p className="text-sm text-gray-500">
                  Định dạng này chưa hỗ trợ xem trước.
                </p>
              )}
          </div>
        </div>
      </form>
    </div>
  );
}