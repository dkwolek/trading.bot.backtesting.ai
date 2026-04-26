import { useState } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { useLiveData, LiveSource } from '../../hooks/useLiveData';
import ApiKeys from './ApiKeys/ApiKeys';
import LiveChart from './LiveChart/LiveChart';
import LivePrice from './LivePrice/LivePrice';
import OrderBookPanel from './OrderBookPanel/OrderBookPanel';
import TapePanel from './TapePanel/TapePanel';
import TradePanel from './TradePanel/TradePanel';

export default function TradingView() {
  const { selectedPair } = useTradingContext();
  const { price, trades, book, connected, source, setSource } = useLiveData(selectedPair);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('kraken-api-key') ?? '');
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem('kraken-api-secret') ?? '');

  function handleSaveKeys(key: string, secret: string) {
    setApiKey(key);
    setApiSecret(secret);
    localStorage.setItem('kraken-api-key', key);
    localStorage.setItem('kraken-api-secret', secret);
  }

  return (
    <div className="flex gap-2 h-full">
      {/* Left: Chart */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <LivePrice price={price} connected={connected} />
          <ApiKeys apiKey={apiKey} apiSecret={apiSecret} onSave={handleSaveKeys} />
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as LiveSource)}
            className="px-2 py-1 bg-bg border border-border rounded-sm text-[10px] font-mono text-text outline-none"
          >
            <option value="binance">Binance</option>
            <option value="kraken">Kraken</option>
          </select>
        </div>
        <LiveChart key={selectedPair} price={price} />
      </div>

      {/* Right sidebar: Book + Tape + Trade */}
      <div className="w-64 shrink-0 flex flex-col gap-2 h-full min-h-0 overflow-auto">
        <OrderBookPanel book={book} price={price} />
        <TapePanel trades={trades} />
        <TradePanel apiKey={apiKey} apiSecret={apiSecret} pair={selectedPair} price={price} />
      </div>
    </div>
  );
}
