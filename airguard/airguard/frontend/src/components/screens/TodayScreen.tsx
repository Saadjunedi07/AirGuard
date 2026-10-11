import React, { useEffect, useState } from 'react';
import { ActionItem, AirQuality, FamilyProfile, LanguageType } from '../../types';
import { WEEKLY_CHART_DATA } from '../../data';
import { formatAppDateTime } from '../../utils/dateTime';

interface TodayScreenProps {
  airQuality: AirQuality | null;
  language: LanguageType;
  activeProfile: FamilyProfile;
  actionItems: ActionItem[];
  onToggleActionItem: (id: string) => void;
  onNavigateToRoutes: () => void;
  onOpenWizard: () => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  language,
  activeProfile,
  actionItems,
  airQuality,
  onToggleActionItem,
  onNavigateToRoutes,
  onOpenWizard,
  onShowToast,
}) => {
  const isEn = language === 'en';
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setClock(new Date());
    updateClock();
    const intervalId = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const completedCount = actionItems.filter((i) => i.completed).length;
  const currentAQI = airQuality?.us_aqi ? Math.round(airQuality.us_aqi) : null;

  const getAQIStatus = (aqi: number | null) => {
    if (aqi === null) {
      return {
        label: isEn ? 'Loading AQI...' : 'लोड होत आहे...',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeBg: 'bg-slate-500',
        textColor: 'text-slate-700',
        description: isEn ? 'Fetching sensor data...' : 'माहिती गोळा केली जात आहे...',
        scalePct: 0,
      };
    }

    if (aqi <= 50) {
      return {
        label: isEn ? 'Good' : 'चांगली (उत्तम)',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgeBg: 'bg-emerald-600',
        textColor: 'text-emerald-700',
        description: isEn ? 'Air quality is satisfactory and poses little or no risk.' : 'हवेची गुणवत्ता समाधानकारक आहे.',
        scalePct: (aqi / 50) * 20,
      };
    }

    if (aqi <= 100) {
      return {
        label: isEn ? 'Moderate' : 'मध्यम',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        badgeBg: 'bg-amber-500',
        textColor: 'text-amber-700',
        description: isEn ? 'Acceptable air quality; sensitive individuals should monitor symptoms.' : 'हवेची गुणवत्ता मध्यम आहे.',
        scalePct: 20 + ((aqi - 50) / 50) * 20,
      };
    }

    if (aqi <= 150) {
      return {
        label: isEn ? 'Unhealthy for Sensitive Groups' : 'संवेदनशील लोकांसाठी अस्वास्थ्यकर',
        color: 'bg-orange-50 text-orange-800 border-orange-200',
        badgeBg: 'bg-orange-500',
        textColor: 'text-orange-700',
        description: isEn ? 'Members of sensitive groups may experience health effects.' : 'संवेदनशील व्यक्तींवर परिणाम होऊ शकतो.',
        scalePct: 40 + ((aqi - 100) / 50) * 20,
      };
    }

    if (aqi <= 200) {
      return {
        label: isEn ? 'Unhealthy' : 'अस्वास्थ्यकर',
        color: 'bg-red-50 text-red-800 border-red-200',
        badgeBg: 'bg-red-600',
        textColor: 'text-red-700',
        description: isEn ? 'Everyone may begin to experience health effects.' : 'सर्वांच्या आरोग्यावर परिणाम होऊ शकतो.',
        scalePct: 60 + ((aqi - 150) / 50) * 20,
      };
    }

    if (aqi <= 300) {
      return {
        label: isEn ? 'Very Unhealthy' : 'अत्यंत अस्वास्थ्यकर',
        color: 'bg-purple-50 text-purple-800 border-purple-200',
        badgeBg: 'bg-purple-600',
        textColor: 'text-purple-700',
        description: isEn ? 'Health alert: significant health risk for entire population.' : 'आरोग्य आणीबाणी: अत्यंत अस्वास्थ्यकर.',
        scalePct: 80 + ((aqi - 200) / 100) * 20,
      };
    }

    return {
      label: isEn ? 'Hazardous' : 'धोकादायक',
      color: 'bg-rose-100 text-rose-900 border-rose-300',
      badgeBg: 'bg-rose-700',
      textColor: 'text-rose-800',
      description: isEn ? 'Health warning of emergency conditions.' : 'धोकादायक परिस्थिती.',
      scalePct: 100,
    };
  };

  const aqiStatus = getAQIStatus(currentAQI);

  // Profile-specific commute risk modeling
  const baseAQI = currentAQI ?? 90;
  const asthmaAdjustment = activeProfile.isAsthma ? 15 : 0;
  const carRisk = Math.min(100, Math.round(baseAQI * 0.55 + asthmaAdjustment + 20));
  const metroRisk = Math.min(100, Math.round(baseAQI * 0.30 + asthmaAdjustment));
  const cleanerPercentage = carRisk > 0 ? Math.max(0, Math.round(((carRisk - metroRisk) / carRisk) * 100)) : 0;
  const recommendedRoute = metroRisk <= carRisk ? 'metro' : 'car';

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* 1. Location & Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2 text-xs text-[#475569]">
          <span className="material-symbols-outlined text-[18px] text-[#006591]">location_on</span>
          <span className="font-semibold text-[#0f172a]">Pune, Maharashtra</span>
          <span className="text-[#cbd5e1]">•</span>
          <span>Open-Meteo Environmental Sensor</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#64748b]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[15px] text-[#006591]">update</span>
            <span>
              {isEn ? 'Current Time: ' : 'वेळ: '}
              <strong className="text-[#0f172a] tabular-nums font-semibold">
                {clock ? formatAppDateTime(clock, language) : '—'}
              </strong>
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-semibold text-[#334155]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
            {isEn ? 'Live Data Feed' : 'थेट माहिती'}
          </span>
        </div>
      </div>

      {/* 2. Primary Hero AQI Card */}
      <section
        className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm relative overflow-hidden"
        aria-labelledby="aqi-hero-heading"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Giant AQI Display & Category */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-[#64748b] uppercase">
                {isEn ? 'Air Quality Index (AQI)' : 'हवेचा गुणवत्ता निर्देशांक'}
              </span>
              <span className="text-[10px] text-[#94a3b8] font-medium">US-EPA Standard</span>
            </div>

            <div className="flex items-baseline gap-4 mt-2">
              <div className="flex items-baseline">
                <span className="text-5xl sm:text-6xl font-extrabold text-[#0f172a] tracking-tight tabular-nums">
                  {currentAQI ?? '--'}
                </span>
                <span className="text-sm font-semibold text-[#64748b] ml-1.5">AQI</span>
              </div>

              <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${aqiStatus.color}`}>
                <span className="material-symbols-outlined text-[16px]">air</span>
                <span>{aqiStatus.label}</span>
              </div>
            </div>

            <p className="text-xs text-[#475569] mt-2 max-w-xl leading-relaxed">
              {aqiStatus.description}
            </p>

            {/* AQI Gradient Spectrum Bar */}
            <div className="mt-4 max-w-md">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-600 relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#0f172a] shadow-md transition-all duration-700"
                  style={{ left: `calc(${Math.min(96, Math.max(2, aqiStatus.scalePct))}% - 8px)` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#94a3b8] font-medium mt-1">
                <span>0 (Good)</span>
                <span>100 (Mod)</span>
                <span>150 (Sensitive)</span>
                <span>200+ (Unhealthy)</span>
              </div>
            </div>
          </div>

          {/* Right: Detailed Pollutant Grid */}
          <div className="lg:w-80 grid grid-cols-3 gap-2.5 bg-[#f8fafc] p-3.5 rounded-xl border border-[#e2e8f0]">
            <div className="flex flex-col bg-white p-2.5 rounded-lg border border-[#e2e8f0]/80">
              <span className="text-[10px] font-bold text-[#64748b]">PM2.5</span>
              <span className="text-sm font-bold text-[#0f172a] tabular-nums mt-0.5">
                {airQuality ? `${airQuality.pm2_5.toFixed(1)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94a3b8]">µg/m³</span>
            </div>

            <div className="flex flex-col bg-white p-2.5 rounded-lg border border-[#e2e8f0]/80">
              <span className="text-[10px] font-bold text-[#64748b]">PM10</span>
              <span className="text-sm font-bold text-[#0f172a] tabular-nums mt-0.5">
                {airQuality ? `${airQuality.pm10.toFixed(1)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94a3b8]">µg/m³</span>
            </div>

            <div className="flex flex-col bg-white p-2.5 rounded-lg border border-[#e2e8f0]/80">
              <span className="text-[10px] font-bold text-[#64748b]">CO</span>
              <span className="text-sm font-bold text-[#0f172a] tabular-nums mt-0.5">
                {airQuality ? `${Math.round(airQuality.carbon_monoxide)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94a3b8]">µg/m³</span>
            </div>

            <div className="flex flex-col bg-white p-2.5 rounded-lg border border-[#e2e8f0]/80">
              <span className="text-[10px] font-bold text-[#64748b]">NO₂</span>
              <span className="text-sm font-bold text-[#0f172a] tabular-nums mt-0.5">
                {airQuality ? `${airQuality.nitrogen_dioxide.toFixed(1)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94a3b8]">µg/m³</span>
            </div>

            <div className="flex flex-col bg-white p-2.5 rounded-lg border border-[#e2e8f0]/80">
              <span className="text-[10px] font-bold text-[#64748b]">SO₂</span>
              <span className="text-sm font-bold text-[#0f172a] tabular-nums mt-0.5">
                {airQuality ? `${airQuality.sulphur_dioxide.toFixed(1)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94a3b8]">µg/m³</span>
            </div>

            <div className="flex flex-col bg-white p-2.5 rounded-lg border border-[#e2e8f0]/80">
              <span className="text-[10px] font-bold text-[#64748b]">O₃</span>
              <span className="text-sm font-bold text-[#0f172a] tabular-nums mt-0.5">
                {airQuality ? `${airQuality.ozone.toFixed(1)}` : '--'}
              </span>
              <span className="text-[9px] text-[#94a3b8]">µg/m³</span>
            </div>
          </div>
        </div>

        {/* 3. Personal Risk Assessment Banner Inside Hero */}
        <div className="mt-5 pt-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${activeProfile.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
              {activeProfile.avatarText}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0f172a]">{activeProfile.name}</span>
                <span className="text-[10px] font-bold text-[#006591] bg-[#e0f2fe] px-1.5 py-0.2 rounded-md">
                  {activeProfile.badge}
                </span>
              </div>
              <p className="text-[11px] text-[#475569] mt-0.5">
                {activeProfile.isAsthma
                  ? (isEn ? 'Sensitive airway triggers active. Take precautions during traffic peak.' : 'दम्याचे रुग्ण: गर्दीच्या वेळी विशेष काळजी घ्या.')
                  : (isEn ? 'Standard outdoor activity safe with monitored exposure.' : 'सर्वसामान्य दिनचर्या सुरक्षित आहे.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenWizard}
            className="self-end sm:self-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[#006591] bg-white border border-[#cbd5e1] hover:bg-[#e0f2fe] transition-colors cursor-pointer shrink-0"
          >
            {isEn ? 'Personalize Limits' : 'मर्यादा बदला'}
          </button>
        </div>
      </section>

      {/* 4. Two-Column Dashboard Grid: Action Plan & Commute Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Morning Action Plan Card */}
        <section
          className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm flex flex-col justify-between"
          aria-labelledby="action-plan-heading"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 id="action-plan-heading" className="text-sm font-bold text-[#0f172a]">
                  {isEn ? 'Morning Action Plan' : 'सकाळची कृती योजना'}
                </h2>
                <p className="text-xs text-[#64748b]">
                  {isEn ? 'Actionable steps to avoid morning particulate peak' : 'प्रदूषणाचा संपर्क टाळण्यासाठी उपाय'}
                </p>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  completedCount === actionItems.length
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-[#e0f2fe] text-[#006591] border-[#bae6fd]'
                }`}
              >
                {completedCount}/{actionItems.length} {isEn ? 'Done' : 'पूर्ण'}
              </span>
            </div>

            {/* Checklist Progress Bar */}
            <div className="w-full bg-[#f1f5f9] h-1.5 rounded-full overflow-hidden mb-3.5">
              <div
                className="bg-[#006591] h-full rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / Math.max(1, actionItems.length)) * 100}%` }}
              />
            </div>

            {/* Interactive Checklist Items */}
            <div className="space-y-2">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onToggleActionItem(item.id);
                    onShowToast(
                      !item.completed
                        ? isEn
                          ? `Completed: "${item.title}" (+15m exposure avoided)`
                          : `पूर्ण झाले: "${item.title}"`
                        : isEn
                          ? 'Updated action plan'
                          : 'योजना अद्यतनित केली',
                      'check_circle'
                    );
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                    item.completed
                      ? 'bg-[#f8fafc] border-[#e2e8f0] opacity-80'
                      : 'bg-white border-[#e2e8f0] hover:border-[#006591]/40 hover:bg-[#f8fafc]/50 shadow-2xs'
                  }`}
                  role="checkbox"
                  aria-checked={item.completed}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onToggleActionItem(item.id);
                    }
                  }}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        item.completed
                          ? 'bg-[#006591] border-[#006591] text-white'
                          : 'border-[#cbd5e1] bg-white group-hover:border-[#006591]'
                      }`}
                    >
                      {item.completed && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold leading-tight transition-colors ${
                        item.completed ? 'line-through text-[#64748b]' : 'text-[#0f172a]'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 leading-snug ${
                        item.completed ? 'text-[#94a3b8]' : 'text-[#475569]'
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>

                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      item.completed ? 'text-[#94a3b8]' : 'text-[#006591]'
                    }`}
                  >
                    {item.icon}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commute Route Comparison Card */}
        <section
          className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm flex flex-col justify-between"
          aria-labelledby="commute-heading"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 id="commute-heading" className="text-sm font-bold text-[#0f172a]">
                  {isEn ? 'Commute Route Exposure Comparison' : 'मार्ग संपर्क तुलना'}
                </h2>
                <p className="text-xs text-[#64748b]">
                  {isEn ? 'Kothrud to Shivajinagar Corridor' : 'कोथरूड ते शिवाजीनगर कॉरिडोअर'}
                </p>
              </div>

              <button
                type="button"
                onClick={onNavigateToRoutes}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#006591] bg-[#e0f2fe] hover:bg-[#bae6fd] transition-colors cursor-pointer"
                title="Open interactive route planner"
              >
                <span>{isEn ? 'Full Map' : 'नकाशा'}</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Private Car Route */}
              <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#64748b] text-[18px]">
                      directions_car
                    </span>
                    <span className="font-semibold text-[#0f172a]">
                      {isEn ? 'Private Car (Karve Road)' : 'कार (कर्वे रस्ता)'}
                    </span>
                  </div>
                  <span className="text-[#64748b] tabular-nums font-semibold">
                    42 min · AQI {baseAQI}
                  </span>
                </div>

                <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${carRisk}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#64748b]">
                  <span>{isEn ? 'High road particulate exposure' : 'जास्त रस्ता प्रदूषण'}</span>
                  <span className="font-bold text-red-600 tabular-nums">{carRisk}% Est. Risk</span>
                </div>
              </div>

              {/* Metro + Walking Route */}
              <div
                onClick={onNavigateToRoutes}
                className={`p-3.5 rounded-xl border flex flex-col gap-2 relative overflow-hidden transition-all cursor-pointer ${
                  recommendedRoute === 'metro'
                    ? 'bg-[#e0f2fe]/40 border-[#006591] shadow-2xs hover:bg-[#e0f2fe]/60'
                    : 'bg-[#f8fafc] border-[#e2e8f0]'
                }`}
              >
                {recommendedRoute === 'metro' && (
                  <div className="absolute top-0 right-0 bg-[#006591] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg tracking-wider uppercase">
                    {isEn ? 'RECOMMENDED' : 'शिफारस'}
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006591] text-[18px]">
                      train
                    </span>
                    <span className="font-bold text-[#0f172a]">
                      {isEn ? 'Aqua Line Metro + Walk' : 'मेट्रो + पायी'}
                    </span>
                  </div>
                  <span className="text-[#004c6e] tabular-nums font-semibold">
                    28 min · AQI {baseAQI}
                  </span>
                </div>

                <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#006b5f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${metroRisk}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#004c6e]">
                  <span>{isEn ? 'Controlled indoor filtration' : 'कमी संपर्क'}</span>
                  <span className="font-bold text-[#006b5f] tabular-nums">
                    {metroRisk}% Risk ({cleanerPercentage}% cleaner)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#94a3b8] mt-3 pt-2 border-t border-[#e2e8f0] leading-relaxed">
            {isEn
              ? 'Exposure index is an estimate based on current city AQI, duration, and mode factors. It is not measured personal exposure.'
              : 'एक्सपोजर इंडेक्स हा अंदाज आहे; हे वैयक्तिक प्रदूषण मापन नाही.'}
          </p>
        </section>
      </div>

      {/* 5. Weekly Exposure Avoided Chart Card */}
      <section
        className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm"
        aria-labelledby="weekly-impact-heading"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="weekly-impact-heading" className="text-sm font-bold text-[#0f172a]">
              {isEn ? 'Weekly Exposure Avoided' : 'या आठवड्यात टाळलेले प्रदूषण'}
            </h2>
            <p className="text-xs text-[#64748b]">
              {isEn ? 'Daily pollution reduction from coached transit choices' : 'प्रवासाच्या योग्य निवडीमुळे टाळलेले प्रदूषण'}
            </p>
          </div>

          <span className="text-xs font-bold text-[#006b5f] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full tabular-nums">
            +64 µg/m³ PM2.5 Avoided
          </span>
        </div>

        {/* Bar Chart Visualization */}
        <div className="flex items-end justify-between h-32 pt-6 px-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
          {WEEKLY_CHART_DATA.map((item, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isWeekend = idx >= 5;

            return (
              <button
                key={item.day}
                type="button"
                onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
                className="flex flex-col items-center gap-1.5 flex-1 group focus:outline-none cursor-pointer"
                title={`${item.day}: ${item.reduction} pollution avoided`}
              >
                <span className="text-[10px] font-semibold text-[#64748b]">{item.day}</span>
                <div
                  className={`w-7 rounded-t-md transition-all ${
                    isWeekend
                      ? 'bg-[#006b5f]'
                      : idx === 2
                        ? 'bg-[#006591]'
                        : 'bg-[#006591]/60'
                  } ${isSelected ? 'ring-2 ring-[#006591] scale-105' : 'group-hover:opacity-90'}`}
                  style={{ height: `${item.barHeight}px` }}
                />
                <span className="text-[10px] font-bold tabular-nums text-[#0f172a]">
                  {item.reduction}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDayIndex !== null && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#e0f2fe]/40 border border-[#bae6fd] text-xs text-[#004c6e] flex items-center justify-between">
            <span>
              <strong>{WEEKLY_CHART_DATA[selectedDayIndex].day}:</strong> Avoided{' '}
              {WEEKLY_CHART_DATA[selectedDayIndex].uncoachedMins} minutes of high PM2.5 exposure.
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayIndex(null)}
              className="text-[#64748b] hover:text-[#0f172a] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* 6. Professional Medical Advisory Footer */}
      <footer className="text-center py-2 px-4">
        <p className="text-[11px] text-[#94a3b8] leading-relaxed max-w-2xl mx-auto">
          {isEn
            ? "General environmental guidance only; not medical advice. Consult your physician or pediatrician for personalized asthma or respiratory treatment plans."
            : 'ही केवळ सर्वसाधारण माहिती आहे, वैद्यकीय सल्ला नाही. दम्याच्या उपचारासाठी डॉक्टरांचा सल्ला घ्या.'}
        </p>
      </footer>
    </div>
  );
};
