import { Mode } from '../../constants/global.constants';
import { useTradingContext } from '../../context/TradingContext';
import BacktestingView from '../BacktestingView/BacktestingView';
import BotStatus from '../BotStatus/BotStatus';

export default function MainView() {
  const { mode } = useTradingContext();
  return mode === Mode.Backtesting ? <BacktestingView /> : <BotStatus />;
}
