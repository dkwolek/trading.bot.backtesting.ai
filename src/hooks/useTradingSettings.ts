import { useEffect, useRef, useState } from 'react';
import { Interval, Mode, Pair, Period } from '../constants/global.constants';
import { ALGORITHMS } from '../algos/algos';
import { Algorithm, AlgoOptions, AlgoOptionValue } from '../types/algo.types';
import { usePersistedState } from './usePersistedState';

const STORAGE_PREFIX = 'trading-bot-ai';
const K_MODE = `${STORAGE_PREFIX}:mode`;
const K_PAIR = `${STORAGE_PREFIX}:pair`;
const K_PERIOD = `${STORAGE_PREFIX}:period`;
const K_INTERVAL = `${STORAGE_PREFIX}:interval`;
const K_ALGO = `${STORAGE_PREFIX}:algo`;
const K_INITIAL_AMOUNT = `${STORAGE_PREFIX}:initialAmount`;
const algoOptionsKey = (algoId: string) => `${STORAGE_PREFIX}:algoOptions:${algoId}`;

function isOneOf<T>(values: readonly T[]): (value: unknown) => value is T {
  return (value): value is T => values.includes(value as T);
}

function defaultAlgoOptions(algo: Algorithm): AlgoOptions {
  return Object.fromEntries(
    algo.controls?.map((control) => [control.key, control.defaultValue]) ?? []
  );
}

function loadAlgoOptions(algo: Algorithm): AlgoOptions {
  try {
    const raw = localStorage.getItem(algoOptionsKey(algo.id));
    if (!raw) {
      return defaultAlgoOptions(algo);
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return defaultAlgoOptions(algo);
    }
    // Merge with defaults so newly-added controls have their default value
    return { ...defaultAlgoOptions(algo), ...(parsed as AlgoOptions) };
  } catch {
    return defaultAlgoOptions(algo);
  }
}

function loadSelectedAlgo(): Algorithm {
  try {
    const raw = localStorage.getItem(K_ALGO);
    if (raw) {
      const match = ALGORITHMS.find((algo) => algo.id === raw);
      if (match) {
        return match;
      }
    }
  } catch {
    // fall through
  }
  return ALGORITHMS[0];
}

export function useTradingSettings() {
  const [mode, setMode] = usePersistedState<Mode>(
    K_MODE,
    Mode.Backtesting,
    isOneOf([Mode.Backtesting, Mode.Trading])
  );
  const [selectedPair, setSelectedPair] = usePersistedState<Pair>(
    K_PAIR,
    Pair.ETH_USDC,
    isOneOf(Object.values(Pair))
  );
  const [selectedPeriod, setSelectedPeriod] = usePersistedState<Period>(
    K_PERIOD,
    Period.SEVEN_DAYS,
    isOneOf(Object.values(Period))
  );
  const [selectedInterval, setSelectedInterval] = usePersistedState<Interval>(
    K_INTERVAL,
    Interval.ONE_MINUTE,
    isOneOf(Object.values(Interval))
  );
  const [initialAmount, setInitialAmount] = usePersistedState<number>(
    K_INITIAL_AMOUNT,
    10_000,
    (value): value is number => typeof value === 'number' && value > 0
  );

  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm>(loadSelectedAlgo);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [algoOptions, setAlgoOptions] = useState<AlgoOptions>(() => loadAlgoOptions(selectedAlgo));

  // Persist selected algo id
  useEffect(() => {
    localStorage.setItem(K_ALGO, selectedAlgo.id);
  }, [selectedAlgo]);

  // Persist algoOptions under the current algo's namespace
  const firstOptionsRender = useRef(true);
  useEffect(() => {
    if (firstOptionsRender.current) {
      firstOptionsRender.current = false;
      return;
    }
    try {
      localStorage.setItem(algoOptionsKey(selectedAlgo.id), JSON.stringify(algoOptions));
    } catch {
      // ignore write errors
    }
  }, [selectedAlgo.id, algoOptions]);

  function handleSetSelectedAlgo(algo: Algorithm) {
    setSelectedAlgo(algo);
    // Load that algo's own stored options (or its defaults)
    setAlgoOptions(loadAlgoOptions(algo));
  }

  function setAlgoOption(key: string, value: AlgoOptionValue) {
    setAlgoOptions((prev) => ({ ...prev, [key]: value }));
  }

  return {
    mode,
    setMode,
    selectedPair,
    setSelectedPair,
    selectedPeriod,
    setSelectedPeriod,
    selectedInterval,
    setSelectedInterval,
    selectedAlgo,
    setSelectedAlgo: handleSetSelectedAlgo,
    initialAmount,
    setInitialAmount,
    endDate,
    setEndDate,
    algoOptions,
    setAlgoOption,
  };
}
