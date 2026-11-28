import React, { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { LunarYear, Solar } from 'lunar-typescript';
import {
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
  lunarToSolar,
  normalizeCalendarDate,
  parseDateParts,
  solarToLunar,
} from '../utils/calendar';
import type { CalendarType } from '../utils/calendar';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  calendar?: CalendarType;
  onCalendarChange?: (calendar: CalendarType) => void;
  leap?: boolean;
  onLeapChange?: (leap: boolean) => void;
  disabled?: boolean;
}

const splitDate = (value: string): [string, string, string] => {
  const parts = parseDateParts(value);
  if (!parts) return ['', '', ''];
  return [String(parts.year), String(parts.month), String(parts.day)];
};

const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder,
  ariaLabel,
  calendar = 'solar',
  onCalendarChange,
  leap = false,
  onLeapChange,
  disabled = false,
}) => {
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const lunar = calendar === 'lunar';

  useEffect(() => {
    setText(value);
    setInvalid(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const openPicker = () => {
    const [initialYear, initialMonth, initialDay] = splitDate(value);
    setYear(initialYear);
    setMonth(initialMonth);
    setDay(initialDay);
    setOpen(true);
  };

  const commitText = () => {
    const raw = text.trim();
    if (!raw) {
      onChange('');
      setInvalid(false);
      return;
    }
    let targetCalendar = calendar;
    let cleaned = raw;
    if (/^(农历|阴历)/.test(raw)) {
      targetCalendar = 'lunar';
      cleaned = raw.replace(/^(农历|阴历)/, '');
    } else if (/^(阳历|公历)/.test(raw)) {
      targetCalendar = 'solar';
      cleaned = raw.replace(/^(阳历|公历)/, '');
    }
    const normalized = normalizeCalendarDate(cleaned, targetCalendar);
    if (normalized) {
      if (targetCalendar !== calendar) onCalendarChange?.(targetCalendar);
      onChange(normalized);
      setInvalid(false);
    } else {
      setText(value);
      setInvalid(true);
    }
  };

  const switchCalendar = (next: CalendarType) => {
    if (next === calendar) return;
    const parts = parseDateParts(value);
    if (parts) {
      if (next === 'lunar') {
        const converted = solarToLunar(value);
        if (converted) {
          onChange(converted.date);
          onLeapChange?.(converted.leap);
        }
      } else {
        const converted = lunarToSolar(value, leap);
        if (converted) onChange(converted);
        onLeapChange?.(false);
      }
    }
    onCalendarChange?.(next);
  };

  const leapMonth = year ? LunarYear.fromYear(Number(year)).getLeapMonth() : 0;
  const daysInMonth = lunar ? 30 : year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const canConfirm = Boolean(normalizeCalendarDate(`${year}-${month}-${day}`, calendar));
  const confirm = () => {
    const normalized = normalizeCalendarDate(`${year}-${month}-${day}`, calendar);
    if (!normalized) return;
    onChange(normalized);
    setOpen(false);
  };
  const today = () => {
    const now = new Date();
    if (lunar) {
      const current = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate()).getLunar();
      setYear(String(current.getYear()));
      setMonth(String(Math.abs(current.getMonth())));
      setDay(String(current.getDay()));
      onLeapChange?.(current.getMonth() < 0);
    } else {
      setYear(String(now.getFullYear()));
      setMonth(String(now.getMonth() + 1));
      setDay(String(now.getDate()));
    }
  };
  const selectMonth = (raw: string) => {
    if (raw.startsWith('leap-')) {
      setMonth(raw.slice(5));
      onLeapChange?.(true);
    } else {
      setMonth(raw);
      onLeapChange?.(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        placeholder={placeholder || (lunar ? '农历 YYYY-MM-DD' : 'YYYY-MM-DD')}
        className={`${className} pr-9`}
        disabled={disabled}
        onChange={event => { setText(event.target.value); setInvalid(false); }}
        onBlur={commitText}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commitText(); } }}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cinnabar-600"
        aria-label={`选择${ariaLabel || '日期'}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <Calendar className="h-4 w-4" />
      </button>
      {invalid && <p className="mt-1 text-xs text-red-600">{lunar ? '农历日期应为 YYYY-MM-DD，月 1-12、日 1-30' : '日期格式应为 YYYY-MM-DD'}</p>}
      {open && (
        <div role="dialog" aria-label={`${ariaLabel || '日期'}选择`} className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          {onCalendarChange && (
            <div className="mb-2 flex gap-1" role="group" aria-label="历法">
              {(['solar', 'lunar'] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  className={`flex-1 rounded px-2 py-1 text-xs ${calendar === item ? 'bg-cinnabar-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  onClick={() => switchCalendar(item)}
                >
                  {item === 'solar' ? '阳历' : '阴历'}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[1fr_84px_84px] gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">年</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={year}
                aria-label="年"
                placeholder="1900"
                className="ui-input w-full text-sm"
                onChange={event => setYear(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">月</span>
              <select
                value={lunar && leap ? `leap-${month}` : month}
                aria-label="月"
                className="ui-input w-full text-sm"
                onChange={event => selectMonth(event.target.value)}
              >
                <option value="">—</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(item => (
                  <option key={item} value={item}>{lunar ? LUNAR_MONTH_NAMES[item - 1] : item}</option>
                ))}
                {lunar && leapMonth > 0 && <option value={`leap-${leapMonth}`}>闰{LUNAR_MONTH_NAMES[leapMonth - 1]}</option>}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">日</span>
              <select value={day} aria-label="日" className="ui-input w-full text-sm" onChange={event => setDay(event.target.value)}>
                <option value="">—</option>
                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(item => (
                  <option key={item} value={item}>{lunar ? LUNAR_DAY_NAMES[item - 1] : item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600" onClick={() => { onChange(''); setOpen(false); }}>
              <X className="h-3.5 w-3.5" />清除
            </button>
            <div className="flex gap-2">
              <button type="button" className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={today}>今天</button>
              <button type="button" disabled={!canConfirm} className="rounded bg-cinnabar-600 px-3 py-1 text-xs text-white hover:bg-cinnabar-700 disabled:opacity-40" onClick={confirm}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateInput;
