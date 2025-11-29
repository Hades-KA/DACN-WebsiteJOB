import React from 'react';

export default function ProfessionalTemplate({ data }) {
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
      {/* Thanh đứng bên trái */}
      <div className="flex h-full">
        <div className="w-2 bg-gradient-to-b from-blue-700 to-sky-400" />

        <div className="flex-1 px-10 py-8">
          {/* Header */}
          <header className="mb-5 border-b pb-4">
            <h1 className="text-3xl font-bold tracking-wide uppercase">
              {fullName || 'HỌ VÀ TÊN'}
            </h1>
            <p className="text-sm text-blue-600">
              {position || 'Vị trí ứng tuyển'}
            </p>
            <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>{email || 'you@example.com'}</span>
              <span>{phone || '0123 456 789'}</span>
              <span>{address || 'Địa chỉ'}</span>
            </div>
          </header>

          {/* Nội dung 2 cột */}
          <div className="grid grid-cols-[1.6fr,1fr] gap-8">
            <div className="space-y-4">
              <section>
                <h2 className="text-xs font-semibold tracking-[0.2em] text-gray-700 mb-1">
                  GIỚI THIỆU
                </h2>
                <p>{summary || 'Giới thiệu ngắn gọn.'}</p>
              </section>

              <section className="whitespace-pre-line">
                <h2 className="text-xs font-semibold tracking-[0.2em] text-gray-700 mb-1">
                  KINH NGHIỆM LÀM VIỆC
                </h2>
                <p>{experience || 'Mô tả kinh nghiệm.'}</p>
              </section>

              <section className="whitespace-pre-line">
                <h2 className="text-xs font-semibold tracking-[0.2em] text-gray-700 mb-1">
                  HỌC VẤN
                </h2>
                <p>{education || 'Thông tin học vấn.'}</p>
              </section>
            </div>

            <div className="space-y-4">
              <section>
                <h2 className="text-xs font-semibold tracking-[0.2em] text-gray-700 mb-1">
                  KỸ NĂNG
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(skillList.length ? skillList : ['Kỹ năng 1', 'Kỹ năng 2']).map(
                    (s) => (
                      <span
                        key={s}
                        className="inline-flex items-center px-2 py-1 rounded-full border border-blue-200 text-blue-700 text-[11px]"
                      >
                        {s}
                      </span>
                    )
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-semibold tracking-[0.2em] text-gray-700 mb-1">
                  GHI CHÚ
                </h2>
                <p>
                  Thêm các thông tin khác như chứng chỉ, giải thưởng hoặc hoạt
                  động nổi bật.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}