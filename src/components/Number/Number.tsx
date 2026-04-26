import { useState } from 'react';
import { ControlDef } from '../../types/algo.types';

interface Props {
  param: ControlDef;
  value: number;
  onChange: (value: number) => void;
}

export default function Number({ param, value, onChange }: Props) {
  const [inputValue, setInputValue] = useState(String(value));

  function handleBlur() {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(param.min ?? parsed, Math.min(param.max ?? parsed, parsed));
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  }

  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <span className="text-[9px] text-muted">{param.title}</span>
      <input
        type="number"
        min={param.min}
        max={param.max}
        step={param.step ?? 1}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={handleBlur}
        className="w-full px-2 py-1.5 bg-bg border border-border rounded-sm font-mono text-[11px] text-text outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}
