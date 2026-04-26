import { useEffect, useState } from 'react';
import { ControlDef } from '../../types/algo.types';

interface Props {
  param: ControlDef;
  value: number;
  enabled?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
  onEnabledChange?: (enabled: boolean) => void;
}

export default function Slider({
  param,
  value,
  enabled,
  disabled,
  onChange,
  onEnabledChange,
}: Props) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const disablable = param.disablable === true && onEnabledChange !== undefined;
  const isOn = (!disablable || enabled !== false) && !disabled;

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    setLocalValue(parseFloat(event.target.value));
  }

  function handleCommit() {
    onChange(localValue);
  }

  return (
    <div className={`flex flex-col gap-0.5 flex-1 min-w-0 ${isOn ? '' : 'opacity-50'}`}>
      <div className="flex justify-between items-center">
        {disablable ? (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isOn}
              onChange={(event) => onEnabledChange?.(event.target.checked)}
              className="accent-accent cursor-pointer w-2.5 h-2.5"
            />
            <span className="text-[9px] text-muted">{param.title}</span>
          </label>
        ) : (
          <span className="text-[9px] text-muted">{param.title}</span>
        )}
        <span className="text-[9px] font-mono text-text">{localValue}</span>
      </div>
      <input
        type="range"
        min={param.min ?? 0}
        max={param.max ?? 100}
        step={param.step ?? 1}
        value={localValue}
        disabled={!isOn}
        onChange={handleInput}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        className="w-full accent-accent cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}
