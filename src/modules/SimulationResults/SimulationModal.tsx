import { useEffect } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import t from '../../locales';
import SimulationResults from './SimulationResults';

interface Props {
  onClose: () => void;
}

export default function SimulationModal({ onClose }: Props) {
  const { simulationResults, isSimulating, simulationProgress } = useTradingContext();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-sidebar border border-border rounded w-[800px] max-h-[80vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted">
            {t.simulation.title}
            {!isSimulating && simulationResults.length > 0 && ` (${simulationResults.length})`}
          </span>
          <button className="text-muted hover:text-text text-[16px] leading-none" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          <SimulationResults
            results={simulationResults}
            isSimulating={isSimulating}
            progress={simulationProgress}
          />
        </div>
      </div>
    </div>
  );
}
