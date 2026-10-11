import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { TodayScreen } from './components/screens/TodayScreen';
import { RoutesScreen } from './components/screens/RoutesScreen';
import { AlertsScreen } from './components/screens/AlertsScreen';
import { ImpactScreen } from './components/screens/ImpactScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { WizardModal } from './components/screens/WizardModal';

import {
  INITIAL_ACTION_PLAN,
  INITIAL_PROFILES,
  INITIAL_SAVED_PLACES,
} from './data';

import {
  ActionItem,
  AirQuality,
  FamilyProfile,
  HealthProfile,
  LanguageType,
  SavedPlace,
  ScreenType,
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export default function App() {
  const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('today');
  const [language, setLanguage] = useState<LanguageType>('en');
  const [profiles, setProfiles] = useState<FamilyProfile[]>(INITIAL_PROFILES);
  const [activeProfile, setActiveProfile] = useState<FamilyProfile>(INITIAL_PROFILES[0]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(INITIAL_SAVED_PLACES);
  const [actionItems, setActionItems] = useState<ActionItem[]>(INITIAL_ACTION_PLAN);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState<string>('info');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Fetch live air-quality data for Pune default
  useEffect(() => {
    const fetchAirQuality = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/air-quality?latitude=18.5204&longitude=73.8567`);
        if (!response.ok) {
          throw new Error('Failed to fetch air quality');
        }
        const data = await response.json();
        setAirQuality(data.current ?? null);
      } catch (error) {
        console.error('Air quality fetch error:', error);
      }
    };
    void fetchAirQuality();
  }, []);

  const showToast = (msg: string, icon: string = 'info') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleToggleActionItem = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleAddProfile = (newProfile: FamilyProfile) => {
    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfile(newProfile);
  };

  const handleAddPlace = (newPlace: SavedPlace) => {
    setSavedPlaces((prev) => [...prev, newPlace]);
  };

  const handleHealthProfileChange = (healthProfile: HealthProfile) => {
    const updatedProfile = {
      ...activeProfile,
      healthProfile,
      isAsthma: healthProfile === 'asthma_sensitive',
    };
    setActiveProfile(updatedProfile);
    setProfiles((previous) =>
      previous.map((profile) =>
        profile.id === updatedProfile.id ? updatedProfile : profile
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex antialiased selection:bg-[#c9e6ff]">
      {/* 1. Fixed Viewport Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onScreenChange={setCurrentScreen}
        language={language}
        onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
        onOpenWizard={() => setIsWizardOpen(true)}
        activeProfile={activeProfile}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* 2. Independently Scrollable Main Content Area */}
      <div className="flex-1 md:ml-64 lg:ml-[280px] w-full md:w-[calc(100%-16rem)] lg:w-[calc(100%-280px)] min-w-0 min-h-screen flex flex-col overflow-x-hidden">
        {/* Top Header / App Bar */}
        <Header
          currentScreen={currentScreen}
          onScreenChange={setCurrentScreen}
          language={language}
          onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          onOpenWizard={() => setIsWizardOpen(true)}
          activeProfile={activeProfile}
          onOpenMobileSidebar={() => setIsMobileNavOpen(true)}
        />

        {/* Screen Content Container */}
        <main className="flex-1 w-full pb-20 md:pb-10">
          {currentScreen === 'today' && (
            <TodayScreen
              language={language}
              airQuality={airQuality}
              activeProfile={activeProfile}
              actionItems={actionItems}
              onToggleActionItem={handleToggleActionItem}
              onNavigateToRoutes={() => setCurrentScreen('routes')}
              onOpenWizard={() => setIsWizardOpen(true)}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'routes' && (
            <RoutesScreen
              language={language}
              activeProfile={activeProfile}
              onHealthProfileChange={handleHealthProfileChange}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'alerts' && (
            <AlertsScreen
              language={language}
              activeProfile={activeProfile}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'impact' && (
            <ImpactScreen
              language={language}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              language={language}
              onLanguageChange={setLanguage}
              profiles={profiles}
              activeProfile={activeProfile}
              onSelectProfile={setActiveProfile}
              onAddProfile={handleAddProfile}
              savedPlaces={savedPlaces}
              onAddPlace={handleAddPlace}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar */}
      <BottomNav
        currentScreen={currentScreen}
        onScreenChange={setCurrentScreen}
        language={language}
      />

      {/* 4. Overlays & Modals */}
      <WizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        language={language}
        onLanguageChange={setLanguage}
        activeProfile={activeProfile}
        onSelectProfile={setActiveProfile}
        onShowToast={showToast}
      />

      <Toast
        message={toastMessage}
        icon={toastIcon}
      />
    </div>
  );
}
