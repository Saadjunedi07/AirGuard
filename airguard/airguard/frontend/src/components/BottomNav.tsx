import React from 'react';
import { ScreenType, LanguageType } from '../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
  language: LanguageType;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onScreenChange,
  language,
}) => {
  const isEn = language === 'en';
  const navItems: { id: ScreenType; icon: string; labelEn: string; labelMr: string }[] = [
    { id: 'today', icon: 'dashboard', labelEn: 'Today', labelMr: 'आज' },
    { id: 'routes', icon: 'alt_route', labelEn: 'Routes', labelMr: 'मार्ग' },
    { id: 'alerts', icon: 'notifications_active', labelEn: 'Alerts', labelMr: 'इशारे' },
    { id: 'impact', icon: 'insights', labelEn: 'Impact', labelMr: 'प्रभाव' },
    { id: 'profile', icon: 'manage_accounts', labelEn: 'Profile', labelMr: 'माहिती' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-lg border-t border-[#e2e8f0] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onScreenChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#006591] font-bold'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-7 rounded-lg transition-colors ${
                  isActive ? 'bg-[#e0f2fe]' : ''
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-[10px] leading-none">
                {isEn ? item.labelEn : item.labelMr}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
