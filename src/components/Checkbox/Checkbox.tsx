import { ControlDef } from '../../types/algo.types';

interface Props {
  param: ControlDef;
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function Checkbox({ param, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between flex-1 min-w-0">
      <span className="text-[9px] text-muted">{param.title}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-accent cursor-pointer"
      />
    </div>
  );
}
