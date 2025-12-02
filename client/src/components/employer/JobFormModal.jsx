// client/src/components/employer/JobFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { jobService } from '../../services/api';
import { toast } from 'react-toastify';
import { vietnamLocations } from '../../data/vietnam-locations';

export default function JobFormModal({ open, onClose, job, onSuccess }) {
  const isEdit = !!job;

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    province: '',
    district: '',
    workAddress: '',
    type: 'full-time',
    salary: '',
    experience: '',
    headcount: '',     // 🆕 Số lượng cần tuyển
    description: '',
    requirements: '',
    category: '',
    deadline: '',
    jdText: '',
    mustHaveSkills: [],
  });

  const [districts, setDistricts] = useState([]);
  const [mustHaveInput, setMustHaveInput] = useState('');
  const [loading, setLoading] = useState(false);

  // ---------- Helpers ----------
  const formatDeadline = (d) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return '';
    }
  };

  const parseLocation = (location) => {
    if (!location) return { province: '', district: '' };
    const parts = String(location).split(',').map((s) => s.trim());
    if (parts.length >= 2) {
      const district = parts[0];
      const provinceName = parts.slice(1).join(', ');

      const found = vietnamLocations.find((p) => {
        const a = p.name.toLowerCase();
        const b = provinceName.toLowerCase();
        return a.includes(b) || b.includes(a);
      });

      if (found) {
        setDistricts(found.districts);
        return { province: found.code, district };
      }
    }
    return { province: '', district: '' };
  };

  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // ---------- Prefill when open ----------
  useEffect(() => {
    if (!open) return;

    if (job) {
      let must = [];
      try {
        const parsed = JSON.parse(job.mustHaveSkills || '[]');
        must = Array.isArray(parsed) ? parsed : [];
      } catch {
        must = [];
      }

      const { province, district } = parseLocation(job.location);

      setFormData({
        title: job.title || '',
        company: job.company || '',
        province,
        district,
        workAddress: job.workAddress || '',
        type: job.type || 'full-time',
        salary: job.salary || '',
        experience: job.experience || '',
        headcount: job.headcount != null ? String(job.headcount) : '', // 🆕
        description: job.description || '',
        requirements: job.requirements || '',
        category: job.category || '',
        deadline: formatDeadline(
          job.deadline ||
            job.expireDate ||
            job.expiresAt ||
            job.closingDate,
        ),
        jdText: job.jdText || '',
        mustHaveSkills: must,
      });
    } else {
      setFormData({
        title: '',
        company: '',
        province: '',
        district: '',
        workAddress: '',
        type: 'full-time',
        salary: '',
        experience: '',
        headcount: '',      // 🆕
        description: '',
        requirements: '',
        category: '',
        deadline: getDefaultDeadline(),
        jdText: '',
        mustHaveSkills: [],
      });
      setDistricts([]);
    }
  }, [open, job]);

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'province') {
      const selected = vietnamLocations.find((p) => p.code === value);
      setDistricts(selected ? selected.districts : []);
      setFormData((prev) => ({ ...prev, province: value, district: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addMustHaveSkill = () => {
    const skill = mustHaveInput.trim().toLowerCase();
    if (skill && !formData.mustHaveSkills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        mustHaveSkills: [...prev.mustHaveSkills, skill],
      }));
      setMustHaveInput('');
    }
  };

  const removeMustHaveSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      mustHaveSkills: prev.mustHaveSkills.filter((s) => s !== skill),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic validation
    if (!formData.title.trim())
      return toast.error('Vui lòng nhập tiêu đề công việc');
    if (!formData.province)
      return toast.error('Vui lòng chọn Tỉnh/Thành phố');
    if (!formData.district)
      return toast.error('Vui lòng chọn Quận/Huyện');
    if (!formData.jdText.trim())
      return toast.error('Vui lòng nhập mô tả chi tiết công việc (JD)');
    if (formData.mustHaveSkills.length === 0)
      return toast.error('Vui lòng thêm ít nhất 1 kỹ năng bắt buộc');
    if (!formData.deadline)
      return toast.error('Vui lòng chọn ngày hết hạn');

    // headcount (nếu có) phải là số nguyên dương
    if (formData.headcount) {
      const h = Number(formData.headcount);
      if (!Number.isInteger(h) || h <= 0) {
        return toast.error('Số lượng cần tuyển phải là số nguyên dương');
      }
    }

    const deadlineDate = new Date(formData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate < today)
      return toast.error('Ngày hết hạn phải từ hôm nay trở đi');

    setLoading(true);
    try {
      const selectedProvince = vietnamLocations.find(
        (p) => p.code === formData.province,
      );
      const locationString = `${formData.district}, ${
        selectedProvince?.name || ''
      }`.trim();

      // payload cơ bản
      const base = {
        title: formData.title,
        company: formData.company,
        type: formData.type,
        salary: formData.salary || null,
        experience: formData.experience || null,
        headcount: formData.headcount
          ? Number(formData.headcount)
          : null, // 🆕 gửi headcount
        description: formData.description || null,
        requirements: formData.requirements || null,
        category: formData.category || null,
        deadline: formData.deadline || null,
        location: locationString,
        workAddress: formData.workAddress?.trim() || null,
        jdText: formData.jdText || null,
        mustHaveSkills: JSON.stringify(formData.mustHaveSkills),
      };

      if (isEdit) {
        await jobService.updateJob(job.id, base);
        toast.success('Cập nhật tin tuyển dụng thành công!');
      } else {
        const payloadCreate = {
          ...base,
          niceToHaveSkills: JSON.stringify([]),
        };
        await jobService.createJob(payloadCreate);
        toast.success('Tạo tin tuyển dụng thành công! Tin đang ở trạng thái chờ duyệt.');
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Chỉnh sửa tin tuyển dụng' : 'Tạo tin tuyển dụng mới'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-6 py-4 max-h-[70vh] overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề công việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Backend Developer"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Công ty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên công ty"
                  />
                </div>

                {/* Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tỉnh/Thành phố <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn Tỉnh/Thành phố --</option>
                    {vietnamLocations.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quận/Huyện <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.province}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {formData.province
                        ? '-- Chọn Quận/Huyện --'
                        : '-- Chọn Tỉnh/TP trước --'}
                    </option>
                    {districts.map((d, i) => (
                      <option key={i} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Work address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📍 Địa chỉ làm việc cụ thể{' '}
                    <span className="ml-1 text-xs text-gray-500">
                      (Tùy chọn)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="workAddress"
                    value={formData.workAddress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Tầng 10, APEC Office Building, 112 Phan Châu Trinh..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Chỉ điền nếu vị trí này làm việc tại địa chỉ KHÁC với trụ sở
                    chính (chi nhánh, dự án, cửa hàng…)
                  </p>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại công việc
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full-time">Toàn thời gian</option>
                    <option value="part-time">Bán thời gian</option>
                    <option value="contract">Hợp đồng</option>
                    <option value="intern">Thực tập</option>
                  </select>
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mức lương
                  </label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20-30 triệu"
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2-5"
                  />
                </div>

                {/* Headcount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng cần tuyển
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="headcount"
                    value={formData.headcount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 3"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Để trống nếu chưa xác định chính xác.
                  </p>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày hết hạn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ngày cuối cùng nhận hồ sơ ứng tuyển
                  </p>
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngành nghề
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Công nghệ thông tin - Backend"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả công việc
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả ngắn gọn về công việc..."
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yêu cầu công việc
                </label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Các yêu cầu về kỹ năng, kinh nghiệm..."
                />
              </div>

              {/* AI info */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  🤖 Thông tin cho AI (quan trọng)
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả chi tiết công việc (JD){' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="jdText"
                    value={formData.jdText}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mô tả chi tiết yêu cầu công việc, kỹ năng cần thiết... AI sẽ dùng thông tin này để chấm điểm CV"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ví dụ: 'Cần tuyển Backend Developer (Node.js) biết Express,
                    JavaScript, MongoDB...'
                  </p>
                </div>

                {/* Must-have skills */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kỹ năng BẮT BUỘC{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                    ⚠️ <strong>Lưu ý:</strong> Tất cả kỹ năng ở đây đều là bắt
                    buộc. Ứng viên thiếu kỹ năng sẽ bị trừ điểm.
                  </p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={mustHaveInput}
                      onChange={(e) => setMustHaveInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addMustHaveSkill();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập kỹ năng, nhấn Enter để thêm (vd: nodejs, express, javascript, mongodb)"
                    />
                    <button
                      type="button"
                      onClick={addMustHaveSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.mustHaveSkills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeMustHaveSkill(skill)}
                          className="hover:text-red-900"
                          title="Xóa"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Gợi ý: nodejs, express, javascript, mongodb (hoặc nhóm DB
                    khác phù hợp)
                  </p>
                </div>
              </div>
            </div>
          </form>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}