import React, { useState } from 'react';
import { LanguageType } from '../../types';

interface ImpactScreenProps {
  language: LanguageType;
  onShowToast: (msg: string, icon?: string) => void;
}

export const ImpactScreen: React.FC<ImpactScreenProps> = ({ language, onShowToast }) => {
  const isEn = language === 'en';
  const [activeBadgeModal, setActiveBadgeModal] = useState<string | null>(null);

  const weeklyTrendData = [
    { day: 'Mon', mins: 310, heightPct: 75, coached: false },
    { day: 'Tue', mins: 280, heightPct: 65, coached: false },
    { day: 'Wed', mins: 190, heightPct: 45, coached: true },
    { day: 'Thu', mins: 150, heightPct: 35, coached: true },
    { day: 'Fri', mins: 120, heightPct: 28, coached: true },
    { day: 'Sat', mins: 90, heightPct: 20, coached: true },
    { day: 'Sun', mins: 75, heightPct: 16, coached: true },
  ];

  const badges = [
    {
      id: 'badge-1',
      title: isEn ? 'Aqua Line Champion' : 'अॅक्वा लाईन चॅम्पियन',
      desc: isEn ? 'Chose metro over road 5 times during inversion peaks' : 'धुक्याच्या वेळी ५ वेळा मेट्रोची निवड केली',
      icon: 'train',
      earned: true,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'badge-2',
      title: isEn ? 'Early Riser' : 'सकाळचा प्रवासी',
      desc: isEn ? 'Shifted commute departure earlier to beat particulate smog' : 'प्रदूषण टाळण्यासाठी लवकर प्रवास केला',
      icon: 'schedule',
      earned: true,
      color: 'bg-[#e0f2fe] text-[#006591] border-[#bae6fd]',
    },
    {
      id: 'badge-3',
      title: isEn ? 'Clean Lung Guardian' : 'फुफ्फुस संरक्षक',
      desc: isEn ? 'Achieved 200+ minutes of avoided PM2.5 in a single week' : 'एकाच आठवड्यात २००+ मिनिटे संपर्क टाळला',
      icon: 'health_and_safety',
      earned: true,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'badge-4',
      title: isEn ? 'River Inversion Shield' : 'इनव्हर्जन शिल्ड',
      desc: isEn ? 'Bypassed river-basin inversion bridges during morning rush' : 'सकाळच्या वेळी नदी पुलांचा मार्ग टाळला',
      icon: 'shield',
      earned: false,
      color: 'bg-slate-50 text-slate-400 border-slate-200',
    },
  ];

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* 1. Header Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#006b5f] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {isEn ? 'Cumulative Health Ledger' : 'आरोग्य प्रभाव अहवाल'}
            </span>
            <span className="text-xs text-[#64748b]">Pune Metropolitan Area</span>
          </div>
          <h2 className="text-xl font-bold text-[#0f172a] tracking-tight mt-1">
            {isEn ? 'Your Breath Journey' : 'तुमचा श्वास प्रवास'}
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            {isEn
              ? "Weekly metrics detailing particulate inhalation avoided through AirGuard's coached routes."
              : 'मार्गदर्शित प्रवासाच्या निवडीमुळे टाळलेला प्रदूषण संपर्क आणि साप्ताहिक आरोग्य प्रगती.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onShowToast(
              isEn ? 'Exported Weekly Impact Summary (PDF)' : 'साप्ताहिक अहवाल डाउनलोड केला',
              'download'
            )
          }
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#006591] bg-[#e0f2fe] hover:bg-[#bae6fd] border border-[#bae6fd] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">file_download</span>
          <span>{isEn ? 'Export Report' : 'अहवाल डाउनलोड'}</span>
        </button>
      </div>

      {/* 2. Primary Milestone Hero Card */}
      <section
        className="rounded-2xl bg-gradient-to-br from-[#006591] to-[#0284c7] text-white p-6 shadow-md relative overflow-hidden"
        aria-labelledby="milestone-heading"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded-lg bg-white/15">
                <span className="material-symbols-outlined text-[18px]">eco</span>
              </span>
              <span className="text-xs font-bold text-[#e0f2fe] tracking-wide uppercase">
                {isEn ? 'Personal Weekly Milestone' : 'वैयक्तिक साप्ताहिक टप्पा'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums">
                212 mins
              </span>
              <span className="text-sm font-medium text-[#e0f2fe]">
                {isEn ? 'high-exposure time avoided' : 'टाळलेला प्रदूषण वेळ'}
              </span>
            </div>

            <p className="text-xs text-[#e0f2fe]/95 max-w-xl leading-relaxed mt-2">
              {isEn
                ? "That equals skipping 14 cigarettes worth of hazardous particulate inhalation during peak morning inversion hours."
                : 'हे सकाळच्या गर्दीच्या वेळी १४ सिगारेट्सइतका विषारी धूर शरीरात जाण्यापासून रोखण्यासारखे आहे.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
              <span className="text-[10px] text-[#e0f2fe] block">{isEn ? 'Clean Transit' : 'स्वच्छ प्रवास'}</span>
              <span className="text-lg font-bold tabular-nums">74%</span>
              <span className="text-[9px] text-[#e0f2fe]/80 block">Metro & Foot</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
              <span className="text-[10px] text-[#e0f2fe] block">{isEn ? 'PM2.5 Saved' : 'टाळलेले PM2.5'}</span>
              <span className="text-lg font-bold tabular-nums">64 µg/m³</span>
              <span className="text-[9px] text-[#e0f2fe]/80 block">Inhalation reduction</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Before vs After Comparison Cards */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-[#0f172a]">
          {isEn ? 'Typical Routine vs AirGuard Coached Travel' : 'नेहमीचा प्रवास विरुद्ध मार्गदर्शित प्रवास'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Without Coach */}
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  {isEn ? 'Unoptimized Commute' : 'मार्गदर्शनाशिवाय प्रवास'}
                </span>
                <span className="text-xs font-bold text-red-700 tabular-nums">420 min / wk</span>
              </div>
              <p className="text-xs text-[#475569]">
                {isEn
                  ? 'Exposed to unfiltered highway exhaust, arterial intersections, and heavy truck bottlenecks.'
                  : 'महामार्ग आणि गर्दीच्या चौकांमध्ये थेट विषारी धुराचा संपर्क.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-red-200/60 text-[11px] text-red-700 font-semibold">
              {isEn ? 'High respiratory strain index' : 'फुफ्फुसांवर उच्च ताण'}
            </div>
          </div>

          {/* With AirGuard */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {isEn ? 'AirGuard Optimized' : 'AirGuard सह अनुकूलित'}
                </span>
                <span className="text-xs font-bold text-emerald-700 tabular-nums">208 min / wk (51% Cleaner)</span>
              </div>
              <p className="text-xs text-[#475569]">
                {isEn
                  ? 'Utilized HEPA-filtered metro cabins, timed departures outside peak inversion, and green corridors.'
                  : 'मेट्रो, लवकर प्रस्थान आणि अंतर्गत रस्त्यांचा वापर.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-700 font-semibold">
              {isEn ? 'Minimal respiratory particulate loading' : 'कमीतकमी श्वसन धोका'}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Weekly Day-by-Day Trend Chart */}
      <section
        className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm"
        aria-labelledby="trend-heading"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 id="trend-heading" className="text-sm font-bold text-[#0f172a]">
              {isEn ? 'Daily Exposure Timeline' : 'दैनंदिन संपर्क घटनाक्रम'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isEn ? 'Minutes spent in high PM2.5 environments each day' : 'जास्त PM2.5 भागात घालवलेली मिनिटे'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#64748b]">
              <span className="w-3 h-3 rounded-sm bg-[#94a3b8]" />
              {isEn ? 'Uncoached' : 'अनियंत्रित'}
            </span>
            <span className="flex items-center gap-1.5 text-[#006591]">
              <span className="w-3 h-3 rounded-sm bg-[#006591]" />
              {isEn ? 'Coached' : 'मार्गदर्शित'}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between h-40 pt-6 px-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
          {weeklyTrendData.map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
              <span className="text-[10px] font-bold tabular-nums text-[#0f172a]">
                {day.mins}m
              </span>
              <div
                className={`w-8 rounded-t-md transition-all ${
                  day.coached ? 'bg-[#006591]' : 'bg-[#94a3b8]'
                }`}
                style={{ height: `${day.heightPct}%` }}
              />
              <span className="text-[11px] font-semibold text-[#64748b]">{day.day}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Clean Air Achievement Badges */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-[#0f172a]">
          {isEn ? 'Clean Air Achievements' : 'स्वच्छ हवा यशोगाथा'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              onClick={() => setActiveBadgeModal(badge.id)}
              className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all hover:shadow-xs ${badge.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[24px]">{badge.icon}</span>
                {badge.earned ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70">
                    {isEn ? 'Earned' : 'मिळवले'}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    {isEn ? 'Locked' : 'बंद'}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#0f172a]">{badge.title}</h4>
                <p className="text-[11px] text-[#475569] mt-0.5 leading-snug">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal / Toast detail for badge */}
      {activeBadgeModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setActiveBadgeModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#e2e8f0] shadow-xl text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#e0f2fe] text-[#006591] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">military_tech</span>
            </div>
            <h4 className="text-base font-bold text-[#0f172a]">
              {badges.find((b) => b.id === activeBadgeModal)?.title}
            </h4>
            <p className="text-xs text-[#475569]">
              {badges.find((b) => b.id === activeBadgeModal)?.desc}
            </p>
            <button
              type="button"
              onClick={() => setActiveBadgeModal(null)}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-[#006591] text-white hover:bg-[#004c6e] cursor-pointer"
            >
              {isEn ? 'Close' : 'बंद करा'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
