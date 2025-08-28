import process from "node:process"
import { cli } from "cleye"
import { FilterQL } from "filterql"
import packageJson from "package.json" with { type: "json" }

import type { ArrClient } from "~/arr-client/arr-client.ts"
import { RadarrClient } from "~/arr-client/radarr-client.ts"
import { SonarrClient } from "~/arr-client/sonarr-client.ts"
import { customOperations } from "~/cli/filterql-operations.ts"
import type { RadarrSchema } from "~/cli/radarr.ts"
import { radarrCommand, radarrSchema } from "~/cli/radarr.ts"
import type { SonarrSchema } from "~/cli/sonarr.ts"
import { sonarrCommand, sonarrSchema } from "~/cli/sonarr.ts"
import { handleFlagResult } from "~/cli/types.ts"
import { Logger } from "~/logger.ts"

interface CommandInfo {
  client: ArrClient
  filterql: FilterQL
  query: string
  logger: Logger
}

export function getServiceInfo(): CommandInfo {
  const args = cli({
    commands: [radarrCommand, sonarrCommand],
    name: "Inspectarr",
    version: packageJson.version,
    help: { description: packageJson.description },
  })
  function showHelpAndExit(message: string): never {
    console.error(message)
    args.showHelp()
    process.exit(1)
  }

  const serviceName = args.command
  if (!(serviceName && (serviceName === "radarr" || serviceName === "sonarr"))) showHelpAndExit("Invalid command")

  const serviceUrlEnvKey = `${serviceName.toUpperCase()}_URL`
  const serviceApiKeyEnvKey = `${serviceName.toUpperCase()}_API_KEY`
  const serviceUrl = args.flags.url || process.env[serviceUrlEnvKey]
  const serviceApiKey = args.flags.apiKey || process.env[serviceApiKeyEnvKey]

  if (!serviceUrl)
    showHelpAndExit(
      `${serviceName} URL is required. Provide via --url flag or ${serviceUrlEnvKey} environment variable.`,
    )
  if (!serviceApiKey)
    showHelpAndExit(
      `${serviceName} API key is required. Provide via --api-key flag or ${serviceApiKeyEnvKey} environment variable.`,
    )

  let client: ArrClient
  let schema: RadarrSchema | SonarrSchema
  if (serviceName === "radarr") {
    client = new RadarrClient(serviceUrl, serviceApiKey)
    schema = radarrSchema
  } else {
    client = new SonarrClient(serviceUrl, serviceApiKey, args.flags)
    schema = sonarrSchema
  }
  const filterql = new FilterQL({ schema, customOperations })
  const query = Object.hasOwn(args._, "query") ? (args._.query ?? "") : ""

  let { output, quiet, shortHeaders, all } = args.flags
  const outputResult = handleFlagResult(output, showHelpAndExit)
  if (outputResult === "json") quiet = true
  const logger = new Logger({ output: outputResult, quiet, shortHeaders, all }, schema)

  return {
    client,
    filterql,
    query,
    logger,
  }
}
