import { AlgoId } from '../constants/algo.constants';
import t from '../locales';
import { Algorithm } from '../types/algo.types';
import * as autoGrid from './auto-grid.algo';

export const ALGORITHMS: Algorithm[] = [
  {
    id: AlgoId.AutoGrid,
    name: t.algo.autoGrid,
    controls: autoGrid.controls,
    run: autoGrid.run,
  },
];
