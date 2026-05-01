import { useEffect, useRef, useState } from 'react';
import { fetchBotStatus } from '../../services/botStatus';
import { BotStatusForm, BotStatusResponse } from './botStatus.types';
import { BOT_STATUS_REFRESH_MS, BOT_STATUS_TAIL_LINES } from './botStatus.constants';

export interface BotStatusState {
  data: BotStatusResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  isConnected: boolean;
}

interface ConnectionInput {
  form: BotStatusForm;
  password: string;
}

export interface BotStatusHook extends BotStatusState {
  connect: (input: ConnectionInput) => Promise<void>;
  disconnect: () => void;
  refresh: () => void;
}

export function useBotStatus(): BotStatusHook {
  const [state, setState] = useState<BotStatusState>({
    data: null,
    isLoading: false,
    errorMessage: null,
    isConnected: false,
  });
  const credentialsRef = useRef<ConnectionInput | null>(null);
  const timerRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function refresh(silent: boolean) {
    const credentials = credentialsRef.current;
    if (!credentials) {
      return;
    }
    if (!silent) {
      setState((previous) => ({ ...previous, isLoading: true, errorMessage: null }));
    }
    const result = await fetchBotStatus({
      host: credentials.form.host,
      user: credentials.form.user,
      password: credentials.password,
      logDir: credentials.form.logDir,
      tailLines: BOT_STATUS_TAIL_LINES,
    });
    if (credentialsRef.current !== credentials) {
      return;
    }
    if (!result.ok) {
      setState({
        data: null,
        isLoading: false,
        errorMessage: result.error,
        isConnected: false,
      });
      credentialsRef.current = null;
      clearTimer();
      return;
    }
    setState({ data: result, isLoading: false, errorMessage: null, isConnected: true });
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      refresh(true);
    }, BOT_STATUS_REFRESH_MS);
  }

  async function connect(input: ConnectionInput) {
    credentialsRef.current = input;
    await refresh(false);
  }

  function disconnect() {
    credentialsRef.current = null;
    clearTimer();
    setState({ data: null, isLoading: false, errorMessage: null, isConnected: false });
  }

  function refreshNow() {
    if (!credentialsRef.current) {
      return;
    }
    clearTimer();
    refresh(false);
  }

  useEffect(() => {
    return () => {
      credentialsRef.current = null;
      clearTimer();
    };
  }, []);

  return { ...state, connect, disconnect, refresh: refreshNow };
}
