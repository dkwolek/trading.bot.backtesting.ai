import { useState } from 'react';
import { DcaLevel } from '../../types/algo.controls.types';
import t from '../../locales';

interface Props {
  title: string;
  levels: DcaLevel[];
  onChange: (levels: DcaLevel[]) => void;
}

interface EditState {
  [key: string]: string;
}

export default function LevelsEditor({ title, levels, onChange }: Props) {
  const [editing, setEditing] = useState<EditState>({});

  function getEditKey(index: number, field: string): string {
    return `${index}-${field}`;
  }

  function handleFocus(index: number, field: 'pct' | 'amount') {
    const key = getEditKey(index, field);
    setEditing((prev) => ({ ...prev, [key]: String(levels[index][field]) }));
  }

  function handleChange(index: number, field: 'pct' | 'amount', value: string) {
    const key = getEditKey(index, field);
    setEditing((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(index: number, field: 'pct' | 'amount') {
    const key = getEditKey(index, field);
    const raw = editing[key];
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      const updated = levels.map((level, idx) =>
        idx === index ? { ...level, [field]: parsed } : level
      );
      onChange(updated);
    }
    setEditing((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function getDisplayValue(index: number, field: 'pct' | 'amount'): string {
    const key = getEditKey(index, field);
    if (key in editing) {
      return editing[key];
    }
    return String(levels[index][field]);
  }

  function handleAdd() {
    const lastLevel = levels[levels.length - 1];
    const newPct = lastLevel ? lastLevel.pct + 0.5 : 0.5;
    const newAmount = lastLevel ? lastLevel.amount : 10;
    onChange([...levels, { pct: newPct, amount: newAmount }]);
  }

  function handleRemove(index: number) {
    if (levels.length <= 1) {
      return;
    }
    onChange(levels.filter((_, idx) => idx !== index));
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <span className="text-[9px] text-muted">{title}</span>
      <div className="flex flex-col gap-1">
        {levels.map((level, index) => (
          <div key={index} className="flex items-center gap-1">
            <span className="text-[9px] text-muted w-4 shrink-0">
              {t.levelsEditor.level}
              {index + 1}
            </span>
            <input
              type="number"
              value={getDisplayValue(index, 'pct')}
              step={0.1}
              min={0.1}
              onFocus={() => handleFocus(index, 'pct')}
              onChange={(event) => handleChange(index, 'pct', event.target.value)}
              onBlur={() => handleBlur(index, 'pct')}
              className="w-14 px-1 py-0.5 bg-bg border border-border rounded-sm font-mono text-[10px] text-text outline-none focus:border-accent transition-colors"
              title={t.levelsEditor.pct}
            />
            <span className="text-[9px] text-muted">%</span>
            <input
              type="number"
              value={getDisplayValue(index, 'amount')}
              step={1}
              min={1}
              max={100}
              onFocus={() => handleFocus(index, 'amount')}
              onChange={(event) => handleChange(index, 'amount', event.target.value)}
              onBlur={() => handleBlur(index, 'amount')}
              className="w-14 px-1 py-0.5 bg-bg border border-border rounded-sm font-mono text-[10px] text-text outline-none focus:border-accent transition-colors"
              title={t.levelsEditor.amount}
            />
            <span className="text-[9px] text-muted">%</span>
            {levels.length > 1 && (
              <button
                onClick={() => handleRemove(index)}
                className="text-muted hover:text-red text-[12px] leading-none ml-auto"
              >
                {t.levelsEditor.remove}
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleAdd}
        className="text-[10px] text-accent hover:text-text transition-colors text-left"
      >
        {t.levelsEditor.add}
      </button>
    </div>
  );
}
