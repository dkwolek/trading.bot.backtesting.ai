import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';

export default function LoadDataButton() {
  const { isLoading, loadData } = useTradingContext();

  return (
    <button
      className="w-full p-2 bg-accent text-white border-0 rounded-sm font-ui text-[11px] font-semibold tracking-[0.05em] cursor-pointer transition-opacity mt-auto enabled:hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={loadData}
      disabled={isLoading}
    >
      {isLoading ? t.actions.loading : t.actions.loadData}
    </button>
  );
}
