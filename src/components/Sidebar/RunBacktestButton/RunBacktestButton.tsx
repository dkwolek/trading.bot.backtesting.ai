import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';

export default function RunBacktestButton() {
  const { candles, runBacktest } = useTradingContext();
  const isDisabled = candles.length === 0;

  return (
    <button
      className="w-full p-2 bg-[#dc2626] text-white border-0 rounded-sm font-ui text-[11px] font-bold tracking-[0.08em] uppercase cursor-pointer transition-opacity enabled:hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={runBacktest}
      disabled={isDisabled}
    >
      {t.actions.runBacktest}
    </button>
  );
}
