import { ALGORITHMS } from '../../../algos/algos';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';
import Dropdown from '../../Dropdown/DropdownBase';

const ALL_ALGO_NAMES = ALGORITHMS.map((algo) => algo.name);

export default function AlgoDropdown() {
  const { selectedAlgo, setSelectedAlgo } = useTradingContext();

  function handleSelect(name: string) {
    const algo = ALGORITHMS.find((algorithm) => algorithm.name === name);
    if (algo) {
      setSelectedAlgo(algo);
    }
  }

  return (
    <Dropdown
      title={t.algo.label}
      options={ALL_ALGO_NAMES}
      selected={selectedAlgo.name}
      onSelect={handleSelect}
    />
  );
}
