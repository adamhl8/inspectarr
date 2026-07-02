import type { JsonPrimitive } from "type-fest"

/** Stringifies any value without ever producing "[object Object]", mapping null/undefined to "". */
export const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value.toString()
  return JSON.stringify(value)
}

export const formatQualifiedValue = (
  primary: JsonPrimitive | undefined,
  secondary: JsonPrimitive | undefined,
  tertiary?: JsonPrimitive,
): string => {
  const tertiaryPart = tertiary ? `[${stringifyValue(tertiary)}] ` : ""
  const primaryPart = stringifyValue(primary ?? "")
  const secondaryPart = secondary ? ` (${stringifyValue(secondary)})` : ""
  return `${tertiaryPart}${primaryPart}${secondaryPart}`.trim()
}

export const formatSize = (bytes: number | undefined): string | undefined => {
  if (bytes === undefined) return
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number((bytes / k ** i).toFixed(2))} ${units[i]}`
}

export const getRawResolution = (resolution: string | null | undefined): number | undefined => {
  if (resolution === undefined || resolution === null) return

  // "1920x1080,720x480" -> [[1920, 1080], [720, 480]]
  const resolutionList = resolution.split(",")
  const resolutionPairs = resolutionList.map((res) => res.split("x").map(Number))

  const totals = resolutionPairs.map(([width = 1, height = 1]) => width * height)
  const average = totals.reduce((acc, curr) => acc + curr, 0) / totals.length
  return average
}
