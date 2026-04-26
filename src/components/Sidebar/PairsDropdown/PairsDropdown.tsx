import { Pair } from '../../../constants/global.constants';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';
import Dropdown from '../../Dropdown/DropdownBase';

const ALL_PAIRS = Object.values(Pair);

export default function PairsDropdown() {
  const { selectedPair, setSelectedPair } = useTradingContext();

  return (
    <Dropdown
      title={t.pairs.label}
      options={ALL_PAIRS}
      selected={selectedPair}
      onSelect={setSelectedPair}
    />
  );
}
