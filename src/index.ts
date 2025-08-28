import process from "node:process"
import type { Result } from "ts-explicit-errors"
import { attempt, err, isErr } from "ts-explicit-errors"

import { getServiceInfo } from "~/cli/cli.ts"
import type { JsonifiableMediaData } from "~/cli/types.ts"
import { formatSize } from "~/utils.ts"

function getStats(mediaData: JsonifiableMediaData) {
  const totalMedia = mediaData.length
  const totalSize = mediaData.reduce((acc, media) => acc + ((media.rawSize as number) ?? 0), 0)

  return `${totalMedia} media entries with a size of ${formatSize(totalSize)}`
}

async function inspectarr(): Promise<Result> {
  const { client, filterql, query, logger } = getServiceInfo()

  logger.info("Fetching media...")
  const mediaData = await client.getNormalizedMediaData()
  if (isErr(mediaData)) return mediaData

  const filteredMedia = attempt(() => filterql.query(mediaData, query))
  if (isErr(filteredMedia)) return err(`failed to filter media with query '${query}'`, filteredMedia)

  if (!process.env["IS_VHS_DEMO"]) {
    logger.info(`${client.name} has: ${getStats(mediaData)}`)
    // only display query stats if they're actually different
    if (mediaData.length !== filteredMedia.length) logger.info(`The query matched: ${getStats(filteredMedia)}`)
  }

  if (filteredMedia.length === 0) return

  logger.info("")
  logger.printMediaData(filteredMedia)
}

async function main(): Promise<number> {
  const result = await inspectarr()
  if (isErr(result)) {
    console.error(result.messageChain)
    return 1
  }
  return 0
}

process.exitCode = await main()
