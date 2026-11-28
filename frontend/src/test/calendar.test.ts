import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-typescript';
import type { FamilyMember } from '../types';
import { upcomingBirthdays } from '../utils/calendar';

const member = (id: number, overrides: Partial<FamilyMember> = {}): FamilyMember => ({
  id,
  name: `成员${id}`,
  gender: 'male',
  birth_date: null,
  death_date: null,
  generation: 1,
  ...overrides,
} as FamilyMember);

describe('upcomingBirthdays', () => {
  it('finds solar and lunar birthdays within the next month and skips deceased members', () => {
    const today = new Date(2026, 10, 28);
    const lunarToday = Solar.fromYmd(2026, 11, 28).getLunar();
    const reminders = upcomingBirthdays([
      member(1, { birth_date: '1990-12-05', birth_calendar: 'solar' }),
      member(2, { birth_date: '1990-11-28', birth_calendar: 'solar' }),
      member(3, { birth_date: '1990-01-01', birth_calendar: 'solar' }),
      member(4, { birth_date: '1990-12-01', death_date: '2020-01-01' }),
      member(5, {
        birth_date: `${lunarToday.getYear()}-${String(Math.abs(lunarToday.getMonth())).padStart(2, '0')}-${String(lunarToday.getDay()).padStart(2, '0')}`,
        birth_calendar: 'lunar',
        birth_lunar_leap: lunarToday.getMonth() < 0 ? 1 : 0,
      }),
    ], today);

    expect(reminders.map(item => item.member.id)).toEqual([2, 5, 1]);
    expect(reminders.find(item => item.member.id === 1)?.daysUntil).toBe(7);
    expect(reminders.find(item => item.member.id === 2)?.daysUntil).toBe(0);
    expect(reminders.find(item => item.member.id === 5)?.label).toContain('农历');
  });

  it('clamps February 29 birthdays in non-leap years', () => {
    const reminders = upcomingBirthdays([
      member(1, { birth_date: '2000-02-29', birth_calendar: 'solar' }),
    ], new Date(2027, 1, 20));

    expect(reminders[0].date).toBe('2027-02-28');
    expect(reminders[0].daysUntil).toBe(8);
  });
});
