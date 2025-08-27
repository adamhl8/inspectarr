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

export function formatQualifiedValue(primary: unknown, secondary: unknown, tertiary?: unknown): string {
  return `${tertiary ? `[${tertiary}] ` : ""}${primary ?? ""}${secondary ? ` (${secondary})` : ""}`.trim()
}

export function formatSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) return
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${units[i]}`
}

export function getRawResolution(resolution: string | null | undefined): number | undefined {
  if (resolution === undefined || resolution === null) return

  // "1920x1080,720x480" -> [[1920, 1080], [720, 480]]
  const resolutionList = resolution.split(",")
  const resolutionPairs = resolutionList.map((res) => res.split("x").map(Number))

  const totals = resolutionPairs.map(([width = 1, height = 1]) => width * height)
  const average = totals.reduce((acc, curr) => acc + curr, 0) / totals.length
  return average
}
