import { Mode } from '../../constants/global.constants';
import { useTradingContext } from '../../context/TradingContext';
import BacktestingView from '../BacktestingView/BacktestingView';
import TradingView from '../TradingView/TradingView';

export default function MainView() {
  const { mode } = useTradingContext();
  return mode === Mode.Backtesting ? <BacktestingView /> : <TradingView />;
}
