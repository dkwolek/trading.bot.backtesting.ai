import { useState } from 'react';
import { clearCache } from '../../../services/candle-cache';
import t from '../../../locales';

export default function ClearCacheButton() {
  const [cleared, setCleared] = useState(false);

  async function handleClick() {
    await clearCache();
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className="text-[9px] text-muted hover:text-text transition-colors text-left"
    >
      {cleared ? t.cache.cleared : t.cache.clear}
    </button>
  );
}
