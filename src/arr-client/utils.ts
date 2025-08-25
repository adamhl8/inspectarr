export function formatSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) return
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${units[i]}`
}

export function formatQualifiedValue(primary: unknown, secondary: unknown, tertiary?: unknown): string {
  return `${tertiary ? `[${tertiary}] ` : ""}${primary ?? ""}${secondary ? ` (${secondary})` : ""}`.trim()
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
