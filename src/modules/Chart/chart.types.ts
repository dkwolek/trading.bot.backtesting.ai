export interface MarkerData {
  side: 'Buy' | 'Sell';
  time: number;
  price: number;
  volume: number;
  entryTime: number;
  label: string;
  color: string;
}

export interface TooltipInfo extends MarkerData {
  x: number;
  y: number;
}

export interface MarkerPosition {
  data: MarkerData;
  x: number;
  y: number;
}
