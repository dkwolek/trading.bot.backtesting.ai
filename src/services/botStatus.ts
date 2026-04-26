import { BotStatusRequest, BotStatusResult } from '../modules/BotStatus/botStatus.types';

export async function fetchBotStatus(request: BotStatusRequest): Promise<BotStatusResult> {
  try {
    const response = await fetch('/api/bot-status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await response.json();
    return json as BotStatusResult;
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof Error ? caught.message : String(caught),
    };
  }
}
