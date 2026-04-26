import { useRef, useState } from 'react';
import { AutoGridSimulationResult } from '../services/simulation';
import { Candle } from '../types/global.types';
import { AutoGridSimulationGrid } from '../types/simulation.types';

export function useSimulation() {
  const [results, setResults] = useState<AutoGridSimulationResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  function run(candles: Candle[], autoGridGrid?: AutoGridSimulationGrid) {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setIsSimulating(true);
    setProgress(0);
    setResults([]);

    const worker = new Worker(new URL('../services/simulation.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      if (event.data.type === 'progress') {
        setProgress(event.data.progress);
      } else if (event.data.type === 'done') {
        setResults(event.data.results);
        setIsSimulating(false);
        setProgress(100);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setIsSimulating(false);
      worker.terminate();
      workerRef.current = null;
    };

    workerRef.current = worker;
    worker.postMessage({ candles, autoGridGrid });
  }

  function clear() {
    setResults([]);
    setProgress(0);
  }

  return { results, isSimulating, progress, run, clear };
}
