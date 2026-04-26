import { TickMarkType, Time } from 'lightweight-charts';

const TIMEZONE = 'Europe/Warsaw';

const TIME_FMT = new Intl.DateTimeFormat('pl-PL', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DATETIME_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DAY_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: 'short',
});

const YEAR_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  year: 'numeric',
});

function toDate(time: Time): Date {
  const seconds = typeof time === 'number' ? time : 0;
  return new Date(seconds * 1000);
}

export function formatCetTime(time: Time): string {
  return DATETIME_FMT.format(toDate(time));
}

export function formatCetTickMark(time: Time, tickMarkType: TickMarkType): string {
  const date = toDate(time);
  switch (tickMarkType) {
    case TickMarkType.Year:
      return YEAR_FMT.format(date);
    case TickMarkType.Month:
    case TickMarkType.DayOfMonth:
      return DAY_FMT.format(date);
    default:
      return TIME_FMT.format(date);
  }
}
