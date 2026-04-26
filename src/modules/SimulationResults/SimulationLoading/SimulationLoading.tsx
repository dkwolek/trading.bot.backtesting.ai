import t from '../../../locales';

interface Props {
  progress: number;
}

export default function SimulationLoading({ progress }: Props) {
  return (
    <div className="border border-border bg-surface h-[250px] flex flex-col items-center justify-center gap-3">
      <span className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
      <span className="text-[11px] font-mono text-muted text-center">
        {t.simulation.running} {progress > 0 && `(${progress} runs)`}
      </span>
    </div>
  );
}
