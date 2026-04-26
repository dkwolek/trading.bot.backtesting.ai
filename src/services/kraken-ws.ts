export interface WsTrade {
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface BookLevel {
  price: number;
  qty: number;
}

export interface BookSnapshot {
  bids: BookLevel[];
  asks: BookLevel[];
}

type TradeCallback = (trade: WsTrade) => void;
type BookCallback = (book: BookSnapshot) => void;

const WS_URL = 'wss://ws.kraken.com/v2';

export class KrakenLiveWS {
  private ws: WebSocket | null = null;
  private pair: string;
  private onTrade: TradeCallback = () => {};
  private onBook: BookCallback = () => {};
  private book: BookSnapshot = { bids: [], asks: [] };
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(pair: string) {
    this.pair = pair.replace('/', '/');
  }

  setCallbacks(onTrade: TradeCallback, onBook: BookCallback) {
    this.onTrade = onTrade;
    this.onBook = onBook;
  }

  connect() {
    if (this.ws) {
      return;
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('KrakenWS: connected, subscribing to', this.pair);
      this.subscribe();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.method === 'subscribe' && msg.success === false) {
          console.error('KrakenWS: subscribe failed', msg);
        }
        this.handleMessage(msg);
      } catch {
        // Ignore
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
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

  getBook(): BookSnapshot {
    return this.book;
  }

  private subscribe() {
    if (!this.ws) {
      return;
    }
    this.ws.send(
      JSON.stringify({
        method: 'subscribe',
        params: { channel: 'trade', symbol: [this.pair] },
      })
    );
    this.ws.send(
      JSON.stringify({
        method: 'subscribe',
        params: { channel: 'book', symbol: [this.pair], depth: 500 },
      })
    );
  }

  private handleMessage(msg: Record<string, unknown>) {
    const channel = msg.channel as string;
    if (channel === 'trade') {
      this.handleTrades(msg);
    } else if (channel === 'book') {
      this.handleBook(msg);
    }
  }

  private handleTrades(msg: Record<string, unknown>) {
    const data = msg.data as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) {
      return;
    }
    for (const entry of data) {
      // Kraken v2: side or taker_side field
      const side = (entry.side ?? entry.taker_side ?? 'sell') as string;
      this.onTrade({
        price: parseFloat(entry.price as string),
        volume: parseFloat(entry.qty as string),
        side: side === 'buy' ? 'buy' : 'sell',
        timestamp: entry.timestamp as string,
      });
    }
  }

  private handleBook(msg: Record<string, unknown>) {
    const type = msg.type as string;
    const data = msg.data as Array<Record<string, unknown>>;
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }
    const entry = data[0];

    if (type === 'snapshot') {
      this.book = {
        bids: this.parseSide(entry.bids as Array<Record<string, string>>),
        asks: this.parseSide(entry.asks as Array<Record<string, string>>),
      };
    } else if (type === 'update') {
      if (entry.bids) {
        this.applyUpdates(this.book.bids, entry.bids as Array<Record<string, string>>, true);
      }
      if (entry.asks) {
        this.applyUpdates(this.book.asks, entry.asks as Array<Record<string, string>>, false);
      }
    }
    this.onBook(this.book);
  }

  private parseSide(raw: Array<Record<string, string>>): BookLevel[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((level) => ({
      price: parseFloat(level.price),
      qty: parseFloat(level.qty),
    }));
  }

  private applyUpdates(side: BookLevel[], updates: Array<Record<string, string>>, isBid: boolean) {
    for (const update of updates) {
      const price = parseFloat(update.price);
      const qty = parseFloat(update.qty);
      const idx = side.findIndex((level) => level.price === price);
      if (qty === 0) {
        if (idx >= 0) {
          side.splice(idx, 1);
        }
      } else if (idx >= 0) {
        side[idx].qty = qty;
      } else {
        side.push({ price, qty });
      }
    }
    side.sort((levelA, levelB) =>
      isBid ? levelB.price - levelA.price : levelA.price - levelB.price
    );
    if (side.length > 500) {
      side.length = 500;
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
