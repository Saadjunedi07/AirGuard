import React, { useState } from 'react';
import { ASSETS, INITIAL_PROFILES } from '../../data';
import { FamilyProfile, LanguageType } from '../../types';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageType;
  onLanguageChange: (lang: LanguageType) => void;
  activeProfile: FamilyProfile;
  onSelectProfile: (profile: FamilyProfile) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  activeProfile,
  onSelectProfile,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;
  const [selectedTarget, setSelectedTarget] = useState<string>(activeProfile.id || 'aarav');
  const [homeLocation, setHomeLocation] = useState<string>('Koregaon Park, Pune');
  const [workLocation, setWorkLocation] = useState<string>('Magarpatta City, Hadapsar');
  const [departureTime, setDepartureTime] = useState<string>('08:30');
  const [alertTime, setAlertTime] = useState<string>('07:00');
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  const isEn = language === 'en';

  const stepTitles = [
    isEn ? 'Profile Setup' : 'प्रोफाईल निवड',
    isEn ? 'Location & Zones' : 'ठिकाण व क्षेत्र',
    isEn ? 'Schedule & Alerts' : 'वेळ व सूचना',
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setIsFinishing(true);
      setTimeout(() => {
        const matchingProfile = INITIAL_PROFILES.find((p) => p.id === selectedTarget);
        if (matchingProfile) {
          onSelectProfile(matchingProfile);
        }
        setIsFinishing(false);
        onClose();
        onShowToast(
          isEn
            ? `Air safety plan customized for ${matchingProfile?.name || 'you'}`
            : 'तुमची हवा सुरक्षा योजना तयार झाली!',
          'verified'
        );
      }, 700);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#f7f9fb] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#e0e3e5] my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header & Progress Bar */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-[#006591] uppercase tracking-wider block">
                {isEn ? 'Welcome to BreatheWise' : 'ब्रीदवाईज मध्ये आपले स्वागत आहे'}
              </span>
              <h2 className="text-lg font-bold text-[#191c1e] mt-0.5">
                {isEn ? "Let's personalize your air safety" : 'तुमची हवा सुरक्षा सानुकूल करा'}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-[#c9e6ff]/50 flex items-center justify-center text-[#006591]">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  eco
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#eceef0] flex items-center justify-center text-[#6e7881] hover:text-[#191c1e] cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center text-xs text-[#3e4850] font-medium">
              <span>
                {isEn ? `Step ${step} of ${totalSteps}` : `टप्पा ${step} पैकी ${totalSteps}`}
              </span>
              <span>{stepTitles[step - 1]}</span>
            </div>
            <div className="w-full h-2 bg-[#e0e3e5] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#006591] transition-all duration-300 rounded-full"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP 1: Who is this plan for? */}
        {step === 1 && (
          <div className="flex flex-col gap-3 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-[#191c1e] mb-0.5">
                {isEn ? 'Who is this plan for?' : 'ही योजना कोणासाठी आहे?'}
              </h3>
              <p className="text-xs text-[#3e4850]">
                {isEn
                  ? "We'll customize Pune AQI thresholds based on sensitive health needs."
                  : 'आम्ही आरोग्याच्या गरजेनुसार पुण्याच्या हवेची मानके ठरवू.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Aarav */}
              <label
                onClick={() => setSelectedTarget('aarav')}
                className={`relative flex items-center p-3 rounded-2xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-all cursor-pointer shadow-2xs border ${
                  selectedTarget === 'aarav'
                    ? 'border-[#006591] bg-[#c9e6ff]/20'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-[#cce5ff] flex items-center justify-center text-[#001d31] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">child_care</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#191c1e]">Aarav (Child)</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[10px] font-bold">
                        Asthma Alert
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3e4850] truncate">
                      Extra sensitive to PM2.5 spikes near traffic
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTarget === 'aarav'
                        ? 'border-[#006591] bg-[#006591] text-white'
                        : 'border-[#bec8d2]'
                    }`}
                  >
                    {selectedTarget === 'aarav' && (
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    )}
                  </div>
                </div>
              </label>

              {/* Option 2: Myself */}
              <label
                onClick={() => setSelectedTarget('myself')}
                className={`relative flex items-center p-3 rounded-2xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-all cursor-pointer shadow-2xs border ${
                  selectedTarget === 'myself'
                    ? 'border-[#006591] bg-[#c9e6ff]/20'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-[#c9e6ff] flex items-center justify-center text-[#001e2f] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#191c1e]">Myself</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#6df5e1]/40 text-[#006f64] text-[10px] font-bold">
                        Daily Commuter
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3e4850] truncate">
                      Active cyclist & outdoor fitness enthusiast
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTarget === 'myself'
                        ? 'border-[#006591] bg-[#006591] text-white'
                        : 'border-[#bec8d2]'
                    }`}
                  >
                    {selectedTarget === 'myself' && (
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    )}
                  </div>
                </div>
              </label>

              {/* Option 3: Elderly Parent */}
              <label
                onClick={() => setSelectedTarget('parent')}
                className={`relative flex items-center p-3 rounded-2xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-all cursor-pointer shadow-2xs border ${
                  selectedTarget === 'parent'
                    ? 'border-[#006591] bg-[#c9e6ff]/20'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-[#71f8e4]/30 flex items-center justify-center text-[#00201c] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">elderly</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#191c1e]">Elderly Parent</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#cce5ff] text-[#001d31] text-[10px] font-bold">
                        Cardiac Care
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3e4850] truncate">
                      Morning walks near heavy arterial roads
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTarget === 'parent'
                        ? 'border-[#006591] bg-[#006591] text-white'
                        : 'border-[#bec8d2]'
                    }`}
                  >
                    {selectedTarget === 'parent' && (
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    )}
                  </div>
                </div>
              </label>

              {/* Option 4: General Household */}
              <label
                onClick={() => setSelectedTarget('household')}
                className={`relative flex items-center p-3 rounded-2xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-all cursor-pointer shadow-2xs border ${
                  selectedTarget === 'household'
                    ? 'border-[#006591] bg-[#c9e6ff]/20'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-[#e0e3e5] flex items-center justify-center text-[#3e4850] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">home</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#191c1e]">General Household</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#eceef0] text-[#3e4850] text-[10px] font-bold">
                        Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3e4850] truncate">
                      Family-wide exposure tracking
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTarget === 'household'
                        ? 'border-[#006591] bg-[#006591] text-white'
                        : 'border-[#bec8d2]'
                    }`}
                  >
                    {selectedTarget === 'household' && (
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Locations & Simulated Pune Map Preview */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-[#191c1e] mb-0.5">Key Locations</h3>
              <p className="text-xs text-[#3e4850]">
                Set your daily routine hubs in Pune for air quality routing.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#191c1e]">Home Location</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 material-symbols-outlined text-[#6e7881] text-[18px]">
                    home
                  </span>
                  <input
                    type="text"
                    value={homeLocation}
                    onChange={(e) => setHomeLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#f2f4f6] text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006591] border border-transparent focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#191c1e]">
                  School / Work Location
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 material-symbols-outlined text-[#6e7881] text-[18px]">
                    work
                  </span>
                  <input
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#f2f4f6] text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006591] border border-transparent focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Pune Exposure Zone Preview */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#191c1e]">Pune Exposure Zone Preview</span>
                <span className="text-[11px] font-semibold text-[#006591] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">radar</span>
                  Live AQI overlay
                </span>
              </div>

              <div
                className="w-full h-44 rounded-2xl overflow-hidden relative shadow-md bg-cover bg-center flex flex-col justify-end p-2 border border-[#bec8d2]/40"
                style={{ backgroundImage: `url('${ASSETS.zonePreviewMap}')` }}
              >
                <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl flex items-center justify-around text-[11px] font-medium text-[#191c1e] shadow-xs border border-white/60">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#006b5f]" />
                    <span>Clean Zone</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                    <span>Heavy Traffic / AQI &gt; 200</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Routine & Preferences */}
        {step === 3 && (
          <div className="flex flex-col gap-3.5 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-[#191c1e] mb-0.5">Routine & Preferences</h3>
              <p className="text-xs text-[#3e4850]">
                When should BreatheWise protect your morning commute?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#191c1e]">Usual Departure</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 material-symbols-outlined text-[#6e7881] text-[16px]">
                    schedule
                  </span>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-xl bg-[#f2f4f6] text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006591] border border-transparent focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#191c1e]">Morning Alert Time</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 material-symbols-outlined text-[#6e7881] text-[16px]">
                    notifications_active
                  </span>
                  <input
                    type="time"
                    value={alertTime}
                    onChange={(e) => setAlertTime(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-xl bg-[#f2f4f6] text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006591] border border-transparent focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="flex flex-col gap-2 p-3 bg-[#f2f4f6] rounded-2xl border border-[#e0e3e5]/60">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006591] text-[18px]">
                    translate
                  </span>
                  <span className="text-xs font-bold text-[#191c1e]">Language / भाषा</span>
                </div>
                <span className="text-[11px] text-[#3e4850]">Instant Switch</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-[#006591] text-white shadow-xs'
                      : 'bg-white text-[#191c1e] border border-[#eceef0]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('mr')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    language === 'mr'
                      ? 'bg-[#006591] text-white shadow-xs'
                      : 'bg-white text-[#191c1e] border border-[#eceef0]'
                  }`}
                >
                  मराठी (Marathi)
                </button>
              </div>
            </div>

            {/* Summary Banner */}
            <div className="p-3 bg-[#c9e6ff]/30 rounded-2xl flex items-start gap-2.5 border border-[#006591]/20">
              <span className="material-symbols-outlined text-[#006591] text-[20px] mt-0.5">
                verified_user
              </span>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-[#191c1e]">Ready for clean air coaching</h4>
                <p className="text-[11px] text-[#3e4850] leading-snug mt-0.5">
                  We'll notify you if PM2.5 exceeds safe limits along your Koregaon Park route at{' '}
                  {alertTime} AM.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-2.5 mt-5 pt-2 border-t border-[#eceef0]">
          {step > 1 && (
            <button
              onClick={handlePrev}
              className="px-4 py-3 rounded-xl bg-[#eceef0] hover:bg-[#e0e3e5] text-xs font-bold text-[#191c1e] transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back</span>
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isFinishing}
            className="flex-1 py-3 px-4 rounded-xl bg-[#006591] text-white text-xs font-bold hover:bg-[#004c6e] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isFinishing ? (
              <>
                <span>Setting up your coach...</span>
                <span className="material-symbols-outlined animate-spin text-[16px]">
                  progress_activity
                </span>
              </>
            ) : step === totalSteps ? (
              <>
                <span>Get Started</span>
                <span className="material-symbols-outlined text-[16px]">check</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
