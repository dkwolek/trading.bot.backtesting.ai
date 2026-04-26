import { useState } from 'react';
import { useTradingContext } from '../../../context/TradingContext';
import t from '../../../locales';

export default function InitialAmountInput() {
  const { initialAmount, setInitialAmount } = useTradingContext();
  const [inputValue, setInputValue] = useState(String(initialAmount));

  function handleBlur() {
    const parsed = parseFloat(inputValue.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      setInitialAmount(parsed);
      setInputValue(String(parsed));
    } else {
      setInputValue(String(initialAmount));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {t.initialAmount.label}
      </span>
      <input
        type="number"
        min="1"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={handleBlur}
        className="w-full px-2 py-1.5 bg-bg border border-border rounded-sm font-mono text-[11px] text-text outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}
