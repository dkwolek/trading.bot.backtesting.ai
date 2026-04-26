import DropdownBase from './DropdownBase';
import { ControlDef } from '../../types/algo.types';

interface Props {
  param: ControlDef;
  value: string;
  onChange: (value: string) => void;
}

export default function Dropdown({ param, value, onChange }: Props) {
  const options = param.options ?? [];
  const labels = options.map((opt) => opt.label);
  const selectedLabel = options.find((opt) => String(opt.value) === value)?.label ?? value;

  function handleSelect(label: string) {
    const opt = options.find((option) => option.label === label);
    if (opt) {
      onChange(String(opt.value));
    }
  }

  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <span className="text-[9px] text-muted">{param.title}</span>
      <DropdownBase options={labels} selected={selectedLabel} onSelect={handleSelect} />
    </div>
  );
}
