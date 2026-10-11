export type ScreenType = 'today' | 'routes' | 'alerts' | 'impact' | 'profile';

export type LanguageType = 'en' | 'mr';

export type HealthProfile = 'general' | 'asthma_sensitive' | 'outdoor_worker' | 'pollution_sensitive';

export interface FamilyProfile {
  id: string;
  name: string;
  relation: string;
  badge: string;
  badgeType: 'error' | 'secondary' | 'tertiary' | 'neutral';
  description: string;
  avatarText: string;
  avatarBg: string;
  isAsthma?: boolean;
  healthProfile?: HealthProfile;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  aqi: number;
  status: 'Good' | 'Mod' | 'Poor';
  icon: string;
}

export interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  completed: boolean;
}

export interface AlertCardItem {
  id: string;
  category: 'today' | 'past';
  severity: string;
  aqi: number;
  timeLabel: string;
  title: string;
  description: string;
  actionTitle: string;
  actionText: string;
  actionIcon: string;
  location: string;
  mapImage?: string;
  mapAlt?: string;
}

export interface RouteOption {
  id: string;
  name: string;
  via: string;
  duration: string;
  aqi: number;
  aqiStatus: 'Good' | 'Moderate' | 'Unhealthy';
  badge?: string;
  highlight?: boolean;
  ecoBenefit: string;
  icon: string;
}

export interface EmergencyContact {
  name: string;
  role: string;
  facility: string;
  phone: string;
}

export interface AirQuality {
  us_aqi: number;
  pm2_5: number;
  pm10: number;
  carbon_monoxide: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  ozone: number;
  time: string;
}
