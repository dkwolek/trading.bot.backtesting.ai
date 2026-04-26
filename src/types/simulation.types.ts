export interface AutoGridSimulationGrid {
  stepPrices: number[];
  amountPerLevel: number;
}

// Default sweep across order-of-magnitude steps. The simulator caps
// fills at the period's price range so even tiny steps stay tractable.
export const AUTO_GRID_SIMULATION_DEFAULTS: AutoGridSimulationGrid = {
  stepPrices: [5, 10, 25, 50, 100, 200, 500],
  amountPerLevel: 50,
};
