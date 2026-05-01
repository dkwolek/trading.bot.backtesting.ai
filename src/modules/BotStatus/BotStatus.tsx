import { usePersistedState } from '../../hooks/usePersistedState';
import t from '../../locales';
import { BOT_STATUS_FORM_DEFAULTS, BOT_STATUS_FORM_KEY } from './botStatus.constants';
import { BotStatusForm } from './botStatus.types';
import ConnectionForm from './ConnectionForm/ConnectionForm';
import StatusPanel from './StatusPanel/StatusPanel';
import { useBotStatus } from './useBotStatus';

function isBotStatusForm(value: unknown): value is BotStatusForm {
  return (
    typeof value === 'object' &&
    value !== null &&
    'host' in value &&
    'user' in value &&
    'logDir' in value
  );
}

export default function BotStatus() {
  const [form, setForm] = usePersistedState<BotStatusForm>(
    BOT_STATUS_FORM_KEY,
    BOT_STATUS_FORM_DEFAULTS,
    isBotStatusForm
  );
  const { data, isLoading, errorMessage, isConnected, connect, disconnect, refresh } =
    useBotStatus();

  function handleConnect(password: string) {
    connect({ form, password });
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">
      <ConnectionForm
        form={form}
        onFormChange={setForm}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onRefresh={refresh}
        isConnected={isConnected}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
      {data ? (
        <StatusPanel
          lines={data.lines}
          logFile={data.logFile}
          fetchedAt={data.fetchedAt}
          state={data.state}
          stateError={data.stateError}
          config={data.config}
        />
      ) : (
        <div className="bg-surface border border-border p-6 text-[12px] font-mono text-muted">
          {isLoading ? t.botStatus.refreshing : t.botStatus.noData}
        </div>
      )}
    </div>
  );
}
