import { createHmac, createHash } from 'node:crypto';

const BASE_URL = 'https://api.kraken.com';

interface KrakenResponse<T> {
  error: string[];
  result: T;
}

export interface TickerInfo {
  c: [string, string]; // last trade [price, volume]
}

export interface OrderResult {
  descr: { order: string };
  txid: string[];
}

export interface OrderInfo {
  status: 'pending' | 'open' | 'closed' | 'canceled' | 'expired' | 'triggered';
  vol: string;
  vol_exec: string;
  price: string;
  cost?: string; // quote currency amount of the fill
  fee?: string; // quote currency fee paid
  descr: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: string;
    price: string;
    order: string;
  };
}

function sign(path: string, postData: string, secret: string): string {
  const nonceMatch = postData.match(/nonce=(\d+)/);
  const nonce = nonceMatch ? nonceMatch[1] : '';

  const sha256 = createHash('sha256')
    .update(nonce + postData)
    .digest();
  const secretBuffer = Buffer.from(secret, 'base64');
  const message = Buffer.concat([Buffer.from(path), sha256]);
  const hmac = createHmac('sha512', secretBuffer).update(message).digest('base64');

  return hmac;
}

async function publicRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  const data: KrakenResponse<T> = await response.json();
  if (data.error.length > 0) {
    throw new Error(`Kraken: ${data.error.join(', ')}`);
  }
  return data.result;
}

async function privateRequest<T>(
  endpoint: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {}
): Promise<T> {
  const nonce = Date.now().toString();
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const signature = sign(endpoint, postData, apiSecret);

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'API-Key': apiKey,
      'API-Sign': signature,
    },
    body: postData,
  });

  const data: KrakenResponse<T> = await response.json();
  if (data.error.length > 0) {
    throw new Error(`Kraken: ${data.error.join(', ')}`);
  }
  return data.result;
}

export async function getTicker(pair: string): Promise<number> {
  const result = await publicRequest<Record<string, TickerInfo>>(`/0/public/Ticker?pair=${pair}`);
  const key = Object.keys(result)[0];
  return parseFloat(result[key].c[0]);
}

function withLeverage(params: Record<string, string>, leverage: number): Record<string, string> {
  if (leverage > 0) {
    params.leverage = String(leverage);
  }
  return params;
}

export async function placeMarket(
  apiKey: string,
  apiSecret: string,
  pair: string,
  side: 'buy' | 'sell',
  volume: string,
  leverage: number,
  reduceOnly = false
): Promise<string[]> {
  const params = withLeverage(
    { pair, type: side, ordertype: 'market', volume },
    leverage
  );
  if (reduceOnly) {
    params.reduce_only = 'true';
  }
  const result = await privateRequest<OrderResult>('/0/private/AddOrder', apiKey, apiSecret, params);
  return result.txid;
}

export async function placeLimit(
  apiKey: string,
  apiSecret: string,
  pair: string,
  side: 'buy' | 'sell',
  volume: string,
  price: string,
  leverage: number,
  reduceOnly = false,
  postOnly = false
): Promise<string[]> {
  const params = withLeverage(
    { pair, type: side, ordertype: 'limit', volume, price },
    leverage
  );
  if (reduceOnly) {
    params.reduce_only = 'true';
  }
  if (postOnly) {
    params.oflags = 'post';
  }
  const result = await privateRequest<OrderResult>('/0/private/AddOrder', apiKey, apiSecret, params);
  return result.txid;
}

export async function placeStopLoss(
  apiKey: string,
  apiSecret: string,
  pair: string,
  side: 'buy' | 'sell',
  volume: string,
  stopPrice: string,
  leverage: number,
  reduceOnly = false
): Promise<string[]> {
  const params = withLeverage(
    { pair, type: side, ordertype: 'stop-loss', volume, price: stopPrice },
    leverage
  );
  if (reduceOnly) {
    params.reduce_only = 'true';
  }
  const result = await privateRequest<OrderResult>('/0/private/AddOrder', apiKey, apiSecret, params);
  return result.txid;
}

export async function queryOrders(
  apiKey: string,
  apiSecret: string,
  txids: string[]
): Promise<Record<string, OrderInfo>> {
  return privateRequest('/0/private/QueryOrders', apiKey, apiSecret, {
    txid: txids.join(','),
  });
}

export async function cancelOrder(apiKey: string, apiSecret: string, txid: string): Promise<void> {
  await privateRequest('/0/private/CancelOrder', apiKey, apiSecret, { txid });
}

export async function getBalance(
  apiKey: string,
  apiSecret: string
): Promise<Record<string, string>> {
  return privateRequest('/0/private/Balance', apiKey, apiSecret);
}

export async function getWsToken(apiKey: string, apiSecret: string): Promise<string> {
  const result = await privateRequest<{ token: string; expires: number }>(
    '/0/private/GetWebSocketsToken',
    apiKey,
    apiSecret
  );
  return result.token;
}
