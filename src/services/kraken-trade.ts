const BASE_URL = '/kraken-api';

interface KrakenResponse<T> {
  error: string[];
  result: T;
}

async function signRequest(path: string, postData: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const nonceMatch = postData.match(/nonce=(\d+)/);
  const nonce = nonceMatch ? nonceMatch[1] : '';

  const sha256Hash = await crypto.subtle.digest('SHA-256', encoder.encode(nonce + postData));
  const secretBytes = Uint8Array.from(atob(secret), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const pathBytes = encoder.encode(path);
  const message = new Uint8Array(pathBytes.length + sha256Hash.byteLength);
  message.set(pathBytes);
  message.set(new Uint8Array(sha256Hash), pathBytes.length);

  const signature = await crypto.subtle.sign('HMAC', key, message);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function privateRequest<T>(
  endpoint: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {}
): Promise<T> {
  const nonce = Date.now().toString();
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const signature = await signRequest(endpoint, postData, apiSecret);

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
    throw new Error(data.error.join(', '));
  }
  return data.result;
}

export async function getBalance(
  apiKey: string,
  apiSecret: string
): Promise<Record<string, string>> {
  return privateRequest('/0/private/Balance', apiKey, apiSecret);
}

export async function placeMarketOrder(
  apiKey: string,
  apiSecret: string,
  pair: string,
  side: 'buy' | 'sell',
  volume: string,
  leverage?: string
): Promise<string[]> {
  const params: Record<string, string> = { pair, type: side, ordertype: 'market', volume };
  if (leverage) {
    params.leverage = leverage;
  }
  const result = await privateRequest<{ txid: string[] }>(
    '/0/private/AddOrder',
    apiKey,
    apiSecret,
    params
  );
  return result.txid;
}

export async function placeLimitOrder(
  apiKey: string,
  apiSecret: string,
  pair: string,
  side: 'buy' | 'sell',
  volume: string,
  price: string,
  leverage?: string
): Promise<string[]> {
  const params: Record<string, string> = { pair, type: side, ordertype: 'limit', volume, price };
  if (leverage) {
    params.leverage = leverage;
  }
  const result = await privateRequest<{ txid: string[] }>(
    '/0/private/AddOrder',
    apiKey,
    apiSecret,
    params
  );
  return result.txid;
}

export async function placeStopLossOrder(
  apiKey: string,
  apiSecret: string,
  pair: string,
  side: 'buy' | 'sell',
  volume: string,
  stopPrice: string,
  leverage?: string
): Promise<string[]> {
  const params: Record<string, string> = {
    pair,
    type: side,
    ordertype: 'stop-loss',
    volume,
    price: stopPrice,
  };
  if (leverage) {
    params.leverage = leverage;
  }
  const result = await privateRequest<{ txid: string[] }>(
    '/0/private/AddOrder',
    apiKey,
    apiSecret,
    params
  );
  return result.txid;
}

export async function cancelOrder(apiKey: string, apiSecret: string, txid: string): Promise<void> {
  await privateRequest('/0/private/CancelOrder', apiKey, apiSecret, { txid });
}

export async function queryOrder(
  apiKey: string,
  apiSecret: string,
  txid: string
): Promise<{ status: string }> {
  const result = await privateRequest<Record<string, { status: string }>>(
    '/0/private/QueryOrders',
    apiKey,
    apiSecret,
    { txid }
  );
  const order = result[txid];
  return order ?? { status: 'unknown' };
}
