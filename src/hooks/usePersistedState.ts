import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

/**
 * Wraps useState so the value is persisted to localStorage under `key`.
 * `validate` is called on the stored value to confirm it matches the expected
 * shape — bad or missing data falls back to `defaultValue`.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return defaultValue;
      }
      const parsed = JSON.parse(raw);
      return validate(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Quota or serialization error — ignore, next save may succeed
    }
  }, [key, state]);

  return [state, setState];
}
