import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { useChartData } from '../hooks/useChartData';
import { useSimulation } from '../hooks/useSimulation';
import { useTradingSettings } from '../hooks/useTradingSettings';
import { usePersistedState } from '../hooks/usePersistedState';
import { runBacktest as runBacktestService } from '../services/backtesting';
import { BacktestResult } from '../types/algo.types';
import { TradingContextValue } from './TradingContext.types';
import {
  TradingSignalConfig,
  TRADING_SIGNAL_DEFAULTS,
} from '../components/Sidebar/TradingControls/TradingControls';

const SIGNAL_CONFIG_KEY = 'trading-bot-ai:signalConfig';

function isTradingSignalConfig(value: unknown): value is TradingSignalConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dropPct' in value &&
    'dropWindow' in value &&
    'higherLow' in value &&
    'trendDir' in value
  );
}

const TradingContext = createContext<TradingContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function TradingProvider({ children }: Props) {
  const settings = useTradingSettings();
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const simulation = useSimulation();
  const [signalConfig, setSignalConfig] = usePersistedState<TradingSignalConfig>(
    SIGNAL_CONFIG_KEY,
    TRADING_SIGNAL_DEFAULTS,
    isTradingSignalConfig
  );

  const {
    candles,
    isLoading,
    progress,
    error,
    loadData: fetchData,
  } = useChartData(
    settings.mode,
    settings.selectedPair,
    settings.selectedPeriod,
    settings.selectedInterval,
    settings.endDate
  );

  function loadData() {
    setBacktestResult(null);
    simulation.clear();
    fetchData();
  }

  // Auto-load when data settings change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    loadData();
  }, [settings.selectedPair, settings.selectedPeriod, settings.selectedInterval, settings.endDate]);

  function runBacktest() {
    const result = runBacktestService(
      candles,
      settings.selectedAlgo,
      settings.initialAmount,
      settings.algoOptions
    );
    setBacktestResult(result);
  }

  function runSimulation(
    autoGridGrid?: import('../types/simulation.types').AutoGridSimulationGrid
  ) {
    simulation.run(candles, autoGridGrid);
  }

  return (
    <TradingContext.Provider
      value={{
        ...settings,
        candles,
        isLoading,
        progress,
        error,
        loadData,
        backtestResult,
        runBacktest,
        simulationResults: simulation.results,
        isSimulating: simulation.isSimulating,
        signalConfig,
        setSignalConfig,
        simulationProgress: simulation.progress,
        runSimulation,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTradingContext(): TradingContextValue {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingContext must be used within TradingProvider');
  }
  return context;
}
