import { useState, useEffect } from 'react';

export default function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.sessionStorage.getItem(key);
    return stickyValue !== null
      ? JSON.parse(stickyValue)
      : defaultValue;
  });

  useEffect(() => {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
