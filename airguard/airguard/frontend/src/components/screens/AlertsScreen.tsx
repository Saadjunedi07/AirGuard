import React, { useEffect, useMemo, useState } from 'react';
import { AlertCardItem, FamilyProfile, LanguageType } from '../../types';
import { INITIAL_ALERTS } from '../../data';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

interface AlertsScreenProps {
  language: LanguageType;
  activeProfile: FamilyProfile;
  onShowToast: (msg: string, icon?: string) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  language,
  onShowToast,
}) => {
  const isEn = language === 'en';

  const [filter, setFilter] = useState<'all' | 'today' | 'past'>('all');
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(true);
  const [alertThreshold, setAlertThreshold] = useState<number>(100);
  const [currentAqi, setCurrentAqi] = useState<number | null>(null);
  const [sourceTime, setSourceTime] = useState<string | null>(null);
  const [forecastAqis, setForecastAqis] = useState<number[]>([]);
  const [aqiError, setAqiError] = useState<string | null>(null);
  const [aqiLoading, setAqiLoading] = useState(true);
  const [alertRefreshKey, setAlertRefreshKey] = useState(0);
  const [expandedImpactIds, setExpandedImpactIds] = useState<Record<string, boolean>>({
    'alert-1': false,
    'alert-2': false,
  });

  const toggleExpand = (id: string) => {
    setExpandedImpactIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadAlerts = async () => {
      setAqiLoading(true);
      setAqiError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/air-quality?latitude=18.5204&longitude=73.8567&include_forecast=true`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`AQI request failed: ${response.status}`);
        const data = await response.json();
        const aqi = data?.current?.us_aqi;
        if (typeof aqi !== 'number' || !Number.isFinite(aqi)) throw new Error('Live AQI is unavailable.');
        if (controller.signal.aborted) return;
        setCurrentAqi(aqi);
        setSourceTime(typeof data?.current?.time === 'string' ? data.current.time : null);
        setForecastAqis(
          Array.isArray(data?.hourly?.us_aqi)
            ? data.hourly.us_aqi.filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value))
            : []
        );
      } catch (error) {
        if (!controller.signal.aborted) setAqiError(error instanceof Error ? error.message : 'Live AQI is unavailable.');
      } finally {
        if (!controller.signal.aborted) setAqiLoading(false);
      }
    };
    void loadAlerts();
    return () => controller.abort();
  }, [alertRefreshKey]);

  const liveAlerts = useMemo<AlertCardItem[]>(() => {
    if (currentAqi === null || currentAqi < alertThreshold) return [];
    const laterAqi = forecastAqis.length ? Math.min(...forecastAqis) : null;
    return [
      {
        id: 'live-aqi-threshold',
        category: 'today',
        severity: 'Severe',
        aqi: Math.round(currentAqi),
        timeLabel: sourceTime ? `Open-Meteo: ${sourceTime}` : 'Open-Meteo live observation',
        title: `City AQI exceeds your threshold (${alertThreshold})`,
        description: `Current Pune city-level AQI is ${Math.round(currentAqi)}. Consider indoor alternatives or switching commute routes.`,
        actionTitle: 'Recommended step',
        actionText:
          laterAqi !== null && laterAqi < currentAqi
            ? `Delay departure: Available hourly forecast predicts AQI drops to ${Math.round(laterAqi)} later.`
            : 'Check Clean Routes screen for lower-exposure travel alternatives.',
        actionIcon: 'schedule',
        location: 'Pune Municipal Area',
      },
    ];
  }, [alertThreshold, currentAqi, forecastAqis, sourceTime]);

  const allAlerts = useMemo(() => {
    return [...liveAlerts, ...INITIAL_ALERTS];
  }, [liveAlerts]);

  const filteredAlerts = allAlerts.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const handlePushToggle = () => {
    const newState = !pushEnabled;
    setPushEnabled(newState);
    onShowToast(
      newState
        ? isEn
          ? 'Push notifications enabled for Pune zones'
          : 'पुणे विभागांसाठी नोटिफिकेशन्स सुरू केली'
        : isEn
          ? 'Push notifications paused'
          : 'नोटिफिकेशन्स बंद केली',
      'notifications'
    );
  };

  const handleTelegramToggle = () => {
    const newState = !telegramEnabled;
    setTelegramEnabled(newState);
    onShowToast(
      newState
        ? isEn
          ? 'Telegram alerts connected (@BreatheWisePuneBot)'
          : 'टेलिग्राम बॉट जोडला (@BreatheWisePuneBot)'
        : isEn
          ? 'Telegram alerts paused'
          : 'टेलिग्राम इशारे थांबवले',
      'send'
    );
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* 1. Network Status Hero Card */}
      <section
        className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
        aria-labelledby="alerts-status-heading"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#e0f2fe] flex items-center justify-center text-[#006591] shadow-2xs">
              <span className="material-symbols-outlined text-[24px]">notifications_active</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="alerts-status-heading" className="text-base font-bold text-[#0f172a]">
                  {isEn ? 'Atmospheric Surveillance Network' : 'हवामान व प्रदूषण पाळत नेटवर्क'}
                </h2>
                <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                {isEn ? 'Continuous sensor monitoring across Pune corridors' : 'पुण्यातील हवेच्या गुणवत्तेवर निरंतर लक्ष'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-[#334155]">
              {aqiLoading
                ? 'Connecting...'
                : currentAqi !== null
                  ? `Pune AQI: ${Math.round(currentAqi)}`
                  : 'AQI Unavailable'}
            </span>

            <button
              type="button"
              onClick={() => setAlertRefreshKey((k) => k + 1)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#006591] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              <span>{isEn ? 'Refresh' : 'रिफ्रेश'}</span>
            </button>
          </div>
        </div>

        {aqiError && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
            {aqiError}
          </div>
        )}
      </section>

      {/* 2. Notification Preferences & Threshold Slider */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm" aria-labelledby="notification-settings-heading">
        <h3 id="notification-settings-heading" className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">
          {isEn ? 'Notification Dispatch Channels & Triggers' : 'सूचना माध्यम व मर्यादा'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Push Notifications Toggle */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#006591] text-[20px]">phone_android</span>
              <div>
                <span className="text-xs font-semibold text-[#0f172a] block">
                  {isEn ? 'Push Alerts' : 'पुश इशारे'}
                </span>
                <span className="text-[11px] text-[#64748b]">
                  {isEn ? 'Instant device notifications' : 'मोबाईल सूचना'}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={handlePushToggle}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#006591]"></div>
            </label>
          </div>

          {/* Telegram Alerts Toggle */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#0ea5e9] text-[20px]">send</span>
              <div>
                <span className="text-xs font-semibold text-[#0f172a] block">Telegram Bot</span>
                <span className="text-[11px] text-[#64748b]">@BreatheWisePuneBot</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={handleTelegramToggle}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#006591]"></div>
            </label>
          </div>

          {/* Threshold Input */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#0f172a] block">
                {isEn ? 'Alert Trigger Level' : 'इशारा पातळी'}
              </span>
              <span className="text-[11px] text-[#64748b]">
                {isEn ? 'Trigger when AQI ≥ ' : 'AQI ≥ '}
                <strong>{alertThreshold}</strong>
              </span>
            </div>

            <input
              type="number"
              min="30"
              max="400"
              step="10"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Math.max(10, Math.min(500, Number(e.target.value) || 100)))}
              className="w-16 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-center text-xs font-bold text-[#0f172a] focus:border-[#006591] focus:outline-none"
              aria-label="AQI alert threshold"
            />
          </div>
        </div>
      </section>

      {/* 3. Filterable Alert Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">
              {isEn ? 'Regional Advisory Timeline' : 'प्रादेशिक सूचना घटनाक्रम'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isEn ? 'Current advisories and historical air events' : 'सध्याचे आणि मागील प्रदूषण इशारे'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-xl border border-[#e2e8f0]">
            {(['all', 'today', 'past'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize ${
                  filter === tab
                    ? 'bg-white text-[#006591] shadow-2xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {tab === 'all' ? (isEn ? 'All' : 'सर्व') : tab === 'today' ? (isEn ? 'Today' : 'आज') : (isEn ? 'Past' : 'मागील')}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Cards List */}
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isSevere = alert.severity === 'Severe';
            const isExpanded = !!expandedImpactIds[alert.id];

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isSevere
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {alert.severity} · AQI {alert.aqi}
                    </span>
                    <span className="text-xs font-semibold text-[#0f172a]">{alert.location}</span>
                  </div>
                  <span className="text-[11px] text-[#64748b]">{alert.timeLabel}</span>
                </div>

                <h4 className="text-sm font-bold text-[#0f172a] mb-1">
                  {alert.title}
                </h4>
                <p className="text-xs text-[#475569] leading-relaxed mb-3">
                  {alert.description}
                </p>

                {/* Recommended Action Card */}
                <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#006591] mt-0.5">
                    {alert.actionIcon}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-[#0f172a] block">
                      {alert.actionTitle}
                    </span>
                    <p className="text-xs text-[#475569] mt-0.5 leading-snug">
                      {alert.actionText}
                    </p>
                  </div>
                </div>

                {/* Expandable GIS Satellite View */}
                {alert.mapImage && (
                  <div className="mt-3 pt-2 border-t border-[#f1f5f9] flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(alert.id)}
                      className="self-end text-xs font-semibold text-[#006591] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? (isEn ? 'Hide satellite view' : 'नकाशा लपवा') : (isEn ? 'View sensor zone map' : 'प्रभावित क्षेत्र नकाशा')}</span>
                      <span className={`material-symbols-outlined text-[16px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="rounded-xl overflow-hidden border border-[#e2e8f0] relative h-40">
                        <img
                          src={alert.mapImage}
                          alt={alert.mapAlt ?? 'Satellite atmospheric zone map'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                          <span>Atmospheric Dispersion Overlay</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center">
              <span className="material-symbols-outlined text-[32px] text-[#94a3b8] mb-1">
                verified
              </span>
              <p className="text-sm font-bold text-[#0f172a]">
                {isEn ? 'No active alerts in this category' : 'या श्रेणीत सध्या कोणतेही इशारे नाहीत'}
              </p>
              <p className="text-xs text-[#64748b] mt-1">
                {isEn ? 'Air quality remains within monitored thresholds.' : 'हवेची गुणवत्ता सुरक्षित मर्यादेत आहे.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
