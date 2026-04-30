import { useTradingContext } from '../../context/TradingContext';
import { useTradeHighlight } from '../../context/TradeHighlightContext';
import { AlgoId } from '../../constants/algo.constants';
import Collapsible from '../../components/Collapsible/Collapsible';
import Chart from '../Chart/Chart';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import BacktestingPlaceholder from './BacktestingPlaceholder/BacktestingPlaceholder';
import StrategyChart from '../StrategyChart/StrategyChart';
import MetricsPanel from '../MetricsPanel/MetricsPanel';
import AutoGridMetricsPanel from '../MetricsPanel/AutoGridMetricsPanel';
import TradesTable from '../TradesTable/TradesTable';
import t from '../../locales';

export default function BacktestingView() {
  const { selectedPair, candles, isLoading, progress, error, backtestResult, selectedAlgo } =
    useTradingContext();
  const { tradesTableRef } = useTradeHighlight();
  const hasData = !isLoading && candles.length > 0;
  const isAutoGrid = selectedAlgo.id === AlgoId.AutoGrid;

  if (isLoading) {
    return <LoadingIndicator progress={progress} />;
  }

  if (!hasData) {
    return <BacktestingPlaceholder />;
  }

  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-auto">
        <Collapsible id="chart" title={t.chart.title}>
          <Chart pair={selectedPair} candles={candles} trades={backtestResult?.trades} />
        </Collapsible>
        {error && <p className="text-red text-[13px]">{error}</p>}
        <Collapsible id="metrics" title={t.metrics.title}>
          {isAutoGrid ? (
            <AutoGridMetricsPanel />
          ) : (
            <MetricsPanel metrics={backtestResult?.metrics} />
          )}
        </Collapsible>
        <Collapsible id="strategy" title={t.earningsChart.title}>
          <StrategyChart candles={candles} />
        </Collapsible>
      </div>
      <TradesTable ref={tradesTableRef} trades={backtestResult?.trades} />
    </div>
  );
}
