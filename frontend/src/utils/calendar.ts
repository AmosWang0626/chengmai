import { Lunar, LunarYear, Solar } from 'lunar-typescript';
import type { FamilyMember } from '../types';

export type CalendarType = 'solar' | 'lunar';

export const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
export const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

export const parseDateParts = (value: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

export const normalizeCalendarDate = (value: string, calendar: CalendarType): string | null => {
  const parts = parseDateParts(value.replace(/[./年月]/g, '-').replace(/日/g, ''));
  if (!parts) return null;
  const { year, month, day } = parts;
  if (year < 1 || year > 9999) return null;
  if (calendar === 'lunar') {
    if (month < 1 || month > 12 || day < 1 || day > 30) return null;
  } else {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  }
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
};

export const solarToLunar = (value: string): { date: string; leap: boolean } | null => {
  const parts = parseDateParts(value);
  if (!parts) return null;
  try {
    const lunar = Solar.fromYmd(parts.year, parts.month, parts.day).getLunar();
    return {
      date: `${pad(lunar.getYear(), 4)}-${pad(Math.abs(lunar.getMonth()))}-${pad(lunar.getDay())}`,
      leap: lunar.getMonth() < 0,
    };
  } catch {
    return null;
  }
};

export const lunarToSolar = (value: string, leap: boolean): string | null => {
  const parts = parseDateParts(value);
  if (!parts || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 30) return null;
  try {
    const solar = Lunar.fromYmd(parts.year, leap ? -parts.month : parts.month, parts.day).getSolar();
    return `${pad(solar.getYear(), 4)}-${pad(solar.getMonth())}-${pad(solar.getDay())}`;
  } catch {
    return null;
  }
};

export const birthTimestamp = (member: Pick<FamilyMember, 'birth_date' | 'birth_calendar' | 'birth_lunar_leap'>): number | null => {
  if (!member.birth_date) return null;
  const solar = member.birth_calendar === 'lunar'
    ? lunarToSolar(member.birth_date, Boolean(member.birth_lunar_leap))
    : normalizeCalendarDate(member.birth_date, 'solar');
  const parts = solar ? parseDateParts(solar) : null;
  return parts ? Date.UTC(parts.year, parts.month - 1, parts.day) : null;
};

export const formatBirthDate = (member: Pick<FamilyMember, 'birth_date' | 'birth_calendar' | 'birth_lunar_leap'>): string => {
  if (!member.birth_date) return '';
  if (member.birth_calendar !== 'lunar') return member.birth_date;
  const parts = parseDateParts(member.birth_date);
  if (!parts) return member.birth_date;
  const month = `${member.birth_lunar_leap ? '闰' : ''}${LUNAR_MONTH_NAMES[parts.month - 1] || parts.month}`;
  const day = LUNAR_DAY_NAMES[parts.day - 1] || parts.day;
  return `农历${parts.year}年${month}${day}`;
};

export interface BirthdayReminder {
  member: FamilyMember;
  date: string;
  daysUntil: number;
  label: string;
  turningAge: number | null;
}

const DAY_MS = 86_400_000;
const utcTs = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day);
const solarDaysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const isoFromTs = (ts: number) => {
  const date = new Date(ts);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const upcomingBirthdays = (members: FamilyMember[], today = new Date(), windowDays = 30): BirthdayReminder[] => {
  const todayTs = utcTs(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const endTs = todayTs + windowDays * DAY_MS;
  const currentLunarYear = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate()).getLunar().getYear();
  const reminders: BirthdayReminder[] = [];

  for (const member of members) {
    if (!member.birth_date || member.death_date) continue;
    const birth = parseDateParts(member.birth_date);
    if (!birth) continue;
    const lunar = member.birth_calendar === 'lunar';
    const leap = lunar && Boolean(member.birth_lunar_leap);
    let next: { ts: number; year: number; label: string } | null = null;

    if (lunar) {
      const maxYear = currentLunarYear + (leap ? 100 : 1);
      for (let year = currentLunarYear; year <= maxYear; year++) {
        if (leap && LunarYear.fromYear(year).getLeapMonth() !== birth.month) continue;
        try {
          const solar = Lunar.fromYmd(year, leap ? -birth.month : birth.month, birth.day).getSolar();
          const ts = utcTs(solar.getYear(), solar.getMonth(), solar.getDay());
          if (ts >= todayTs) {
            const monthName = `${leap ? '闰' : ''}${LUNAR_MONTH_NAMES[birth.month - 1] || birth.month}`;
            next = { ts, year, label: `农历${monthName}${LUNAR_DAY_NAMES[birth.day - 1] || birth.day}` };
            break;
          }
        } catch {
          continue;
        }
      }
    } else {
      let year = today.getFullYear();
      let day = Math.min(birth.day, solarDaysInMonth(year, birth.month));
      let ts = utcTs(year, birth.month, day);
      if (ts < todayTs) {
        year += 1;
        day = Math.min(birth.day, solarDaysInMonth(year, birth.month));
        ts = utcTs(year, birth.month, day);
      }
      next = { ts, year, label: `${birth.month}月${day}日` };
    }

    if (next && next.ts <= endTs) {
      reminders.push({
        member,
        date: isoFromTs(next.ts),
        daysUntil: Math.round((next.ts - todayTs) / DAY_MS),
        label: next.label,
        turningAge: next.year - birth.year,
      });
    }
  }

  return reminders.sort((a, b) => a.daysUntil - b.daysUntil || a.member.name.localeCompare(b.member.name, 'zh'));
};
