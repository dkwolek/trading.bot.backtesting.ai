import { useTradingContext } from '../../context/TradingContext';
import { AutoGridSimulationResult } from '../../services/simulation';
import SimulationLoading from './SimulationLoading/SimulationLoading';
import SimulationPlaceholder from './SimulationPlaceholder/SimulationPlaceholder';
import AutoGridSimulationTable from './SimulationTable/AutoGridSimulationTable';

interface Props {
  results: AutoGridSimulationResult[];
  isSimulating: boolean;
  progress: number;
}

export default function SimulationResults({ results, isSimulating, progress }: Props) {
  const { setAlgoOption } = useTradingContext();

  function handleAutoGridApply(result: AutoGridSimulationResult) {
    setAlgoOption('autoGridStepPrice', result.stepPrice);
    setAlgoOption('autoGridAmountPerLevel', result.amountPerLevel);
  }

  if (isSimulating) {
    return <SimulationLoading progress={progress} />;
  }
  if (results.length === 0) {
    return <SimulationPlaceholder />;
  }
  return <AutoGridSimulationTable results={results} onApply={handleAutoGridApply} />;
}
