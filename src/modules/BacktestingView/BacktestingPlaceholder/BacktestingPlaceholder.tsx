import { useTradingContext } from '../../../context/TradingContext';
import ChartPlaceholder from '../../Chart/ChartPlaceholder/ChartPlaceholder';
import SimulationResults from '../../SimulationResults/SimulationResults';
import StrategyChart from '../../StrategyChart/StrategyChart';
import MetricsPanel from '../../MetricsPanel/MetricsPanel';
import TradesTable from '../../TradesTable/TradesTable';

export default function BacktestingPlaceholder() {
  const { simulationResults, isSimulating, simulationProgress } = useTradingContext();

  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-auto">
        <ChartPlaceholder />
        <MetricsPanel />
        <StrategyChart />
        <SimulationResults
          results={simulationResults}
          isSimulating={isSimulating}
          progress={simulationProgress}
        />
      </div>
      <TradesTable />
    </div>
  );
}
