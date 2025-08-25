import process from "node:process"
import type { Result } from "ts-explicit-errors"
import { attempt, err, isErr } from "ts-explicit-errors"

import { getServiceInfo } from "~/cli/cli.ts"
import { extraDataPropertiesKeys } from "~/cli/shared.ts"
import { omit } from "~/utils.ts"

async function inspectarr(): Promise<Result> {
  const { client, filterql, query, logger } = getServiceInfo()

  logger.info("Fetching media...")
  const mediaData = await client.getNormalizedMediaData()
  if (isErr(mediaData)) return mediaData

  logger.info(`Total # of media entries: ${mediaData.length}`)

  const filteredMedia = attempt(() => filterql.filter(mediaData, query))
  if (isErr(filteredMedia)) return err(`failed to filter media with query '${query}'`, filteredMedia)

  if (query && !process.env["IS_VHS_DEMO"])
    logger.info(`Showing ${filteredMedia.length} media entries from query: '${query}'`)

  if (filteredMedia.length === 0) return

  const mediaDataToPrint = filteredMedia.map((dataObj) => omit(dataObj, extraDataPropertiesKeys))

  logger.info("")
  logger.printMediaData(mediaDataToPrint)
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
