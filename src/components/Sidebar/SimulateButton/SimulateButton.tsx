import { useState } from 'react';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';
import SimulationModal from '../../../modules/SimulationResults/SimulationModal';
import { AUTO_GRID_SIMULATION_DEFAULTS } from '../../../types/simulation.types';
import { resolveAmountPerLevel } from '../../../algos/auto-grid.algo';

export default function SimulateButton() {
  const { candles, isSimulating, runSimulation, algoOptions } = useTradingContext();
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const disabled = candles.length === 0 || isSimulating;

  function handleClick() {
    runSimulation({
      stepPrices: AUTO_GRID_SIMULATION_DEFAULTS.stepPrices,
      amountPerLevel: resolveAmountPerLevel(algoOptions),
    });
    setResultsModalOpen(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className="w-full py-2 text-[11px] font-semibold tracking-widest uppercase border border-border bg-surface text-muted hover:text-text hover:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSimulating ? t.simulation.running : t.actions.simulate}
      </button>
      {resultsModalOpen && <SimulationModal onClose={() => setResultsModalOpen(false)} />}
    </>
  );
}
