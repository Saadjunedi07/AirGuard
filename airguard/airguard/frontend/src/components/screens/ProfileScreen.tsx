import React, { useState } from 'react';
import { EMERGENCY_CONTACT } from '../../data';
import { FamilyProfile, LanguageType, SavedPlace } from '../../types';
import { HoloToggle } from '../HoloToggle';

interface ProfileScreenProps {
  language: LanguageType;
  onLanguageChange: (lang: LanguageType) => void;
  profiles: FamilyProfile[];
  activeProfile: FamilyProfile;
  onSelectProfile: (profile: FamilyProfile) => void;
  onAddProfile: (profile: FamilyProfile) => void;
  savedPlaces: SavedPlace[];
  onAddPlace: (place: SavedPlace) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  language,
  profiles,
  activeProfile,
  onSelectProfile,
  onAddProfile,
  savedPlaces,
  onAddPlace,
  onShowToast,
}) => {
  const isEn = language === 'en';

  const [spikeAlerts, setSpikeAlerts] = useState<boolean>(true);
  const [commuteBrief, setCommuteBrief] = useState<boolean>(true);

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState<boolean>(false);
  const [showCallModal, setShowCallModal] = useState<boolean>(false);

  // Form states
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRelation, setNewMemberRelation] = useState<string>('Daughter');
  const [newMemberCondition, setNewMemberCondition] = useState<string>('Asthma');

  const [newPlaceName, setNewPlaceName] = useState<string>('');
  const [newPlaceAddress, setNewPlaceAddress] = useState<string>('');

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newProfile: FamilyProfile = {
      id: `profile-${Date.now()}`,
      name: newMemberName.trim(),
      relation: newMemberRelation,
      badge: newMemberCondition,
      badgeType:
        newMemberCondition === 'Asthma'
          ? 'error'
          : newMemberCondition === 'Cardiac'
            ? 'tertiary'
            : 'secondary',
      description: `${newMemberRelation} with ${newMemberCondition} sensitivity in Pune`,
      avatarText: newMemberName.trim().substring(0, 2).toUpperCase(),
      avatarBg: 'bg-[#006591]',
      isAsthma: newMemberCondition.toLowerCase().includes('asthma'),
    };

    onAddProfile(newProfile);
    setShowAddMemberModal(false);
    setNewMemberName('');
    onShowToast(
      isEn
        ? `Added profile for ${newProfile.name} with custom AQI triggers`
        : `${newProfile.name} साठी नवीन प्रोफाईल जोडली`,
      'person_add'
    );
  };

  const handleCreatePlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim() || !newPlaceAddress.trim()) return;

    const simulatedAqi = Math.floor(Math.random() * 80) + 70;
    const status = simulatedAqi < 100 ? 'Good' : simulatedAqi < 150 ? 'Mod' : 'Poor';

    const newPlace: SavedPlace = {
      id: `place-${Date.now()}`,
      name: newPlaceName.trim(),
      address: newPlaceAddress.trim(),
      aqi: simulatedAqi,
      status: status,
      icon: 'place',
    };

    onAddPlace(newPlace);
    setShowAddPlaceModal(false);
    setNewPlaceName('');
    setNewPlaceAddress('');
    onShowToast(
      isEn ? `Saved "${newPlace.name}" to monitoring list` : `"${newPlace.name}" ठिकाण जतन केले`,
      'bookmark'
    );
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* 1. Header Intro */}
      <div className="pb-2 border-b border-[#e2e8f0]">
        <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">
          {isEn ? 'Family & Air Settings' : 'माहिती व कुटुंब सेटिंग्ज'}
        </h2>
        <p className="text-xs text-[#475569] mt-0.5">
          {isEn
            ? 'Manage personalized sensitivity thresholds, family accounts, and saved locations.'
            : 'वैयक्तिक संवेदनशीलता मर्यादा, कुटुंब खाती आणि जतन केलेली ठिकाणे व्यवस्थापित करा.'}
        </p>
      </div>

      {/* 2. Family Members Profile Switcher Card */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm" aria-labelledby="family-heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 id="family-heading" className="text-sm font-bold text-[#0f172a]">
              {isEn ? 'Family Profiles' : 'कुटुंब प्रोफाईल्स'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isEn ? 'Select an active member to tailor all dashboard exposure models' : 'सक्रिय सदस्य निवडा'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMemberModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#006591] bg-[#e0f2fe] hover:bg-[#bae6fd] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>{isEn ? 'Add Member' : 'सदस्य जोडा'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {profiles.map((profile) => {
            const isSelected = activeProfile.id === profile.id;

            return (
              <div
                key={profile.id}
                onClick={() => {
                  onSelectProfile(profile);
                  onShowToast(
                    isEn ? `Switched active dashboard to ${profile.name}` : `सक्रिय प्रोफाइल: ${profile.name}`,
                    'person'
                  );
                }}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#006591] bg-[#e0f2fe]/30 ring-2 ring-[#006591]/20 shadow-xs'
                    : 'border-[#e2e8f0] bg-[#f8fafc] hover:bg-white hover:border-[#cbd5e1]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-full ${profile.avatarBg} text-white font-bold text-sm flex items-center justify-center shadow-2xs`}>
                    {profile.avatarText}
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full bg-[#006591] text-white text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#0f172a]">{profile.name}</h4>
                  <span className="text-[11px] text-[#64748b] block">{profile.relation}</span>
                  <span className="mt-1.5 inline-block text-[10px] font-semibold text-[#006591] bg-white border border-[#bae6fd] px-2 py-0.5 rounded-md">
                    {profile.badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Saved Places Section */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm" aria-labelledby="places-heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 id="places-heading" className="text-sm font-bold text-[#0f172a]">
              {isEn ? 'Monitored Locations in Pune' : 'पुण्यातील जतन केलेली ठिकाणे'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isEn ? 'Frequent stops checked for localized pollution spikes' : 'नेहमीची ठिकाणे आणि थेट AQI'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPlaceModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#006591] bg-[#e0f2fe] hover:bg-[#bae6fd] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_location</span>
            <span>{isEn ? 'Add Place' : 'ठिकाण जोडा'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {savedPlaces.map((place) => (
            <div
              key={place.id}
              className="p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center text-[#006591]">
                  <span className="material-symbols-outlined text-[18px]">{place.icon}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0f172a]">{place.name}</h4>
                  <span className="text-[11px] text-[#64748b] block">{place.address}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-[#0f172a] tabular-nums block">
                  AQI {place.aqi}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    place.status === 'Good'
                      ? 'text-emerald-600'
                      : place.status === 'Mod'
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}
                >
                  {place.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Notification Preferences & Schedule */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm" aria-labelledby="prefs-heading">
        <h3 id="prefs-heading" className="text-sm font-bold text-[#0f172a] mb-1">
          {isEn ? 'Notification Dispatch Rules' : 'सूचना नियम'}
        </h3>
        <p className="text-xs text-[#64748b] mb-4">
          {isEn ? 'Control when AirGuard reaches out with proactive guidance' : 'सक्रिय सूचनांचे नियम'}
        </p>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#006591] text-[20px]">notifications_active</span>
              <div>
                <h4 className="text-xs font-bold text-[#0f172a]">
                  {isEn ? 'AQI Spike Warnings' : 'अचानक वाढणारे प्रदूषण इशारे'}
                </h4>
                <p className="text-[11px] text-[#64748b]">
                  {isEn ? 'Instant push notice when localized air quality drops sharply' : 'प्रदूषण अचानक वाढल्यावर त्वरित सूचना'}
                </p>
              </div>
            </div>
            <HoloToggle
              checked={spikeAlerts}
              label="AQI Spike Alerts"
              onChange={(checked) => {
                setSpikeAlerts(checked);
                onShowToast(
                  checked ? 'Spike notifications turned ON' : 'Spike notifications muted',
                  'notifications'
                );
              }}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#006591] text-[20px]">routine</span>
              <div>
                <h4 className="text-xs font-bold text-[#0f172a]">
                  {isEn ? 'Morning Commute Briefing' : 'सकाळचा प्रवास सल्ला'}
                </h4>
                <p className="text-[11px] text-[#64748b]">
                  {isEn ? 'Daily predictive departure briefing at 8:00 AM' : 'सकाळी ८:०० वाजता दैनंदिन प्रवास सल्ला'}
                </p>
              </div>
            </div>
            <HoloToggle
              checked={commuteBrief}
              label="Morning Commute Brief"
              onChange={(checked) => {
                setCommuteBrief(checked);
                onShowToast(
                  checked ? 'Morning brief scheduled for 8:00 AM' : 'Morning brief cancelled',
                  'schedule'
                );
              }}
            />
          </div>
        </div>
      </section>

      {/* 5. Emergency Health Contacts Card */}
      <section className="rounded-2xl border border-red-200 bg-red-50/30 p-5 shadow-xs" aria-labelledby="emergency-heading">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[20px]">emergency</span>
            <h3 id="emergency-heading" className="text-sm font-bold text-[#0f172a]">
              {isEn ? 'Emergency Health Contacts' : 'तातडीचे वैद्यकीय संपर्क'}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
            24/7 Desk
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-red-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">local_hospital</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0f172a]">{EMERGENCY_CONTACT.name}</h4>
              <p className="text-[11px] text-[#64748b]">
                {EMERGENCY_CONTACT.facility} • {EMERGENCY_CONTACT.phone}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCallModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">call</span>
            <span>{isEn ? 'Call Desk' : 'कॉल करा'}</span>
          </button>
        </div>
      </section>

      {/* Call Confirmation Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 mb-2 text-red-600">
              <span className="material-symbols-outlined text-[24px]">phone_forwarded</span>
              <h3 className="text-base font-bold text-[#0f172a]">
                {isEn ? 'Connect Emergency Call?' : 'तातडीचा कॉल जोडा?'}
              </h3>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed mb-4">
              Direct line to pediatric respiratory emergency desk at Ruby Hall Clinic, Pune ({EMERGENCY_CONTACT.phone}).
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0] cursor-pointer"
              >
                {isEn ? 'Cancel' : 'रद्द करा'}
              </button>
              <a
                href={`tel:${EMERGENCY_CONTACT.phone.replace(/[^0-9+]/g, '')}`}
                onClick={() => {
                  setShowCallModal(false);
                  onShowToast('Initiating emergency call...', 'call');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>{isEn ? 'Call Now' : 'कॉल करा'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-[#0f172a]">
                {isEn ? 'Add Family Profile' : 'नवीन कुटुंब सदस्य'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-[#64748b] hover:text-[#0f172a] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateMember} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0f172a] block mb-1">
                  {isEn ? 'Name' : 'नाव'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diya / Meera"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#006591]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0f172a] block mb-1">
                  {isEn ? 'Relation' : 'नाते'}
                </label>
                <select
                  value={newMemberRelation}
                  onChange={(e) => setNewMemberRelation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#006591] bg-white"
                >
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Elderly Parent">Elderly Parent</option>
                  <option value="Grandparent">Grandparent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0f172a] block mb-1">
                  {isEn ? 'Health Need' : 'आरोग्य गरज'}
                </label>
                <select
                  value={newMemberCondition}
                  onChange={(e) => setNewMemberCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#006591] bg-white"
                >
                  <option value="Asthma">Asthma Alert (Strict threshold)</option>
                  <option value="Cardiac">Cardiac Care (Low exertion)</option>
                  <option value="Allergy">Dust & Pollen Allergy</option>
                  <option value="Standard">General Healthy (Standard)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#f1f5f9] text-[#334155] cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'रद्द करा'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#006591] text-white hover:bg-[#004c6e] cursor-pointer"
                >
                  {isEn ? 'Save Profile' : 'जतन करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Saved Place Modal */}
      {showAddPlaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-[#0f172a]">
                {isEn ? 'Save New Location' : 'नवीन ठिकाण जोडा'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPlaceModal(false)}
                className="text-[#64748b] hover:text-[#0f172a] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePlace} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0f172a] block mb-1">
                  {isEn ? 'Place Name' : 'ठिकाणाचे नाव'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym / Tuition / Park"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#006591]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0f172a] block mb-1">
                  {isEn ? 'Area in Pune' : 'पुण्यातील परिसर'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aundh / Kalyani Nagar / Viman Nagar"
                  value={newPlaceAddress}
                  onChange={(e) => setNewPlaceAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#006591]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlaceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#f1f5f9] text-[#334155] cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'रद्द करा'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#006591] text-white hover:bg-[#004c6e] cursor-pointer"
                >
                  {isEn ? 'Save Place' : 'जतन करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
