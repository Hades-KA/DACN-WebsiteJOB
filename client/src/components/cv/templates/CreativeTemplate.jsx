// client/src/components/cv/templates/CreativeTemplate.jsx
import React from 'react';

export default function CreativeTemplate({ data }) {
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
    <div className="bg-white w-[700px] h-[990px] flex text-[12px] leading-relaxed font-sans">
      {/* Sidebar trái */}
      <aside className="w-[220px] bg-gradient-to-b from-indigo-900 to-blue-700 text-white p-6 flex flex-col">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-300 mx-auto mb-3" />
          <p className="text-center font-bold">
            {fullName || 'Họ và tên'}
          </p>
          <p className="text-center text-[11px] opacity-80">
            {position || 'Vị trí ứng tuyển'}
          </p>
        </div>

        <div className="space-y-4 text-[11px] flex-1">
          <div>
            <h3 className="font-semibold mb-1">LIÊN HỆ</h3>
            <p>{email || 'you@example.com'}</p>
            <p>{phone || '0123 456 789'}</p>
            <p>{address || 'Địa chỉ'}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">KỸ NĂNG</h3>
            {(skillList.length ? skillList : ['Kỹ năng 1', 'Kỹ năng 2']).map(
              (s) => (
                <div key={s} className="mb-1">
                  <span className="inline-block bg-white/10 px-2 py-1 rounded-full text-[10px]">
                    {s}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </aside>

      {/* Nội dung chính bên phải */}
      <main className="flex-1 bg-white px-8 py-6 text-gray-900">
        <section className="mb-4">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-indigo-700 mb-1">
            GIỚI THIỆU
          </h2>
          <p>{summary || 'Giới thiệu ngắn gọn về bản thân.'}</p>
        </section>

        <section className="mb-4 whitespace-pre-line">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-indigo-700 mb-1">
            KINH NGHIỆM LÀM VIỆC
          </h2>
          <p>{experience || 'Mô tả kinh nghiệm làm việc.'}</p>
        </section>

        <section className="whitespace-pre-line">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-indigo-700 mb-1">
            HỌC VẤN
          </h2>
          <p>{education || 'Thông tin học vấn.'}</p>
        </section>
      </main>
    </div>
  );
}