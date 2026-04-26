import { Mode } from '../../constants/global.constants';
import { useTradingContext } from '../../context/TradingContext';
import t from '../../locales';
import AlgoControls from './AlgoControls/AlgoControls';
import AlgoDropdown from './AlgoDropdown/AlgoDropdown';
import DateShifter from './DateShifter/DateShifter';
import InitialAmountInput from './InitialAmountInput/InitialAmountInput';
import IntervalDropdown from './IntervalDropdown/IntervalDropdown';
import ModeToggle from './ModeToggle/ModeToggle';
import PairsDropdown from './PairsDropdown/PairsDropdown';
import PeriodDropdown from './PeriodDropdown/PeriodDropdown';
import RunBacktestButton from './RunBacktestButton/RunBacktestButton';
import SimulateButton from './SimulateButton/SimulateButton';
import TradingControls from './TradingControls/TradingControls';

export default function Sidebar() {
  const { mode, signalConfig, setSignalConfig } = useTradingContext();

  return (
    <aside className="w-[200px] h-full bg-sidebar border-r border-border flex flex-col p-3 gap-4 shrink-0 overflow-y-auto">
      <span className="font-mono text-xs font-medium text-text tracking-[0.05em]">
        {t.topbar.title}
      </span>
      <ModeToggle />
      <PairsDropdown />
      <div className="flex gap-1.5">
        <div className="flex-1 min-w-0">
          <PeriodDropdown />
        </div>
        <div className="flex-1 min-w-0">
          <IntervalDropdown />
        </div>
      </div>
      {mode === Mode.Trading && (
        <TradingControls config={signalConfig} onChange={setSignalConfig} />
      )}
      {mode === Mode.Backtesting && <DateShifter />}
      {mode === Mode.Backtesting && (
        <>
          <AlgoDropdown />
          <InitialAmountInput />
          <AlgoControls />
          <div className="flex flex-col gap-2 mt-auto">
            <RunBacktestButton />
            <SimulateButton />
          </div>
        </>
      )}
    </aside>
  );
}
