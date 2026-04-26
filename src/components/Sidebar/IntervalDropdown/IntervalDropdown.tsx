import { Interval } from '../../../constants/global.constants';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';
import Dropdown from '../../Dropdown/DropdownBase';

const ALL_INTERVALS = Object.values(Interval);

export default function IntervalDropdown() {
  const { selectedInterval, setSelectedInterval } = useTradingContext();

  return (
    <Dropdown
      title={t.interval.label}
      options={ALL_INTERVALS}
      selected={selectedInterval}
      onSelect={setSelectedInterval}
    />
  );
}
