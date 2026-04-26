import { Candle } from '../types/global.types';

const DB_NAME = 'trading-bot-candles';
const DB_VERSION = 1;
const STORE_NAME = 'candles';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function buildKey(pair: string, interval: string): string {
  return `${pair}|${interval}`;
}

export async function getCachedCandles(pair: string, interval: string): Promise<Candle[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(buildKey(pair, interval));
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedCandles(
  pair: string,
  interval: string,
  candles: Candle[]
): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const sorted = [...candles].sort((candleA, candleB) => candleA.time - candleB.time);
    store.put(sorted, buildKey(pair, interval));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function mergeCandles(
  pair: string,
  interval: string,
  newCandles: Candle[]
): Promise<Candle[]> {
  const existing = await getCachedCandles(pair, interval);
  const timeMap = new Map<number, Candle>();

  for (const candle of existing) {
    timeMap.set(candle.time, candle);
  }
  for (const candle of newCandles) {
    timeMap.set(candle.time, candle);
  }

  const merged = Array.from(timeMap.values()).sort(
    (candleA, candleB) => candleA.time - candleB.time
  );
  await setCachedCandles(pair, interval, merged);
  return merged;
}

export interface MissingRange {
  fetchStart: number;
  fetchEnd: number;
}

/**
 * Returns ranges that need to be fetched. Empty array = fully cached.
 */
export function findMissingRanges(
  cached: Candle[],
  startTime: number,
  endTime: number
): MissingRange[] {
  if (cached.length === 0) {
    return [{ fetchStart: startTime, fetchEnd: endTime }];
  }

  const cachedStart = cached[0].time * 1000;
  const cachedEnd = cached[cached.length - 1].time * 1000;
  const gaps: MissingRange[] = [];

  // Need earlier data
  if (startTime < cachedStart) {
    gaps.push({ fetchStart: startTime, fetchEnd: cachedStart - 1 });
  }

  // Need later data
  if (endTime > cachedEnd) {
    gaps.push({ fetchStart: cachedEnd + 1, fetchEnd: endTime });
  }

  return gaps;
}

export function sliceCandles(candles: Candle[], startTime: number, endTime: number): Candle[] {
  const startSeconds = Math.floor(startTime / 1000);
  const endSeconds = Math.floor(endTime / 1000);
  return candles.filter((candle) => candle.time >= startSeconds && candle.time <= endSeconds);
}

export async function clearCache(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
