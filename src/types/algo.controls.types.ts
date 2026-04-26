export interface DcaLevel {
  pct: number;
  amount: number;
}

export type AlgoOptionValue = number | boolean | string | DcaLevel[] | number[];
export type AlgoOptions = Record<string, AlgoOptionValue>;

export type AlgoParamType = 'number' | 'slider' | 'dropdown' | 'checkbox' | 'levels';

export interface AlgoParamOption {
  label: string;
  value: string | number;
}

export interface ControlDef {
  key: string;
  title: string;
  type: AlgoParamType;
  defaultValue: AlgoOptionValue;
  min?: number;
  max?: number;
  step?: number;
  options?: AlgoParamOption[];
  group?: string;
  disablable?: boolean;
  disabledWhen?: { key: string; value: AlgoOptionValue };
}
