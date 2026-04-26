import { CandlestickData, LineData, UTCTimestamp } from 'lightweight-charts';
import { Candle } from '../../types/global.types';

// UTCTimestamp is a branded number type from lightweight-charts.
// Conversion from plain number is isolated here to keep `as` out of business logic.
export function toUTCTimestamp(time: number): UTCTimestamp {
  return time as UTCTimestamp;
}

export function toLineData(candle: Candle): LineData<UTCTimestamp> {
  return {
    time: toUTCTimestamp(candle.time),
    value: candle.close,
  };
}

export function toCandlestickData(candle: Candle): CandlestickData<UTCTimestamp> {
  return {
    time: toUTCTimestamp(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  }
  return volume.toFixed(2);
}
