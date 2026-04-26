import { useEffect, useRef, useState } from 'react';
import * as kraken from '../../../services/kraken-trade';

interface Props {
  apiKey: string;
  apiSecret: string;
  pair: string;
  price: number;
}

interface TradeLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function TradePanel({ apiKey, apiSecret, pair, price }: Props) {
  const [amount, setAmount] = useState('50');
  const [tpPct, setTpPct] = useState('1.5');
  const [slPct, setSlPct] = useState('2');
  const [leverage, setLeverage] = useState('2');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<TradeLog[]>([]);

  // OCO state: monitor price and cancel the other order
  const ocoRef = useRef<{
    side: 'buy' | 'sell';
    tpTxid: string;
    slTxid: string;
    tpPrice: number;
    slPrice: number;
  } | null>(null);

  const hasKeys = apiKey.length > 0 && apiSecret.length > 0;
  const krakenPair = pair.replace('/', '');

  // OCO: poll order status every 5 seconds
  useEffect(() => {
    if (!ocoRef.current || !hasKeys) {
      return;
    }

    const interval = setInterval(async () => {
      const oco = ocoRef.current;
      if (!oco) {
        return;
      }

      try {
        const tpStatus = await kraken.queryOrder(apiKey, apiSecret, oco.tpTxid);
        const slStatus = await kraken.queryOrder(apiKey, apiSecret, oco.slTxid);

        if (tpStatus.status === 'closed') {
          addLog('TP filled — cancelling SL', 'success');
          await kraken.cancelOrder(apiKey, apiSecret, oco.slTxid).catch(() => {});
          ocoRef.current = null;
        } else if (slStatus.status === 'closed' || slStatus.status === 'triggered') {
          addLog('SL filled — cancelling TP', 'success');
          await kraken.cancelOrder(apiKey, apiSecret, oco.tpTxid).catch(() => {});
          ocoRef.current = null;
        }
      } catch {
        // Retry next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ocoRef.current?.tpTxid]);

  function addLog(message: string, type: TradeLog['type'] = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [{ time, message, type }, ...prev].slice(0, 50));
  }

  async function executeTrade(side: 'buy' | 'sell') {
    if (!hasKeys || price <= 0) {
      return;
    }

    setLoading(true);
    const amountUsd = parseFloat(amount);
    const volume = (amountUsd / price).toFixed(8);
    const tp = parseFloat(tpPct);
    const sl = parseFloat(slPct);

    try {
      const lev = leverage !== '0' ? leverage : undefined;

      // Market order with leverage
      const txids = await kraken.placeMarketOrder(apiKey, apiSecret, krakenPair, side, volume, lev);
      addLog(
        `${side.toUpperCase()} ${volume} @ market ${lev ? `(${lev}x)` : '(spot)'}, txid: ${txids[0]}`,
        'success'
      );

      // TP limit order (close position)
      const tpSide = side === 'buy' ? 'sell' : 'buy';
      const tpPrice = side === 'buy' ? price * (1 + tp / 100) : price * (1 - tp / 100);
      const tpTxids = await kraken.placeLimitOrder(
        apiKey,
        apiSecret,
        krakenPair,
        tpSide,
        volume,
        tpPrice.toFixed(2),
        lev
      );
      addLog(`TP ${tpSide} @ ${tpPrice.toFixed(2)} (+${tp}%), txid: ${tpTxids[0]}`, 'info');

      // SL stop-loss order
      const slSide = side === 'buy' ? 'sell' : 'buy';
      const slPrice = side === 'buy' ? price * (1 - sl / 100) : price * (1 + sl / 100);
      const slTxids = await kraken.placeStopLossOrder(
        apiKey,
        apiSecret,
        krakenPair,
        slSide,
        volume,
        slPrice.toFixed(2),
        lev
      );
      addLog(`SL ${slSide} @ ${slPrice.toFixed(2)} (-${sl}%), txid: ${slTxids[0]}`, 'info');

      // Set OCO monitoring
      ocoRef.current = {
        side,
        tpTxid: tpTxids[0],
        slTxid: slTxids[0],
        tpPrice,
        slPrice,
      };
      addLog('OCO active — TP/SL will cancel each other', 'info');
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        Quick Trade
      </span>
      <div className="border border-border bg-surface p-2 rounded flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-muted">Amount ($)</span>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full px-2 py-1 bg-bg border border-border rounded-sm font-mono text-text outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-muted">Lever</span>
            <select
              value={leverage}
              onChange={(event) => setLeverage(event.target.value)}
              className="w-full px-2 py-1 bg-bg border border-border rounded-sm font-mono text-text outline-none"
            >
              <option value="0">Spot</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="5">5x</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-muted">TP %</span>
            <input
              type="number"
              value={tpPct}
              step={0.1}
              onChange={(event) => setTpPct(event.target.value)}
              className="w-full px-2 py-1 bg-bg border border-border rounded-sm font-mono text-text outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-muted">SL %</span>
            <input
              type="number"
              value={slPct}
              step={0.1}
              onChange={(event) => setSlPct(event.target.value)}
              className="w-full px-2 py-1 bg-bg border border-border rounded-sm font-mono text-text outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => executeTrade('buy')}
            disabled={!hasKeys || loading}
            className="py-1.5 bg-green text-white text-[11px] font-bold rounded-sm hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'BUY'}
          </button>
          <button
            onClick={() => executeTrade('sell')}
            disabled={!hasKeys || loading}
            className="py-1.5 bg-red text-white text-[11px] font-bold rounded-sm hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'SELL'}
          </button>
        </div>
        {logs.length > 0 && (
          <div className="max-h-24 overflow-y-auto text-[9px] font-mono flex flex-col gap-0.5">
            {logs.map((log, index) => (
              <span
                key={index}
                className={
                  log.type === 'error'
                    ? 'text-red'
                    : log.type === 'success'
                      ? 'text-green'
                      : 'text-muted'
                }
              >
                [{log.time}] {log.message}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
