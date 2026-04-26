export enum Mode {
  Backtesting = 'backtesting',
  Trading = 'trading',
}

export enum Pair {
  ETH_USDC = 'ETH/USDC',
  BTC_USDC = 'BTC/USDC',
  SOL_USDC = 'SOL/USDC',
  XRP_USDC = 'XRP/USDC',
  SPY_USD = 'SPY/USD',
}

export enum DataSource {
  Binance = 'binance',
  Yahoo = 'yahoo',
}

export const PAIR_DATA_SOURCE: Record<Pair, DataSource> = {
  [Pair.ETH_USDC]: DataSource.Binance,
  [Pair.BTC_USDC]: DataSource.Binance,
  [Pair.SOL_USDC]: DataSource.Binance,
  [Pair.XRP_USDC]: DataSource.Binance,
  [Pair.SPY_USD]: DataSource.Yahoo,
};

export enum Period {
  ONE_DAY = '1d',
  THREE_DAYS = '3d',
  SEVEN_DAYS = '7d',
  FOURTEEN_DAYS = '14d',
  THIRTY_DAYS = '30d',
  TWO_MONTHS = '2M',
  THREE_MONTHS = '3M',
  SIX_MONTHS = '6M',
  TWELVE_MONTHS = '12M',
  TWENTY_FOUR_MONTHS = '24M',
  THIRTY_SIX_MONTHS = '36M',
  FORTY_EIGHT_MONTHS = '48M',
}

export enum Interval {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
}
