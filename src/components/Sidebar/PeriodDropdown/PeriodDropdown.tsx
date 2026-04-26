import { Period } from '../../../constants/global.constants';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';
import Dropdown from '../../Dropdown/DropdownBase';

const ALL_PERIODS = Object.values(Period);

export default function PeriodDropdown() {
  const { selectedPeriod, setSelectedPeriod } = useTradingContext();

  return (
    <Dropdown
      title={t.period.label}
      options={ALL_PERIODS}
      selected={selectedPeriod}
      onSelect={setSelectedPeriod}
    />
  );
}
