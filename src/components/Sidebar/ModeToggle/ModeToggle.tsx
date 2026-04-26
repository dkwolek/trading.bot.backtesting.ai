import { Mode } from '../../../constants/global.constants';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';

const ALL_MODES = Object.values(Mode);

const MODE_LABELS: Record<Mode, string> = {
  [Mode.Backtesting]: t.mode.backtesting,
  [Mode.Trading]: t.mode.trading,
};

export default function ModeToggle() {
  const { mode, setMode } = useTradingContext();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {t.mode.label}
      </span>
      <div className="flex bg-bg border border-border rounded-sm p-0.5">
        {ALL_MODES.map((modeOption) => (
          <div
            key={modeOption}
            className={`flex-1 text-center py-[5px] text-[11px] font-medium rounded-sm cursor-pointer select-none transition-colors ${
              mode === modeOption ? 'bg-accent text-white' : 'text-muted'
            }`}
            onClick={() => setMode(modeOption)}
          >
            {MODE_LABELS[modeOption]}
          </div>
        ))}
      </div>
    </div>
  );
}
