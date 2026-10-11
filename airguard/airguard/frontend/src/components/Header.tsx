import React, { useEffect, useState } from 'react';
import { ASSETS } from '../data';
import { FamilyProfile, LanguageType, ScreenType } from '../types';
import { formatAppDateTime } from '../utils/dateTime';

interface HeaderProps {
  currentScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
  language: LanguageType;
  onLanguageToggle: () => void;
  onOpenWizard: () => void;
  activeProfile: FamilyProfile;
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onScreenChange,
  language,
  onLanguageToggle,
  onOpenWizard,
  activeProfile,
  onOpenMobileSidebar,
}) => {
  const isEn = language === 'en';
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setClock(new Date());
    updateClock();
    const intervalId = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const getScreenDetails = () => {
    switch (currentScreen) {
      case 'today':
        return {
          title: isEn ? 'Today Dashboard' : 'आजचे डॅशबोर्ड',
          subtitle: isEn ? 'Live air quality and daily commute recommendations' : 'थेट हवेची गुणवत्ता आणि दैनंदिन शिफारसी',
        };
      case 'routes':
        return {
          title: isEn ? 'Clean Air Routes' : 'स्वच्छ हवा मार्ग',
          subtitle: isEn ? 'Interactive navigation with live exposure index' : 'प्रदूषण संपर्कासह परस्परसंवादी नकाशे',
        };
      case 'alerts':
        return {
          title: isEn ? 'Air Quality Alerts' : 'हवा गुणवत्ता इशारे',
          subtitle: isEn ? 'Threshold notifications and localized warnings' : 'धोका इशारे आणि स्थानिक सूचना',
        };
      case 'impact':
        return {
          title: isEn ? 'Health Impact Tracker' : 'आरोग्य प्रभाव मागोवा',
          subtitle: isEn ? 'Weekly exposure avoided and lung health milestones' : 'टाळलेला प्रदूषण संपर्क आणि साप्ताहिक अहवाल',
        };
      case 'profile':
        return {
          title: isEn ? 'Profile & Family Settings' : 'माहिती व कुटुंब सेटिंग्ज',
          subtitle: isEn ? 'Manage members, health profiles and saved places' : 'कुटुंब सदस्य आणि जतन केलेली ठिकाणे',
        };
      default:
        return {
          title: 'AirGuard',
          subtitle: 'Environmental Intelligence',
        };
    }
  };

  const { title, subtitle } = getScreenDetails();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] transition-all">
      <div className="w-full h-16 px-4 md:px-8 flex items-center justify-between">
        {/* Left Section: Mobile Menu Button + Screen Title */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-xl text-[#334155] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          {/* Mobile brand mini logo */}
          <div className="md:hidden flex items-center gap-2">
            <img
              src={ASSETS.logo}
              alt="AirGuard"
              className="h-7 w-7 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Desktop Title & Subtitle */}
          <div>
            <h1 className="text-base md:text-lg font-bold text-[#0f172a] tracking-tight leading-tight">
              {title}
            </h1>
            <p className="hidden sm:block text-[11px] text-[#64748b] leading-tight">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Section: Time, Plan Wizard, Language Switcher, Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock / Location Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-xs font-medium text-[#475569]">
            <span className="material-symbols-outlined text-[15px] text-[#006591]">schedule</span>
            <span className="tabular-nums" aria-live="polite">
              {clock ? formatAppDateTime(clock, language) : '—'}
            </span>
          </div>

          {/* Plan / Wizard Button */}
          <button
            type="button"
            onClick={onOpenWizard}
            title={isEn ? 'Customize AQI Plan' : 'AQI योजना बदला'}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#e0f2fe] text-[#006591] hover:bg-[#bae6fd] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>{isEn ? 'Plan' : 'योजना'}</span>
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onLanguageToggle}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
            title="Switch Language / भाषा बदला"
          >
            <span className="material-symbols-outlined text-[16px] text-[#006591]">language</span>
            <span>{language === 'en' ? 'EN' : 'मराठी'}</span>
          </button>

          {/* Profile Avatar Button */}
          <button
            type="button"
            onClick={() => onScreenChange('profile')}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white transition-transform hover:scale-105 cursor-pointer shadow-xs ${activeProfile.avatarBg}`}
            title={`View profile for ${activeProfile.name}`}
          >
            {activeProfile.avatarText}
          </button>
        </div>
      </div>
    </header>
  );
};
