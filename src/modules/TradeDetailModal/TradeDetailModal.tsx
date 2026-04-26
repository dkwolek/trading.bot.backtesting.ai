import { useEffect } from 'react';
import t from '../../locales';

interface TradeDetail {
  entryTime: string;
  exitTime: string;
  entryPrice: string;
  exitPrice: string;
  tradeAmount: string;
  dollarPnl: string;
  pnlPercent: string;
  balance: string;
  quantity: number;
  duration: string;
  isProfit: boolean;
}

interface Props {
  detail: TradeDetail;
  onClose: () => void;
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`text-[11px] font-mono ${highlight ?? 'text-text'}`}>{value}</span>
    </div>
  );
}

function formatDuration(entryUnix: number, exitUnix: number): string {
  const diffSeconds = exitUnix - entryUnix;
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export { formatDuration };
export type { TradeDetail };

export default function TradeDetailModal({ detail, onClose }: Props) {
  const pnlColor = detail.isProfit ? 'text-green' : 'text-red';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-sidebar border border-border rounded w-80 p-4 flex flex-col gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted">
            {t.trades.detailTitle}
          </span>
          <button className="text-muted hover:text-text text-[16px] leading-none" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="flex flex-col">
          <DetailRow label={t.trades.entryTime} value={detail.entryTime} />
          <DetailRow label={t.trades.exitTime} value={detail.exitTime} />
          <DetailRow label={t.trades.duration} value={detail.duration} />
          <DetailRow label={t.trades.entryPrice} value={detail.entryPrice} />
          <DetailRow label={t.trades.exitPrice} value={detail.exitPrice} />
          <DetailRow label={t.trades.quantity} value={String(detail.quantity)} />
          <DetailRow label={t.trades.tradeAmount} value={detail.tradeAmount} />
          <DetailRow label={t.trades.pnl} value={detail.dollarPnl} highlight={pnlColor} />
          <DetailRow label={t.trades.pnlPercent} value={detail.pnlPercent} highlight={pnlColor} />
          <DetailRow label={t.trades.balance} value={detail.balance} />
        </div>
      </div>
    </div>
  );
}
