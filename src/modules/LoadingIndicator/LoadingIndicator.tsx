import t from '../../locales';

interface Props {
  progress: number;
}

export default function LoadingIndicator({ progress }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <span className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      <div className="w-48 flex flex-col gap-1.5">
        <div className="w-full h-1 bg-surface border border-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-mono text-muted text-center">
          {t.actions.loading} {progress > 0 && `${Math.round(progress)}%`}
        </span>
      </div>
    </div>
  );
}
