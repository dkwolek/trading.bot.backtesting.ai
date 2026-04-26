// Tuple representing a single kline entry from the Binance REST API.
// Index reference: [openTime, open, high, low, close, volume, closeTime, ...]
export type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];
