import { FormEvent, useState } from 'react';
import t from '../../../locales';
import { BotStatusForm } from '../botStatus.types';

interface Props {
  form: BotStatusForm;
  onFormChange: (form: BotStatusForm) => void;
  onConnect: (password: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}

export default function ConnectionForm({
  form,
  onFormChange,
  onConnect,
  onDisconnect,
  isConnected,
  isLoading,
  errorMessage,
}: Props) {
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isConnected) {
      onDisconnect();
      setPassword('');
      return;
    }
    if (password.length === 0) {
      return;
    }
    onConnect(password);
  }

  function updateField<K extends keyof BotStatusForm>(key: K, value: BotStatusForm[K]) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 bg-surface border border-border p-3"
    >
      <Field label={t.botStatus.host}>
        <input
          type="text"
          value={form.host}
          onChange={(event) => updateField('host', event.target.value)}
          placeholder="192.168.1.50"
          disabled={isConnected}
          className="w-36 px-2 py-1 bg-bg border border-border text-[12px] font-mono text-text outline-none disabled:opacity-60"
        />
      </Field>
      <Field label={t.botStatus.user}>
        <input
          type="text"
          value={form.user}
          onChange={(event) => updateField('user', event.target.value)}
          disabled={isConnected}
          className="w-24 px-2 py-1 bg-bg border border-border text-[12px] font-mono text-text outline-none disabled:opacity-60"
        />
      </Field>
      <Field label={t.botStatus.logPath}>
        <input
          type="text"
          value={form.logDir}
          onChange={(event) => updateField('logDir', event.target.value)}
          disabled={isConnected}
          className="w-72 px-2 py-1 bg-bg border border-border text-[12px] font-mono text-text outline-none disabled:opacity-60"
        />
      </Field>
      <Field label={t.botStatus.password}>
        <input
          type="password"
          value={isConnected ? '••••••••' : password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isConnected}
          autoComplete="current-password"
          className="w-32 px-2 py-1 bg-bg border border-border text-[12px] font-mono text-text outline-none disabled:opacity-60"
        />
      </Field>
      <button
        type="submit"
        disabled={isLoading || (!isConnected && password.length === 0)}
        className="px-3 py-1 bg-accent text-white text-[12px] font-medium border border-accent disabled:opacity-50"
      >
        {isConnected ? t.botStatus.disconnect : t.botStatus.connect}
      </button>
      {errorMessage && (
        <span className="text-[11px] font-mono text-red truncate max-w-full" title={errorMessage}>
          {errorMessage}
        </span>
      )}
    </form>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
