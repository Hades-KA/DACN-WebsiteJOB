// client/src/components/cv/templates/ModernTemplate.jsx
import React from 'react';

export default function ModernTemplate({ data }) {
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

  const skillList = (skills || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="bg-white text-gray-900 w-[700px] h-[990px] text-[12px] leading-relaxed font-sans">
      {/* Thanh màu trên đầu */}
      <div className="h-3 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-600" />

      <div className="px-10 py-8">
        <header className="mb-5">
          <h1 className="text-3xl font-bold tracking-wide uppercase">
            {fullName || 'HỌ VÀ TÊN'}
          </h1>
          <p className="text-sm text-blue-600">
            {position || 'Vị trí ứng tuyển'}
          </p>
        </header>

        <div className="grid grid-cols-[1.6fr,1fr] gap-8">
          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-semibold tracking-[0.22em] text-blue-600 mb-1">
                GIỚI THIỆU
              </h2>
              <p>{summary || 'Giới thiệu ngắn gọn về bản thân.'}</p>
            </section>

            <section className="whitespace-pre-line">
              <h2 className="text-xs font-semibold tracking-[0.22em] text-blue-600 mb-1">
                KINH NGHIỆM LÀM VIỆC
              </h2>
              <p>{experience || 'Mô tả kinh nghiệm làm việc.'}</p>
            </section>

            <section className="whitespace-pre-line">
              <h2 className="text-xs font-semibold tracking-[0.22em] text-blue-600 mb-1">
                HỌC VẤN
              </h2>
              <p>{education || 'Thông tin học vấn.'}</p>
            </section>
          </div>

          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-semibold tracking-[0.22em] text-blue-600 mb-1">
                THÔNG TIN LIÊN HỆ
              </h2>
              <p>Email: {email || 'you@example.com'}</p>
              <p>Điện thoại: {phone || '0123 456 789'}</p>
              <p>Địa chỉ: {address || 'Địa chỉ hiện tại'}</p>
            </section>

            <section>
              <h2 className="text-xs font-semibold tracking-[0.22em] text-blue-600 mb-1">
                KỸ NĂNG
              </h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {(skillList.length ? skillList : ['Kỹ năng 1', 'Kỹ năng 2']).map(
                  (s) => (
                    <span
                      key={s}
                      className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-[11px] text-blue-700"
                    >
                      {s}
                    </span>
                  )
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}