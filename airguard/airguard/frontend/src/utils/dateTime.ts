import { LanguageType } from '../types';

export const AIRGUARD_TIME_ZONE = 'Asia/Kolkata';

const localeForLanguage = (language: LanguageType) => language === 'mr' ? 'mr-IN' : 'en-IN';

/** Formats the app clock independently from provider-supplied data timestamps. */
export const formatAppDateTime = (
  date: Date,
  language: LanguageType,
  timeZone: string = AIRGUARD_TIME_ZONE,
) => {
  const locale = localeForLanguage(language);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);

  return `${dateLabel} · ${timeLabel}`;
};

/** Use this only for source data that includes an ISO timestamp and timezone. */
export const formatSourceTimestamp = (
  timestamp: string,
  language: LanguageType,
  timeZone: string = AIRGUARD_TIME_ZONE,
) => formatAppDateTime(new Date(timestamp), language, timeZone);
