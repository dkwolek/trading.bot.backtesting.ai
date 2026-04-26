// Per-step result for the Auto Grid sweep. We carry the raw
// numbers from simulateAutoGrid rather than the framework's
// BacktestMetrics because the metrics panel re-derives totalReturn
// against the user's initialAmount, while what matters here is the
// post-fee profit each step config produced.
export interface AutoGridSimulationResult {
  stepPrice: number;
  amountPerLevel: number;
  cycles: number;
  totalProfit: number;
  maxCapitalDeployed: number;
  openPositionsAtEnd: number;
  openPositionsCost: number;
  unrealizedPnl: number;
  netPnl: number;
}
