/**
 * useDebounce - Delays updating a value until after a specified wait period
 * @module hooks/useDebounce
 */

import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of the given value that only updates after the
 * specified delay has elapsed since the last change.
 *
 * @param value  - The value to debounce
 * @param delay  - Delay in milliseconds (default: 300)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
