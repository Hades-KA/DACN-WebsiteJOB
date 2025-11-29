// client/src/components/cv/templates/MinimalistTemplate.jsx
import React from 'react';

export default function MinimalistTemplate({ data }) {
  const {
    fullName,
    position,
    summary,
    email,
    phone,
    address,
    experience,
    education,
    skills,
  } = data;

  return (
    <div className="bg-white text-gray-900 w-[700px] h-[990px] px-16 py-12 text-[12px] leading-relaxed font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-light tracking-widest uppercase">
          {fullName || 'Họ và tên'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {position || 'Vị trí ứng tuyển'}
        </p>
      </header>

      <div className="grid grid-cols-[2fr,1.1fr] gap-10 text-xs">
        <div className="space-y-4">
          <section>
            <h2 className="font-semibold mb-1 uppercase text-[11px] tracking-wide">
              Giới thiệu
            </h2>
            <p>{summary || 'Giới thiệu ngắn gọn.'}</p>
          </section>

          <section className="whitespace-pre-line">
            <h2 className="font-semibold mb-1 uppercase text-[11px] tracking-wide">
              Kinh nghiệm
            </h2>
            <p>{experience || 'Mô tả kinh nghiệm.'}</p>
          </section>

          <section className="whitespace-pre-line">
            <h2 className="font-semibold mb-1 uppercase text-[11px] tracking-wide">
              Học vấn
            </h2>
            <p>{education || 'Thông tin học vấn.'}</p>
          </section>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="font-semibold mb-1 uppercase text-[11px] tracking-wide">
              Liên hệ
            </h2>
            <p>{email || 'you@example.com'}</p>
            <p>{phone || '0123 456 789'}</p>
            <p>{address || 'Địa chỉ'}</p>
          </section>

          <section>
            <h2 className="font-semibold mb-1 uppercase text-[11px] tracking-wide">
              Kỹ năng
            </h2>
            <p>{skills || 'Liệt kê kỹ năng.'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}