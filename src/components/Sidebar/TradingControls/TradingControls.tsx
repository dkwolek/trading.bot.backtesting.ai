import { useState } from 'react';

export interface FilterSlider {
  value: number;
  enabled: boolean;
}

export type TrendDir = 'rising' | 'falling' | 'any';

export interface TradingSignalConfig {
  dropPct: FilterSlider;
  dropWindow: FilterSlider;
  higherLow: boolean;
  trendDir: TrendDir;
}

const DEFAULTS: TradingSignalConfig = {
  dropPct: { value: 0.1, enabled: true },
  dropWindow: { value: 3, enabled: true },
  higherLow: true,
  trendDir: 'any',
};

interface Props {
  config: TradingSignalConfig;
  onChange: (config: TradingSignalConfig) => void;
}

function SliderRow({
  label,
  slider,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  slider: FilterSlider;
  min: number;
  max: number;
  step: number;
  onChange: (slider: FilterSlider) => void;
}) {
  const [local, setLocal] = useState(slider.value);

  return (
    <div className={`flex flex-col gap-0.5 ${slider.enabled ? '' : 'opacity-50'}`}>
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={slider.enabled}
            onChange={(event) => onChange({ value: slider.value, enabled: event.target.checked })}
            className="accent-accent cursor-pointer w-2.5 h-2.5"
          />
          <span className="text-[9px] text-muted">{label}</span>
        </label>
        <span className="text-[9px] font-mono text-text">{local}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={!slider.enabled}
        onChange={(event) => setLocal(parseFloat(event.target.value))}
        onMouseUp={() => onChange({ value: local, enabled: slider.enabled })}
        onTouchEnd={() => onChange({ value: local, enabled: slider.enabled })}
        className="w-full accent-accent cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function TradingControls({ config, onChange }: Props) {
  function update(key: keyof TradingSignalConfig, slider: FilterSlider) {
    onChange({ ...config, [key]: slider });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        Signal Config
      </span>
      <SliderRow
        label="Drop %"
        slider={config.dropPct}
        min={0.1}
        max={5}
        step={0.1}
        onChange={(slider) => update('dropPct', slider)}
      />
      <SliderRow
        label="Drop Window"
        slider={config.dropWindow}
        min={1}
        max={30}
        step={1}
        onChange={(slider) => update('dropWindow', slider)}
      />
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={config.higherLow}
          onChange={(event) => onChange({ ...config, higherLow: event.target.checked })}
          className="accent-accent cursor-pointer w-2.5 h-2.5"
        />
        <span className="text-[9px] text-muted">Higher Low Confirm</span>
      </label>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-muted">Trend Direction</span>
        <select
          value={config.trendDir}
          onChange={(event) => onChange({ ...config, trendDir: event.target.value as TrendDir })}
          className="px-2 py-1 bg-bg border border-border rounded-sm text-[10px] font-mono text-text outline-none"
        >
          <option value="rising">Rising (longs)</option>
          <option value="falling">Falling (shorts)</option>
          <option value="any">Any (both)</option>
        </select>
      </div>
    </div>
  );
}

export { DEFAULTS as TRADING_SIGNAL_DEFAULTS };
