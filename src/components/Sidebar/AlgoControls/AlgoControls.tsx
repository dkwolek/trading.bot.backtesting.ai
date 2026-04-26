import { useTradingContext } from '../../../context/TradingContext';
import { AlgoOptionValue, AlgoOptions, ControlDef, DcaLevel } from '../../../types/algo.types';
import Checkbox from '../../Checkbox/Checkbox';
import Dropdown from '../../Dropdown/Dropdown';
import LevelsEditor from '../../LevelsEditor/LevelsEditor';
import NumberInput from '../../Number/Number';
import Slider from '../../Slider/Slider';

function enabledKey(key: string): string {
  return `${key}Enabled`;
}

function renderControl(
  param: ControlDef,
  value: AlgoOptionValue,
  options: AlgoOptions,
  onChange: (value: AlgoOptionValue) => void,
  setOption: (key: string, value: AlgoOptionValue) => void
) {
  if (param.type === 'slider') {
    const enabled = param.disablable
      ? ((options[enabledKey(param.key)] as boolean | undefined) ?? true)
      : undefined;
    const disabled = param.disabledWhen
      ? options[param.disabledWhen.key] === param.disabledWhen.value
      : false;
    return (
      <Slider
        key={param.key}
        param={param}
        value={typeof value === 'number' ? value : parseFloat(String(param.defaultValue))}
        enabled={enabled}
        disabled={disabled}
        onChange={onChange}
        onEnabledChange={
          param.disablable ? (next) => setOption(enabledKey(param.key), next) : undefined
        }
      />
    );
  }
  if (param.type === 'dropdown') {
    return (
      <Dropdown
        key={param.key}
        param={param}
        value={typeof value === 'string' ? value : String(param.defaultValue)}
        onChange={onChange}
      />
    );
  }
  if (param.type === 'checkbox') {
    return (
      <Checkbox
        key={param.key}
        param={param}
        value={typeof value === 'boolean' ? value : Boolean(param.defaultValue)}
        onChange={onChange}
      />
    );
  }
  if (param.type === 'levels') {
    const levels = Array.isArray(value)
      ? (value as DcaLevel[])
      : (param.defaultValue as DcaLevel[]);
    return <LevelsEditor key={param.key} title={param.title} levels={levels} onChange={onChange} />;
  }
  return (
    <NumberInput
      key={param.key}
      param={param}
      value={typeof value === 'number' ? value : parseFloat(String(param.defaultValue))}
      onChange={onChange}
    />
  );
}

function groupControls(controls: ControlDef[]): { group: string; controls: ControlDef[] }[] {
  const groups: { group: string; controls: ControlDef[] }[] = [];
  for (const control of controls) {
    const groupName = control.group ?? '';
    const existing = groups.find((entry) => entry.group === groupName);
    if (existing) {
      existing.controls.push(control);
    } else {
      groups.push({ group: groupName, controls: [control] });
    }
  }
  return groups;
}

export default function AlgoControls() {
  const { selectedAlgo, algoOptions, setAlgoOption } = useTradingContext();

  if (!selectedAlgo.controls?.length) {
    return null;
  }

  const grouped = groupControls(selectedAlgo.controls);

  return (
    <div className="flex flex-col gap-3">
      {grouped.map(({ group, controls }) => (
        <div key={group} className="flex flex-col gap-1.5">
          {group && (
            <span className="text-[8px] font-semibold tracking-widest uppercase text-accent/60 border-b border-border pb-0.5">
              {group}
            </span>
          )}
          {controls.map((control) =>
            renderControl(
              control,
              algoOptions[control.key] ?? control.defaultValue,
              algoOptions,
              (value) => setAlgoOption(control.key, value),
              setAlgoOption
            )
          )}
        </div>
      ))}
    </div>
  );
}
