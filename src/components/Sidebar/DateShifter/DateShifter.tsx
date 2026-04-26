import { useState } from 'react';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toEndOfDay(dateString: string): Date {
  return new Date(`${dateString}T23:59:59`);
}

function todayDateValue(): string {
  return toDateValue(new Date());
}

export default function DateShifter() {
  const { endDate, setEndDate } = useTradingContext();
  const [dateValue, setDateValue] = useState('');

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setDateValue(value);
    if (value === '') {
      setEndDate(null);
    } else {
      setEndDate(toEndOfDay(value));
    }
  }

  function handleReset() {
    setEndDate(null);
  }

  const isNow = endDate === null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {t.dateShifter.label}
      </span>
      <div className="flex gap-1">
        <input
          type="date"
          value={dateValue}
          max={todayDateValue()}
          onChange={handleChange}
          className={`flex-1 min-w-0 px-2 py-1.5 bg-bg border rounded-sm font-mono text-[11px] text-text outline-none transition-colors [color-scheme:dark] ${!isNow ? 'border-accent' : 'border-border focus:border-accent'}`}
        />
        <button
          onClick={handleReset}
          className={`px-2 py-1.5 border rounded-sm font-mono text-[11px] transition-colors shrink-0 ${isNow ? 'bg-accent border-accent text-white' : 'bg-bg border-border text-muted hover:text-text hover:border-accent'}`}
        >
          {t.dateShifter.now}
        </button>
      </div>
    </div>
  );
}
