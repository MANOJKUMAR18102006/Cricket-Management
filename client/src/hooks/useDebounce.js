import { useState, useEffect } from 'react';

/**
 * useDebounce hook to delay value updates
 * @param {any} value Value to debounce
 * @param {number} delay Delay in milliseconds (default 350ms)
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
