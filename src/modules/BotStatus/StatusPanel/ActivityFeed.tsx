import t from '../../../locales';
import { ParsedLogLine } from '../botStatus.types';

interface Props {
  lines: ParsedLogLine[];
}

const LEVEL_COLORS: Record<NonNullable<ParsedLogLine['level']>, string> = {
  INFO: 'text-text',
  OK: 'text-green',
  WARN: 'text-yellow-400',
  ERROR: 'text-red',
};

export default function ActivityFeed({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="bg-surface border border-border p-3 text-[12px] font-mono text-muted">
        {t.botStatus.noLines}
      </div>
    );
  }
  return (
    <div>
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1">
        {t.botStatus.activity}
      </span>
      <div className="bg-surface border border-border max-h-[420px] overflow-auto">
        <table className="w-full text-[11px] font-mono">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-b border-border/40 last:border-b-0 align-top">
                <td className="px-2 py-1 text-muted whitespace-nowrap w-[150px]">
                  {line.timestamp ?? '—'}
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-[60px]">
                  <span
                    className={`text-[10px] font-semibold tracking-wider ${
                      line.level ? LEVEL_COLORS[line.level] : 'text-muted'
                    }`}
                  >
                    {line.level ?? '—'}
                  </span>
                </td>
                <td className="px-2 py-1 text-text break-words">{line.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
