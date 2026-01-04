import React from 'react';

export default function ExecutiveTemplate({ data }) {
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
      {/* Header vàng cam */}
      <header className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 text-white px-10 py-6">
        <h1 className="text-3xl font-semibold tracking-wide uppercase">
          {fullName || 'HỌ VÀ TÊN'}
        </h1>
        <p className="text-sm opacity-90">
          {position || 'Vị trí ứng tuyển'}
        </p>
      </header>

      <div className="px-10 py-8 grid grid-cols-[1.5fr,1fr] gap-8 h-[calc(990px-6rem)]">
        {/* Cột trái */}
        <div className="space-y-4">
          <section>
            <h2 className="text-xs font-semibold tracking-[0.22em] text-amber-700 mb-1">
              GIỚI THIỆU
            </h2>
            <p>{summary || 'Giới thiệu ngắn gọn.'}</p>
          </section>

          <section className="whitespace-pre-line">
            <h2 className="text-xs font-semibold tracking-[0.22em] text-amber-700 mb-1">
              KINH NGHIỆM LÀM VIỆC
            </h2>
            <p>{experience || 'Mô tả kinh nghiệm.'}</p>
          </section>

          <section className="whitespace-pre-line">
            <h2 className="text-xs font-semibold tracking-[0.22em] text-amber-700 mb-1">
              HỌC VẤN
            </h2>
            <p>{education || 'Thông tin học vấn.'}</p>
          </section>
        </div>

        {/* Cột phải */}
        <div className="space-y-4">
          <section className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
            <h2 className="font-semibold mb-1 text-amber-700 uppercase text-[11px] tracking-wide">
              LIÊN HỆ
            </h2>
            <p>{email || 'you@example.com'}</p>
            <p>{phone || '0123 456 789'}</p>
            <p>{address || 'Địa chỉ'}</p>
          </section>

          <section className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
            <h2 className="font-semibold mb-1 text-amber-700 uppercase text-[11px] tracking-wide">
              KỸ NĂNG
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {(skillList.length ? skillList : ['Kỹ năng 1', 'Kỹ năng 2']).map(
                (s) => (
                  <span
                    key={s}
                    className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[11px]"
                  >
                    {s}
                  </span>
                )
              )}
            </div>
          </section>

          <section className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
            <h2 className="font-semibold mb-1 text-amber-700 uppercase text-[11px] tracking-wide">
              GHI CHÚ
            </h2>
            <p>
              Dùng phần này để nêu thành tựu nổi bật, định hướng nghề nghiệp
              hoặc triết lý làm việc.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}