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

  const ast = attempt(() => filterql.parse(query))
  if (isErr(ast)) return err(`failed to parse query '${query}'`, ast)

  const filteredMedia = attempt(() => filterql.applyFilter(mediaData, ast.filter))
  if (isErr(filteredMedia)) return err(`failed to filter media with query '${query}'`, filteredMedia)

  // don't apply EXCLUDE operation if output is JSON
  const operations =
    logger.options.output === "json" ? ast.operations.filter(({ name }) => name !== "EXCLUDE") : ast.operations

  const transformedMedia = attempt(() => filterql.applyOperations(filteredMedia, operations))
  if (isErr(transformedMedia)) return err(`failed to apply operations to media with query '${query}'`, transformedMedia)

  if (!process.env["IS_VHS_DEMO"]) {
    logger.info(`${client.name} has: ${getStats(mediaData)}`)
    // only display query stats if they're actually different
    if (mediaData.length !== transformedMedia.length) logger.info(`The query matched: ${getStats(transformedMedia)}`)
  }

  if (transformedMedia.length === 0) return

  logger.info("")
  logger.printMediaData(transformedMedia)
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
