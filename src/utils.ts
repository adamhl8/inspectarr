import type { DataObject } from "filterql"
import type { Simplify } from "type-fest"

/**
 * Creates a new object with specified keys removed
 * @param obj The source object
 * @param keysToRemove Array of keys to exclude from the result
 * @returns A new object without the specified keys
 */
export function omit<T extends DataObject, K extends keyof T>(obj: T, keysToRemove: K[]): Simplify<Omit<T, K>> {
  const keysSet = new Set(keysToRemove)
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keysSet.has(key as K))) as Omit<T, K>
}
