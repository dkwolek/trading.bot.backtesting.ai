import { useState } from 'react';

interface Props {
  apiKey: string;
  apiSecret: string;
  onSave: (key: string, secret: string) => void;
}

export default function ApiKeys({ apiKey, apiSecret, onSave }: Props) {
  const [key, setKey] = useState(apiKey);
  const [secret, setSecret] = useState(apiSecret);
  const [visible, setVisible] = useState(false);

  const hasKeys = apiKey.length > 0 && apiSecret.length > 0;

  return (
    <div className="flex items-center gap-2 text-[10px]">
      {hasKeys && !visible ? (
        <>
          <span className="text-green flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            API Connected
          </span>
          <button
            onClick={() => setVisible(true)}
            className="text-muted hover:text-text transition-colors"
          >
            Edit
          </button>
        </>
      ) : (
        <>
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="API Key"
            className="w-40 px-2 py-1 bg-bg border border-border rounded-sm font-mono text-[10px] text-text outline-none focus:border-accent"
          />
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="API Secret"
            className="w-40 px-2 py-1 bg-bg border border-border rounded-sm font-mono text-[10px] text-text outline-none focus:border-accent"
          />
          <button
            onClick={() => {
              onSave(key, secret);
              setVisible(false);
            }}
            className="px-2 py-1 bg-accent text-white rounded-sm text-[10px] hover:opacity-80"
          >
            Save
          </button>
        </>
      )}
    </div>
  );
}
