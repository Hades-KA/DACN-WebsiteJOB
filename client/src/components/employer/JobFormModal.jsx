import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { jobService } from '../../services/api';
import { toast } from 'react-toastify';

export default function JobFormModal({ open, onClose, job, onSuccess }) {
  const isEdit = !!job;
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'full-time',
    salary: '',
    experience: '',
    description: '',
    requirements: '',
    category: '',
    jdText: '',
    mustHaveSkills: [],
    niceToHaveSkills: [],
  });
  
  const [mustHaveInput, setMustHaveInput] = useState('');
  const [niceToHaveInput, setNiceToHaveInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open) {
      if (job) {
        // Parse skills từ JSON string
        const parseMustHave = () => {
          try {
            const parsed = JSON.parse(job.mustHaveSkills || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        };
        
        const parseNiceToHave = () => {
          try {
            const parsed = JSON.parse(job.niceToHaveSkills || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        };
        
        setFormData({
          title: job.title || '',
          company: job.company || '',
          location: job.location || '',
          type: job.type || 'full-time',
          salary: job.salary || '',
          experience: job.experience || '',
          description: job.description || '',
          requirements: job.requirements || '',
          category: job.category || '',
          jdText: job.jdText || '',
          mustHaveSkills: parseMustHave(),
          niceToHaveSkills: parseNiceToHave(),
        });
      } else {
        setFormData({
          title: '',
          company: '',
          location: '',
          type: 'full-time',
          salary: '',
          experience: '',
          description: '',
          requirements: '',
          category: '',
          jdText: '',
          mustHaveSkills: [],
          niceToHaveSkills: [],
        });
      }
    }
  }, [open, job]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const addMustHaveSkill = () => {
    const skill = mustHaveInput.trim().toLowerCase();
    if (skill && !formData.mustHaveSkills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        mustHaveSkills: [...prev.mustHaveSkills, skill]
      }));
      setMustHaveInput('');
    }
  };
  
  const removeMustHaveSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      mustHaveSkills: prev.mustHaveSkills.filter(s => s !== skill)
    }));
  };
  
  const addNiceToHaveSkill = () => {
    const skill = niceToHaveInput.trim().toLowerCase();
    if (skill && !formData.niceToHaveSkills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        niceToHaveSkills: [...prev.niceToHaveSkills, skill]
      }));
      setNiceToHaveInput('');
    }
  };
  
  const removeNiceToHaveSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      niceToHaveSkills: prev.niceToHaveSkills.filter(s => s !== skill)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề công việc');
      return;
    }
    
    if (!formData.jdText.trim()) {
      toast.error('Vui lòng nhập mô tả chi tiết công việc (JD)');
      return;
    }
    
    if (formData.mustHaveSkills.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 kỹ năng bắt buộc');
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        mustHaveSkills: JSON.stringify(formData.mustHaveSkills),
        niceToHaveSkills: JSON.stringify(formData.niceToHaveSkills),
      };
      
      if (isEdit) {
        await jobService.updateJob(job.id, payload);
        toast.success('Cập nhật tin tuyển dụng thành công!');
      } else {
        await jobService.createJob(payload);
        toast.success('Tạo tin tuyển dụng thành công!');
      }
      
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
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
          
          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="VD: Frontend Developer"
                  />
                </div>
                
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa điểm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Hà Nội, TP.HCM..."
                  />
                </div>
                
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
                    placeholder="15-20 triệu"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kinh nghiệm
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2-3 năm"
                  />
                </div>
                
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
                    placeholder="IT, Marketing, Sales..."
                  />
                </div>
              </div>
              
              {/* Mô tả công việc */}
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
              
              {/* JD cho AI */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  🤖 Thông tin cho AI (quan trọng)
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả chi tiết công việc (JD) <span className="text-red-500">*</span>
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
                    Ví dụ: "Cần tuyển Frontend Developer biết React, JavaScript, TypeScript. Có kinh nghiệm 2-3 năm..."
                  </p>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kỹ năng BẮT BUỘC (must-have) <span className="text-red-500">*</span>
                  </label>
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
                      placeholder="Nhập kỹ năng, nhấn Enter để thêm"
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
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeMustHaveSkill(skill)}
                          className="hover:text-red-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ví dụ: react, javascript, html, css
                  </p>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kỹ năng ƯU TIÊN (nice-to-have)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={niceToHaveInput}
                      onChange={(e) => setNiceToHaveInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addNiceToHaveSkill();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập kỹ năng, nhấn Enter để thêm"
                    />
                    <button
                      type="button"
                      onClick={addNiceToHaveSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.niceToHaveSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeNiceToHaveSkill(skill)}
                          className="hover:text-green-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ví dụ: typescript, redux, nextjs
                  </p>
                </div>
              </div>
            </div>
          </form>
          
          {/* Footer */}
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
              {loading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo mới')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}