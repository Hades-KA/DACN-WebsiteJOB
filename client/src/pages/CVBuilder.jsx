// client/src/pages/CVBuilder.jsx
import React, { useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

import { CV_TEMPLATES, SAMPLE_CV } from '../data/cvTemplates';

import ModernTemplate from '../components/cv/templates/ModernTemplate';
import ClassicTemplate from '../components/cv/templates/ClassicTemplate';
import CreativeTemplate from '../components/cv/templates/CreativeTemplate';
import MinimalistTemplate from '../components/cv/templates/MinimalistTemplate';
import ProfessionalTemplate from '../components/cv/templates/ProfessionalTemplate';
import ExecutiveTemplate from '../components/cv/templates/ExecutiveTemplate';

const TEMPLATE_COMPONENT_MAP = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  creative: CreativeTemplate,
  minimalist: MinimalistTemplate,
  professional: ProfessionalTemplate,
  executive: ExecutiveTemplate,
};

export default function CVBuilder() {
  const { templateId } = useParams();

  const SelectedTemplate = useMemo(
    () => TEMPLATE_COMPONENT_MAP[templateId] || ModernTemplate,
    [templateId]
  );

  const [form, setForm] = useState({
    fullName: SAMPLE_CV.fullName,
    position: SAMPLE_CV.position,
    summary: SAMPLE_CV.summary,
    email: SAMPLE_CV.email,
    phone: SAMPLE_CV.phone,
    address: SAMPLE_CV.address,
    experience: SAMPLE_CV.experience,
    education: SAMPLE_CV.education,
    skills: SAMPLE_CV.skills,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${form.fullName || 'CV'}-${templateId || 'template'}`,
  });

  const tplInfo = CV_TEMPLATES.find((t) => t.id === templateId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Cột form */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold mb-2">
          {tplInfo?.name || 'Tạo CV'}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          Nhập thông tin của bạn. Nội dung sẽ được hiển thị theo mẫu CV đã chọn.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Họ và tên"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="position"
            value={form.position}
            onChange={handleChange}
            placeholder="Vị trí ứng tuyển"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Số điện thoại"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Địa chỉ"
            className="md:col-span-2 border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <textarea
          name="summary"
          value={form.summary}
          onChange={handleChange}
          placeholder="Giới thiệu bản thân"
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          name="experience"
          value={form.experience}
          onChange={handleChange}
          placeholder="Kinh nghiệm làm việc"
          rows={4}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          name="education"
          value={form.education}
          onChange={handleChange}
          placeholder="Học vấn"
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          name="skills"
          value={form.skills}
          onChange={handleChange}
          placeholder="Kỹ năng (phân tách bằng dấu phẩy)"
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />

        <button
          onClick={handlePrint}
          className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Tải CV PDF
        </button>
      </div>

      {/* Cột preview */}
      <div className="flex justify-center overflow-auto">
        <div ref={printRef} className="bg-gray-200 p-2">
          <SelectedTemplate data={form} />
        </div>
      </div>
    </div>
  );
}