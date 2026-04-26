// Kraken spot trading fees. Default tier (under $10k 30-day volume):
//   Maker: 0.25 %
//   Taker: 0.40 %
// Mid/high-tier accounts pay much less (down to 0 % maker at $10M+).
// Grid bots place post-only limit orders so both the entry and the TP
// fill as makers — round trip is ~0.32 % at the lowest tier with
// reduced fees, or 0.50 % at the default tier.
export const KRAKEN_MAKER_FEE = 0.0025;
export const KRAKEN_TAKER_FEE = 0.004;

// Per-fill fee used everywhere in the simulator and backtest framework.
// Stays as maker since the bot only places resting limits.
export const TRADE_FEE = KRAKEN_MAKER_FEE;
