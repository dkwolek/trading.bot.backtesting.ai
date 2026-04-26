import { BotStatusForm } from './botStatus.types';

export const BOT_STATUS_FORM_KEY = 'trading-bot-ai:botStatusForm';

export const BOT_STATUS_FORM_DEFAULTS: BotStatusForm = {
  host: '',
  user: 'pi',
  logDir: '/home/pi/Projects/trading.bot.ai/logs',
};

export const BOT_STATUS_REFRESH_MS = 5000;
export const BOT_STATUS_TAIL_LINES = 500;
export const BOT_STATUS_VISIBLE_ACTIVITY = 80;
