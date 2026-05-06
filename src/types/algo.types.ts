import { AlgoId, SignalType } from '../constants/algo.constants';
import { Candle } from './global.types';
import { ControlDef, AlgoOptions } from './algo.controls.types';

export type {
  AlgoOptionValue,
  AlgoOptions,
  AlgoParamType,
  AlgoParamOption,
  ControlDef,
  DcaLevel,
} from './algo.controls.types';

export type SignalLabel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'TP' | 'SL' | 'MH' | 'OPEN';

export interface Signal {
  time: number;
  type: SignalType;
  price: number;
  label?: SignalLabel;
  magnitude?: number; // entry move magnitude as fraction (e.g. 0.015 = 1.5%)
  // For pair-style markers (TP exits), the buy level the cycle was opened
  // at — used so the chart can label `TP2300` even though the sell price
  // is `2300 + step`.
  referencePrice?: number;
  // Quote currency spent on the buy (incl. maker fee). Auto-grid in
  // monthly mode uses a per-cycle amountPerLevel that drifts as the
  // grid rebuilds, so the trade's true cost can't be re-derived from
  // initialAmount alone. Other algos can leave this undefined.
  cost?: number;
}

export interface LevelFill {
  label: string;
  price: number;
  time: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  exitLabel: string;
  pnl: number;
  pnlPercent: number;
  quantity: number;
  levels: LevelFill[];
  // Total quote spent across this trade's entries — propagated from
  // the algorithm's Buy signals when available. Drives the per-trade
  // "investment" column in the trades table.
  cost?: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  avgTradeReturn: number;
  maxDrawdown: number;
  exitCounts: Record<string, number>;
}

export interface BacktestResult {
  signals: Signal[];
  trades: Trade[];
  metrics: BacktestMetrics;
}

export interface Algorithm {
  id: AlgoId;
  name: string;
  controls?: ControlDef[];
  run: (candles: Candle[], options: AlgoOptions) => Signal[];
}
