import ChartLineIcon from '../../../components/Icons/ChartLineIcon';
import t from '../../../locales';

interface Props {
  loading?: boolean;
  progress?: number;
}

export default function ChartPlaceholder({ loading, progress }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {t.chart.title}
      </span>
      <div className="flex flex-col items-center justify-center gap-2 border border-border bg-surface h-[350px]">
        {loading ? (
          <>
            <span className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            <div className="w-48 flex flex-col gap-1.5">
              <div className="w-full h-1 bg-bg border border-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <span className="text-center text-[11px] font-mono text-muted">
                {t.actions.loading}
              </span>
            </div>
          </>
        ) : (
          <>
            <ChartLineIcon size={32} />
            <span className="font-mono text-[13px] text-muted">{t.chart.noData}</span>
            <span className="font-mono text-[11px] text-muted opacity-60">
              {t.chart.noDataHint}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
