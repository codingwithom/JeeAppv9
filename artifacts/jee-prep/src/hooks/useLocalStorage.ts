import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Do not double-prefix: if the caller already passes a jee_-prefixed key, use it as-is.
  // Previously the hook always prepended jee_, causing double-prefix like jee_jee_cal_events.
  const prefixedKey = key.startsWith("jee_") ? key : `jee_${key}`;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(prefixedKey);
      if (item !== null) return JSON.parse(item);

      // One-time auto-migration: if the caller passed a jee_-prefixed key, the old hook
      // would have stored it under jee_jee_<key>. Copy that data to the correct key.
      if (key.startsWith("jee_")) {
        const legacyKey = `jee_${key}`;
        const legacyItem = window.localStorage.getItem(legacyKey);
        if (legacyItem !== null) {
          try {
            window.localStorage.setItem(prefixedKey, legacyItem);
            window.localStorage.removeItem(legacyKey);
            return JSON.parse(legacyItem);
          } catch {
            return initialValue;
          }
        }
      }

      return initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(prefixedKey, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${prefixedKey}":`, error);
    }
  }, [prefixedKey, storedValue]);

  return [storedValue, setStoredValue] as const;
}
