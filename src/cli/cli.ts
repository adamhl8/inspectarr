import { message, text } from "@optique/core/message"
import { or } from "@optique/core/parser"
import type { RunOptions } from "@optique/run"
import { run } from "@optique/run"
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
import { Logger } from "~/logger.ts"

interface ServiceInfo {
  client: ArrClient
  filterql: FilterQL
  query: string
  logger: Logger
}

export function getServiceInfo(): ServiceInfo {
  const parser = or(radarrCommand, sonarrCommand)
  const runOptions: RunOptions = {
    programName: "inspectarr",
    brief: message`Inspectarr (v${text(packageJson.version)}) - ${text(packageJson.description)}`,
    help: "both",
    version: packageJson.version,
    showDefault: { prefix: " [default: " },
  }
  const parseResult = run(parser, runOptions)

  const { command: serviceName, url, apiKey: serviceApiKey, query = "", all, output, quiet, shortHeaders } = parseResult
  const serviceUrl = url?.href

  let client: ArrClient
  let schema: RadarrSchema | SonarrSchema
  if (serviceName === "radarr") {
    client = new RadarrClient(serviceUrl, serviceApiKey)
    schema = radarrSchema
  } else {
    const { bySeason, byEpisode } = parseResult
    client = new SonarrClient(serviceUrl, serviceApiKey, { bySeason, byEpisode })
    schema = sonarrSchema
  }
  const filterql = new FilterQL({ schema, customOperations })

  const resolvedQuiet = output === "json" ? true : quiet
  const logger = new Logger({ all, output, quiet: resolvedQuiet, shortHeaders }, schema)

  return {
    client,
    filterql,
    query,
    logger,
  }
}
