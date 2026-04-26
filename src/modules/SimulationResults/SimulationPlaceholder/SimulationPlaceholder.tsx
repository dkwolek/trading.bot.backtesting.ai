import t from '../../../locales';

const SKELETON_ROWS = 6;
const SKELETON_COLS = 10;

export default function SimulationPlaceholder() {
  return (
    <div className="border border-border bg-surface">
      <table className="w-full border-collapse">
        <tbody>
          {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-border ${rowIndex % 2 === 0 ? '' : 'bg-border/10'}`}
            >
              {Array.from({ length: SKELETON_COLS }).map((_, colIndex) => (
                <td key={colIndex} className="px-2 py-2">
                  <div className="h-2.5 w-full bg-border rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted text-[11px] text-center py-3">{t.simulation.noResults}</p>
    </div>
  );
}
