import t from '../../../locales';
import {
  TradeRow,
  formatDate,
  formatPrice,
  formatDollar,
  formatPnlPercent,
  formatBalance,
} from '../tradesTable.utils';

interface Props {
  row: TradeRow;
  highlighted: boolean;
  striped: boolean;
  // Quote currency required to fully cover the period's price range. When
  // > 0 (grid bot) the per-trade % uses this as the denominator instead
  // of the running balance — that's the capital the user actually has at
  // stake on the grid.
  requiredCapital: number;
  onClick: () => void;
}

function pnlColor(dollarPnl: number): string {
  return dollarPnl >= 0 ? 'text-green' : 'text-red';
}

function rowBackground(highlighted: boolean, striped: boolean, isOpen: boolean): string {
  if (highlighted) {
    return 'bg-blue-500/20 ring-1 ring-blue-500/40';
  }
  if (isOpen) {
    return 'bg-yellow-500/10 ring-1 ring-yellow-500/30';
  }
  return striped ? 'bg-surface' : '';
}

function exitLabelColor(label: string): string {
  if (label === 'TP') {
    return 'text-green';
  }
  if (label === 'SL') {
    return 'text-purple-400';
  }
  if (label === 'OPEN') {
    return 'text-yellow-400';
  }
  return 'text-red';
}

export default function TradeCard({ row, highlighted, striped, requiredCapital, onClick }: Props) {
  const color = pnlColor(row.dollarPnl);
  const isOpen = row.trade.exitLabel === 'OPEN';
  const background = rowBackground(highlighted, striped, isOpen);
  const prevBalance = row.balance - row.dollarPnl;
  const portfolioBase = requiredCapital > 0 ? requiredCapital : prevBalance;
  const portfolioPnlPct = portfolioBase > 0 ? (row.dollarPnl / portfolioBase) * 100 : 0;

  return (
    <div
      className={`px-3 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-border/30 transition-colors ${background}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-muted">
          <span>{formatDate(row.trade.entryTime)}</span>
          <span className={exitLabelColor(row.trade.exitLabel)}>{row.trade.exitLabel}</span>
          <span>{formatDate(row.trade.exitTime)}</span>
        </div>
        <div className="flex flex-col text-[9px] font-mono">
          {row.trade.levels.map((level) => (
            <div key={`${level.label}-${level.price}`} className="flex justify-between">
              <span className="text-green">L{Math.round(level.price)}</span>
              <span className="text-text">{formatPrice(level.price)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border/50 mt-0.5 pt-0.5">
            <span className={exitLabelColor(row.trade.exitLabel)}>{row.trade.exitLabel}</span>
            <span className={exitLabelColor(row.trade.exitLabel)}>
              {formatPrice(row.trade.exitPrice)}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          <span className={color}>{formatDollar(row.dollarPnl)}</span>
          <span className={color}>{formatPnlPercent(row.trade.pnlPercent)}</span>
          <span className={color}>{formatPnlPercent(portfolioPnlPct)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-muted">{formatBalance(row.tradeAmount)}</span>
          <span className="text-text">{formatBalance(row.balance)}</span>
        </div>
      </div>
    </div>
  );
}
