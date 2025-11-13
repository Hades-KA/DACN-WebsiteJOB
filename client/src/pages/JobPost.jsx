import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, FileText } from 'lucide-react';
import api, { companyService, jobService } from '../services/api';

const JobPost = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editId = useMemo(() => new URLSearchParams(location.search).get('editId') || '', [location.search]);
  const isEdit = !!editId;

  // Options
  const jobTypes = [
    { value: 'full-time', label: 'Toàn thời gian' },
    { value: 'part-time', label: 'Bán thời gian' },
    { value: 'contract', label: 'Thời vụ' },
    { value: 'intern', label: 'Thực tập' },
  ];
  const levels = ['Thực tập sinh', 'Nhân viên', 'Trưởng phòng', 'Quản lý', 'Giám đốc'];
  const educations = ['THPT', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'];

  const itRoles = [
    'Frontend Developer','Backend Developer','Fullstack Developer','Mobile Developer',
    'DevOps Engineer','QA/QC Engineer','Automation Tester','Data Engineer','Data Scientist',
    'AI/ML Engineer','UI/UX Designer','Product Manager','Project Manager','Business Analyst',
    'Scrum Master','System Administrator','Cloud Engineer','Security Engineer','Embedded Engineer',
    'Game Developer','Solution Architect','Technical Lead','Intern Developer'
  ];
  const categories = [
    'Công nghệ thông tin','Kinh doanh','Marketing','Kế toán','Nhân sự',
    'Bán hàng','Dịch vụ khách hàng','Sản xuất','Khác'
  ];
  const provinces = [
    'Hà Nội','Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Dương','Bình Định','Bình Phước','Bình Thuận','Cà Mau','Cao Bằng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Tĩnh','Hải Dương','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
  ];

  // State (đÃ gỡ salaryBand, experienceBand khỏi form)
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',            // hiển thị
    type: 'full-time',
    experience: '',        // mô tả
    level: '',
    education: '',
    description: '',
    requirements: '',
    benefits: '',
    category: '',
    deadline: '',
    // contact override
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    // input skills (CSV)
    skillsInput: '',
  });
  const [useCompanyContact, setUseCompanyContact] = useState(true);

  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(isEdit);
  const [error, setError] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // Prefill khi edit
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      setPrefilling(true);
      setError('');
      try {
        // Lấy user
        let user = null;
        try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
        if (!user || (!user.id && !user.userId)) {
          try {
            const meRes = await api.get('/auth/me');
            user = meRes.data?.user || meRes.data || user;
          } catch {}
        }
        const employerId = user?.id || user?.userId;
        if (!employerId) {
          setError('Không lấy được thông tin tài khoản (employerId)');
          return;
        }

        // Lấy job của tôi
        const listRes = await companyService.getCompanyJobs(employerId, { active: 'all', page: 1, limit: 1000 });
        const all = listRes.data?.data || listRes.data || [];
        const j = all.find(x => String(x.id).toLowerCase() === String(editId).toLowerCase());
        if (!j) {
          setError('Không tìm thấy tin tuyển dụng để chỉnh sửa');
          return;
        }

        const skillsInput =
          Array.isArray(j.skills) ? j.skills.join(', ')
          : typeof j.skills === 'string' ? j.skills
          : '';

        setFormData({
          title: j.title || '',
          company: j.company || '',
          location: j.location || '',
          salary: j.salary || '',
          type: j.type || 'full-time',
          experience: j.experience || '',
          level: j.level || '',
          education: j.education || '',
          description: j.description || '',
          requirements: j.requirements || '',
          benefits: j.benefits || '',
          category: j.category || '',
          deadline: j.deadline ? String(j.deadline).slice(0, 10) : '',
          contactName: j.contactName || '',
          contactEmail: j.contactEmail || '',
          contactPhone: j.contactPhone || '',
          contactAddress: j.contactAddress || '',
          skillsInput,
        });
        setUseCompanyContact(!(j.contactName || j.contactEmail || j.contactPhone || j.contactAddress));
      } finally {
        setPrefilling(false);
      }
    };
    load();
  }, [isEdit, editId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...formData };

      // skills CSV -> array
      if (payload.skillsInput) {
        payload.skills = payload.skillsInput
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }
      delete payload.skillsInput;

      // Nếu dùng liên hệ công ty -> không gửi override
      if (useCompanyContact) {
        delete payload.contactName;
        delete payload.contactEmail;
        delete payload.contactPhone;
        delete payload.contactAddress;
      }

      // Clean field rỗng
      [
        'salary','experience','level','education','benefits',
        'description','requirements','category','deadline',
        'contactName','contactEmail','contactPhone','contactAddress'
      ].forEach(k => {
        if (payload[k] !== undefined && String(payload[k]).trim() === '') delete payload[k];
      });

      // Lưu/Update
      if (isEdit) {
        await jobService.updateJob(editId, payload);
      } else {
        await jobService.createJob(payload);
      }
      navigate('/employer/jobs');
    } catch (err) {
      setError(err?.response?.data?.message || (isEdit ? 'Cập nhật thất bại' : 'Đăng tin thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isEdit ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Cập nhật thông tin tin tuyển dụng của bạn' : 'Tạo tin tuyển dụng hấp dẫn để thu hút ứng viên phù hợp'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>
          )}

          {prefilling && isEdit ? (
            <div className="p-6 text-gray-500">Đang tải dữ liệu tin tuyển dụng...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Thông tin cơ bản */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Thông tin cơ bản
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chức danh */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên vị trí tuyển dụng *</label>
                    <select
                      id="titleSelect"
                      name="titleSelect"
                      required={!isEdit && !formData.title}
                      value={itRoles.includes(formData.title) ? formData.title : '__custom__'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setCustomTitle(formData.title || '');
                          setFormData(prev => ({ ...prev, title: '' }));
                        } else {
                          setFormData(prev => ({ ...prev, title: val }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="__custom__">Chọn chức danh (hoặc tự nhập)</option>
                      {itRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {!itRoles.includes(formData.title) && (
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nhập chức danh (VD: Frontend Developer)"
                      />
                    )}
                  </div>

                  {/* Công ty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên công ty *</label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      required
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tên công ty của bạn"
                    />
                  </div>
                </div>

                {/* Dòng 2: Địa điểm + Mức lương (hiển thị) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Địa điểm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa điểm *</label>
                    <select
                      id="location"
                      name="location"
                      required
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      {provinces.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mức lương hiển thị */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mức lương</label>
                    <input
                      type="text"
                      id="salary"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ví dụ: 15-25 triệu / Thỏa thuận"
                    />
                  </div>
                </div>

                {/* Dòng 3: Loại công việc + Kinh nghiệm (mô tả) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Loại công việc */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại công việc *</label>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {jobTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kinh nghiệm mô tả */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kinh nghiệm</label>
                    <input
                      type="text"
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="VD: 2-3 năm"
                    />
                  </div>
                </div>

                {/* Dòng 4: Cấp bậc + Học vấn + Hạn nộp */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cấp bậc (yêu cầu của job, dùng cho filter) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cấp bậc</label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Chọn cấp bậc</option>
                      {levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {/* Học vấn */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Học vấn</label>
                    <select
                      id="education"
                      name="education"
                      value={formData.education}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Chọn học vấn</option>
                      {educations.map(ed => <option key={ed} value={ed}>{ed}</option>)}
                    </select>
                  </div>

                  {/* Hạn nộp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hạn nộp</label>
                    <input
                      type="date"
                      id="deadline"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Dòng 5: Lĩnh vực + Kỹ năng */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lĩnh vực */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lĩnh vực *</label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Chọn lĩnh vực</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kỹ năng (CSV) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kỹ năng (phân tách bởi dấu phẩy)</label>
                    <input
                      type="text"
                      id="skillsInput"
                      name="skillsInput"
                      value={formData.skillsInput}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="VD: ReactJS, NodeJS, SQL"
                    />
                  </div>
                </div>
              </div>

              {/* Mô tả công việc */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Mô tả công việc
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả công việc *</label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mô tả chi tiết về công việc, trách nhiệm..."
                  />
                </div>

                <div>
                  <label className="block text.sm font-medium text-gray-700 mb-2">Yêu cầu ứng viên *</label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    required
                    rows={6}
                    value={formData.requirements}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kỹ năng, kinh nghiệm, bằng cấp yêu cầu..."
                  />
                </div>
              </div>

              {/* Thông tin liên hệ */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Thông tin liên hệ</h2>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useCompanyContact}
                    onChange={(e) => setUseCompanyContact(e.target.checked)}
                  />
                  <span>Dùng thông tin công ty (email/số điện thoại/địa chỉ từ hồ sơ công ty)</span>
                </label>

                {!useCompanyContact && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Người liên hệ</label>
                      <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="VD: HR Team"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="VD: careers@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                      <input
                        type="text"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="VD: 0901xxx..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                      <input
                        type="text"
                        name="contactAddress"
                        value={formData.contactAddress}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="VD: 123 Đường ABC, Quận X, TP.HCM"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/employer/jobs')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (isEdit ? 'Đang cập nhật...' : 'Đang đăng tin...') : (isEdit ? 'Cập nhật tin' : 'Đăng tin tuyển dụng')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPost;