export interface BinanceTrade {
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

type TradeCallback = (trade: BinanceTrade) => void;

export class BinanceLiveWS {
  private ws: WebSocket | null = null;
  private symbol: string;
  private onTrade: TradeCallback = () => {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(pair: string) {
    // ETH/USDC -> ethusdc
    this.symbol = pair.replace('/', '').toLowerCase();
  }

  setCallback(onTrade: TradeCallback) {
    this.onTrade = onTrade;
  }

  connect() {
    if (this.ws) {
      return;
    }

    const url = `wss://stream.binance.com:9443/ws/${this.symbol}@trade`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Binance trade: p=price, q=qty, m=isBuyerMaker
        // m=true means the buyer placed a limit order (maker), so the trade was a SELL (taker sold)
        // m=false means the seller placed a limit order, so the trade was a BUY (taker bought)
        this.onTrade({
          price: parseFloat(msg.p),
          volume: parseFloat(msg.q),
          side: msg.m ? 'sell' : 'buy',
          timestamp: new Date(msg.T).toISOString(),
        });
      } catch {
        // Ignore
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose fires after
    };
  }

  private disposed = false;

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.disposed) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
}
