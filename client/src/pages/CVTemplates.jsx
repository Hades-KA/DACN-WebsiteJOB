// client/src/pages/CVTemplates.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function CVTemplates() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Tiêu đề */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Tạo CV Chuyên Nghiệp
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Chọn một trong những mẫu CV được thiết kế dưới đây để bắt đầu xây dựng
          hồ sơ của bạn. Bạn có thể chỉnh sửa nội dung và tải về dưới dạng PDF.
        </p>
      </div>

      {/* Grid các card template */}
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {CV_TEMPLATES.map((tpl) => {
          const Comp = TEMPLATE_COMPONENT_MAP[tpl.id] || ModernTemplate;

          return (
            <article
              key={tpl.id}
              className="bg-white rounded-3xl shadow-lg p-5 flex flex-col transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="rounded-2xl overflow-hidden mb-4 bg-gray-50 flex justify-center items-start h-[260px]">
                <div className="scale-[0.24] origin-top">
                  <Comp data={SAMPLE_CV} />
                </div>
              </div>

              <h3 className="font-semibold text-base mb-1">{tpl.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{tpl.description}</p>

              <button
                onClick={() => navigate(`/cv-builder/${tpl.id}`)}
                className="mt-auto w-full py-2 rounded-full text-sm font-medium text-white
                           bg-gradient-to-r from-pink-500 to-purple-600
                           hover:from-pink-600 hover:to-purple-700"
              >
                Tạo với thiết kế này
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}