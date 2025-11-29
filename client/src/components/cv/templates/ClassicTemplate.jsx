// client/src/components/cv/templates/ClassicTemplate.jsx
import React from 'react';

export default function ClassicTemplate({ data }) {
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
    <div className="bg-white text-gray-800 w-[700px] h-[990px] px-16 py-12 text-[12px] leading-relaxed font-serif">
      <header className="text-center mb-5">
        <h1 className="text-3xl font-bold tracking-wide mb-1">
          {fullName || 'Họ và tên'}
        </h1>
        <p className="italic text-sm">{position || 'Vị trí ứng tuyển'}</p>
        <div className="mt-3 text-[11px] text-gray-600 flex justify-center gap-4">
          <span>{email || 'you@example.com'}</span>
          <span>{phone || '0123 456 789'}</span>
          <span>{address || 'Địa chỉ'}</span>
        </div>
      </header>

      <hr className="border-gray-300 mb-4" />

      <section className="mb-4 text-xs">
        <h2 className="font-semibold mb-1 tracking-wide">GIỚI THIỆU</h2>
        <p>{summary || 'Giới thiệu ngắn gọn về bản thân.'}</p>
      </section>

      <section className="mb-4 text-xs whitespace-pre-line">
        <h2 className="font-semibold mb-1 tracking-wide">
          KINH NGHIỆM LÀM VIỆC
        </h2>
        <p>{experience || 'Mô tả kinh nghiệm làm việc của bạn.'}</p>
      </section>

      <section className="mb-4 text-xs whitespace-pre-line">
        <h2 className="font-semibold mb-1 tracking-wide">HỌC VẤN</h2>
        <p>{education || 'Thông tin học vấn.'}</p>
      </section>

      <section className="text-xs">
        <h2 className="font-semibold mb-1 tracking-wide">KỸ NĂNG</h2>
        <p>{skills || 'Liệt kê kỹ năng.'}</p>
      </section>
    </div>
  );
}