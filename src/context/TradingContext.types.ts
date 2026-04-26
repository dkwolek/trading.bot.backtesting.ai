import { Interval, Mode, Pair, Period } from '../constants/global.constants';
import { Algorithm, AlgoOptions, AlgoOptionValue, BacktestResult } from '../types/algo.types';
import { Candle } from '../types/global.types';
import { AutoGridSimulationResult } from '../services/simulation';
import { AutoGridSimulationGrid } from '../types/simulation.types';

export interface TradingContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  selectedPair: Pair;
  setSelectedPair: (pair: Pair) => void;
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  selectedInterval: Interval;
  setSelectedInterval: (interval: Interval) => void;
  selectedAlgo: Algorithm;
  setSelectedAlgo: (algo: Algorithm) => void;
  candles: Candle[];
  isLoading: boolean;
  progress: number;
  error: string | null;
  loadData: () => void;
  backtestResult: BacktestResult | null;
  runBacktest: () => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
  initialAmount: number;
  setInitialAmount: (amount: number) => void;
  algoOptions: AlgoOptions;
  setAlgoOption: (key: string, value: AlgoOptionValue) => void;
  simulationResults: AutoGridSimulationResult[];
  isSimulating: boolean;
  simulationProgress: number;
  runSimulation: (autoGridGrid?: AutoGridSimulationGrid) => void;
}
