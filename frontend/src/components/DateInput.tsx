import React, { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const normalizeDate = (input: string): string | null => {
  const parts = input.trim().replace(/[./年月]/g, '-').replace(/日/g, '').split('-');
  if (parts.length !== 3 || parts.some(part => !/^\d+$/.test(part))) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
};

const splitDate = (value: string): [string, string, string] => {
  const normalized = normalizeDate(value);
  if (!normalized) return ['', '', ''];
  const [year, month, day] = normalized.split('-');
  return [String(Number(year)), String(Number(month)), String(Number(day))];
};

const DateInput: React.FC<DateInputProps> = ({ value, onChange, className = '', placeholder = 'YYYY-MM-DD', ariaLabel }) => {
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

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
    if (!text.trim()) {
      onChange('');
      setInvalid(false);
      return;
    }
    const normalized = normalizeDate(text);
    if (normalized) {
      onChange(normalized);
      setInvalid(false);
    } else {
      setText(value);
      setInvalid(true);
    }
  };

  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const canConfirm = Boolean(normalizeDate(`${year}-${month}-${day}`));
  const confirm = () => {
    const normalized = normalizeDate(`${year}-${month}-${day}`);
    if (!normalized) return;
    onChange(normalized);
    setOpen(false);
  };
  const today = () => {
    const now = new Date();
    setYear(String(now.getFullYear()));
    setMonth(String(now.getMonth() + 1));
    setDay(String(now.getDate()));
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        className={`${className} pr-9`}
        onChange={event => { setText(event.target.value); setInvalid(false); }}
        onBlur={commitText}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commitText(); } }}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cinnabar-600"
        aria-label={`选择${ariaLabel || '日期'}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <Calendar className="h-4 w-4" />
      </button>
      {invalid && <p className="mt-1 text-xs text-red-600">日期格式应为 YYYY-MM-DD</p>}
      {open && (
        <div role="dialog" aria-label={`${ariaLabel || '日期'}选择`} className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="grid grid-cols-[1fr_72px_72px] gap-2">
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
              <select value={month} aria-label="月" className="ui-input w-full text-sm" onChange={event => setMonth(event.target.value)}>
                <option value="">—</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">日</span>
              <select value={day} aria-label="日" className="ui-input w-full text-sm" onChange={event => setDay(event.target.value)}>
                <option value="">—</option>
                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(item => <option key={item} value={item}>{item}</option>)}
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
