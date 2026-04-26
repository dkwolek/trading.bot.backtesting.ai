import { useEffect, useRef, useState } from 'react';
import { KrakenLiveWS, WsTrade, BookSnapshot } from '../services/kraken-ws';
import { BinanceLiveWS } from '../services/binance-ws';

const MAX_TRADES = 200;

export type LiveSource = 'kraken' | 'binance';

export function useLiveData(pair: string) {
  const [source, setSource] = useState<LiveSource>('binance');
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const krakenRef = useRef<KrakenLiveWS | null>(null);
  const binanceRef = useRef<BinanceLiveWS | null>(null);
  const pairRef = useRef(pair);
  pairRef.current = pair;
  const [price, setPrice] = useState(0);
  const [trades, setTrades] = useState<WsTrade[]>([]);
  const [book, setBook] = useState<BookSnapshot>({ bids: [], asks: [] });
  const [connected, setConnected] = useState(false);
  const bookThrottleRef = useRef(0);

  function addTrade(trade: WsTrade) {
    setTrades((prev) => {
      const next = [trade, ...prev];
      if (next.length > MAX_TRADES) {
        next.length = MAX_TRADES;
      }
      return next;
    });
  }

  // Kraken WS — always on for order book
  useEffect(() => {
    const activePair = pair;
    const wsPair = pair.replace('_', '/');
    const ws = new KrakenLiveWS(wsPair);

    ws.setCallbacks(
      (trade) => {
        if (pairRef.current !== activePair) {
          return;
        }
        if (sourceRef.current === 'kraken') {
          setPrice(trade.price);
          addTrade(trade);
        }
      },
      (newBook) => {
        if (pairRef.current !== activePair) {
          return;
        }
        const now = Date.now();
        if (now - bookThrottleRef.current >= 500) {
          bookThrottleRef.current = now;
          setBook({ bids: [...newBook.bids], asks: [...newBook.asks] });
        }
        setConnected(true);
      }
    );

    ws.connect();
    krakenRef.current = ws;

    return () => {
      ws.disconnect();
      krakenRef.current = null;
    };
  }, [pair]);

  // Binance WS — for trades
  useEffect(() => {
    if (source !== 'binance') {
      if (binanceRef.current) {
        binanceRef.current.disconnect();
        binanceRef.current = null;
      }
      return;
    }

    const activePair = pair;
    const wsPair = pair.replace('_', '/');
    const ws = new BinanceLiveWS(wsPair);

    ws.setCallback((trade) => {
      if (pairRef.current !== activePair) {
        return;
      }
      setPrice(trade.price);
      addTrade({
        price: trade.price,
        volume: trade.volume,
        side: trade.side,
        timestamp: trade.timestamp,
      });
    });

    ws.connect();
    binanceRef.current = ws;

    return () => {
      ws.disconnect();
      binanceRef.current = null;
    };
  }, [pair, source]);

  // Reset state when pair or source changes
  useEffect(() => {
    setPrice(0);
    setTrades([]);
    setBook({ bids: [], asks: [] });
    setConnected(false);
  }, [pair, source]);

  return { price, trades, book, connected, source, setSource };
}
