import React from 'react';
import { ASSETS } from '../data';
import { FamilyProfile, LanguageType, ScreenType } from '../types';

interface SidebarProps {
  currentScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
  language: LanguageType;
  onLanguageToggle: () => void;
  onOpenWizard: () => void;
  activeProfile: FamilyProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onScreenChange,
  language,
  onLanguageToggle,
  onOpenWizard,
  activeProfile,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isEn = language === 'en';

  const navItems: {
    id: ScreenType;
    icon: string;
    labelEn: string;
    labelMr: string;
    badge?: string;
  }[] = [
    { id: 'today', icon: 'dashboard', labelEn: 'Today Dashboard', labelMr: 'आजचे डॅशबोर्ड' },
    { id: 'routes', icon: 'alt_route', labelEn: 'Clean Routes', labelMr: 'स्वच्छ मार्ग' },
    { id: 'alerts', icon: 'notifications_active', labelEn: 'Air Alerts', labelMr: 'धोका इशारे', badge: 'Live' },
    { id: 'impact', icon: 'insights', labelEn: 'Health Impact', labelMr: 'आरोग्य प्रभाव' },
    { id: 'profile', icon: 'manage_accounts', labelEn: 'Family & Profile', labelMr: 'माहिती व कुटुंब' },
  ];

  const handleNavClick = (id: ScreenType) => {
    onScreenChange(id);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-white text-[#191c1e] select-none">
      {/* 1. Brand Header */}
      <div className="p-5 border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavClick('today')}
            className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#006591] to-[#0ea5e9] p-0.5 flex items-center justify-center shadow-xs">
              <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden">
                <img
                  src={ASSETS.logo}
                  alt="AirGuard Logo"
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 object-contain group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = `
                        <span class="material-symbols-outlined text-[#006591] text-[22px]">air</span>
                      `;
                    }
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-[#0f172a] tracking-tight group-hover:text-[#006591] transition-colors">
                  AirGuard
                </span>
                <span className="text-[10px] font-bold text-[#006591] bg-[#e0f2fe] px-1.5 py-0.2 rounded-md">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] font-medium leading-none mt-0.5">
                {isEn ? 'Environmental Intelligence' : 'पर्यावरण बुद्धिमत्ता'}
              </p>
            </div>
          </button>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] cursor-pointer"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Live system monitoring status indicator */}
        <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
            </span>
            <span className="text-[#334155] font-semibold">
              {isEn ? 'Open-Meteo AQI' : 'थेट AQI'}
            </span>
          </div>
          <span className="text-[10px] text-[#64748b] font-medium">Pune Live</span>
        </div>
      </div>

      {/* 2. Active Profile Quick Card */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => handleNavClick('profile')}
          className="w-full text-left p-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] transition-colors group cursor-pointer"
          title="Active profile"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${activeProfile.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
              {activeProfile.avatarText}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0f172a] truncate group-hover:text-[#006591] transition-colors">
                  {activeProfile.name}
                </span>
                <span className="material-symbols-outlined text-[14px] text-[#94a3b8] group-hover:translate-x-0.5 transition-transform">
                  chevron_right
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#006591] bg-[#e0f2fe] px-1.5 py-0.2 rounded-sm inline-block mt-0.5">
                {activeProfile.badge}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 3. Main Navigation Items */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#94a3b8] uppercase">
          {isEn ? 'Navigation' : 'नेव्हिगेशन'}
        </div>

        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#006591] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{isEn ? item.labelEn : item.labelMr}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#e0f2fe] text-[#006591]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Personalize Action button */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenWizard();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#004c6e] bg-[#c9e6ff]/35 hover:bg-[#c9e6ff]/60 border border-[#c9e6ff] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-[#006591]">tune</span>
            <span className="truncate">{isEn ? 'Customize AQI Plan' : 'AQI योजना बदला'}</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Footer Section */}
      <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc]/80 flex flex-col gap-2.5">
        {/* Language Switcher Button */}
        <button
          type="button"
          onClick={onLanguageToggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] hover:bg-[#f1f5f9] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[17px] text-[#006591]">language</span>
            <span>{isEn ? 'Language' : 'भाषा'}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#e2e8f0] text-[#0f172a]">
            {isEn ? 'English' : 'मराठी'}
          </span>
        </button>

        {/* Status info */}
        <div className="flex items-center justify-between text-[10px] text-[#94a3b8] px-1">
          <span>AirGuard v2.4</span>
          <span>Google Routes API</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 w-64 lg:w-[280px] h-screen h-[100dvh] border-r border-[#e2e8f0] z-40 shadow-xs"
        aria-label="Sidebar navigation"
      >
        {content}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 w-[280px] h-full z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation drawer"
      >
        {content}
      </div>
    </>
  );
};
