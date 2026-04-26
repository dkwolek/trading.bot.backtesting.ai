import { Interval, Pair, Period } from '../constants/global.constants';
import { Candle } from '../types/global.types';
import { BinanceKline } from './binance.types';

const BASE_URL = 'https://api.binance.com/api/v3';
const PAGE_LIMIT = 1000;

const PERIOD_TO_MS: Record<Period, number> = {
  [Period.ONE_DAY]: 1 * 86_400_000,
  [Period.THREE_DAYS]: 3 * 86_400_000,
  [Period.SEVEN_DAYS]: 7 * 86_400_000,
  [Period.FOURTEEN_DAYS]: 14 * 86_400_000,
  [Period.THIRTY_DAYS]: 30 * 86_400_000,
  [Period.TWO_MONTHS]: 60 * 86_400_000,
  [Period.THREE_MONTHS]: 90 * 86_400_000,
  [Period.SIX_MONTHS]: 180 * 86_400_000,
  [Period.TWELVE_MONTHS]: 365 * 86_400_000,
  [Period.TWENTY_FOUR_MONTHS]: 730 * 86_400_000,
  [Period.THIRTY_SIX_MONTHS]: 1095 * 86_400_000,
  [Period.FORTY_EIGHT_MONTHS]: 1461 * 86_400_000,
};

function pairToSymbol(pair: Pair): string {
  return pair.replace('/', '');
}

async function fetchPage(
  symbol: string,
  interval: Interval,
  startTime: number,
  endTime: number
): Promise<BinanceKline[]> {
  const url = `${BASE_URL}/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${PAGE_LIMIT}`;
  const response = await fetch(url);

  if (!response.ok) {
    let parsedError: { msg?: string } = {};
    try {
      parsedError = await response.json();
    } catch {
      // response body could not be parsed — ignore
    }
    throw new Error(parsedError.msg ?? `Binance error ${response.status}`);
  }

  return response.json();
}

function parseCandles(klines: BinanceKline[]): Candle[] {
  return klines.map((kline) => ({
    time: Math.floor(kline[0] / 1000),
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
  }));
}

export async function fetchKlines(
  pair: Pair,
  period: Period,
  interval: Interval,
  onProgress?: (percent: number) => void,
  endDate?: Date | null
): Promise<Candle[]> {
  const symbol = pairToSymbol(pair);
  const endTime = endDate ? endDate.getTime() : Date.now();
  const startTime = endTime - PERIOD_TO_MS[period];
  const totalMs = endTime - startTime;

  const allCandles: Candle[] = [];
  let pageStart = startTime;

  while (pageStart < endTime) {
    const elapsed = pageStart - startTime;
    onProgress?.(Math.min(Math.round((elapsed / totalMs) * 99), 99));

    const klines = await fetchPage(symbol, interval, pageStart, endTime);

    if (klines.length === 0) {
      break;
    }

    allCandles.push(...parseCandles(klines));

    if (klines.length < PAGE_LIMIT) {
      break;
    }

    // Next page starts after the last candle's close time
    pageStart = klines[klines.length - 1][6] + 1;
  }

  return allCandles;
}
