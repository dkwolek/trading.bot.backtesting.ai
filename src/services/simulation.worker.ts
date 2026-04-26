import { Candle } from '../types/global.types';
import { AUTO_GRID_SIMULATION_DEFAULTS, AutoGridSimulationGrid } from '../types/simulation.types';
import { simulateAutoGrid } from '../algos/auto-grid.algo';
import { AutoGridSimulationResult } from './simulation';

function runAutoGridSweep(
  candles: Candle[],
  grid: AutoGridSimulationGrid
): AutoGridSimulationResult[] {
  const results: AutoGridSimulationResult[] = [];
  let completed = 0;

  for (const stepPrice of grid.stepPrices) {
    const sim = simulateAutoGrid(candles, {
      stepPrice,
      amountPerLevel: grid.amountPerLevel,
    });
    results.push({
      stepPrice,
      amountPerLevel: grid.amountPerLevel,
      cycles: sim.completedCycles,
      totalProfit: sim.totalProfit,
      maxCapitalDeployed: sim.maxCapitalDeployed,
      openPositionsAtEnd: sim.openPositionsAtEnd,
      openPositionsCost: sim.openPositionsCost,
      unrealizedPnl: sim.unrealizedPnl,
      netPnl: sim.netPnl,
    });
    completed++;
    self.postMessage({ type: 'progress', progress: completed });
  }

  return results;
}

self.onmessage = (
  event: MessageEvent<{
    candles: Candle[];
    autoGridGrid?: AutoGridSimulationGrid;
  }>
) => {
  const { candles, autoGridGrid } = event.data;

  if (candles.length === 0) {
    self.postMessage({ type: 'done', results: [] });
    return;
  }

  const results = runAutoGridSweep(candles, autoGridGrid ?? AUTO_GRID_SIMULATION_DEFAULTS);
  results.sort((a, b) => b.netPnl - a.netPnl);
  self.postMessage({ type: 'done', results });
};
