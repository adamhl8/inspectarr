import process from "node:process"

import {
  argument,
  choice,
  constant,
  envVar,
  merge,
  message,
  object,
  option,
  optional,
  optionName,
  string,
  text,
  url,
  value,
  withDefault,
} from "@optique/core"
import type { InferValue } from "@optique/core"
import { capitalize } from "es-toolkit/string"

type ServiceName = "radarr" | "sonarr"

const serviceOptions = (serviceName: ServiceName) => {
  const serviceLabel = capitalize(serviceName)
  const serviceUrlEnvVar = `${serviceName.toUpperCase()}_URL`
  const serviceApiKeyEnvVar = `${serviceName.toUpperCase()}_API_KEY`

  const urlOption = option("--url", url(), {
    description: message`The URL of the ${text(serviceLabel)} instance`,
  })
  const urlDefault = () => {
    const serviceUrlEnvValue = process.env[serviceUrlEnvVar]
    if (!serviceUrlEnvValue) {
      throw new Error(
        `A ${serviceLabel} URL is required. Provide via '--url' option or '${serviceUrlEnvVar}' environment variable.`,
      )
    }
    return new URL(serviceUrlEnvValue)
  }
  const urlDefaultMessage = message`${envVar(serviceUrlEnvVar)} environment variable`

  const apiKeyOption = option("--api-key", string({ metavar: "API_KEY" }), {
    description: message`The API key of the ${text(serviceLabel)} instance`,
  })
  const apiKeyDefault = () => {
    const serviceApiKeyEnvValue = process.env[serviceApiKeyEnvVar]
    if (!serviceApiKeyEnvValue) {
      throw new Error(
        `A ${serviceLabel} API key is required. Provide via '--api-key' option or '${serviceApiKeyEnvVar}' environment variable.`,
      )
    }
    return serviceApiKeyEnvValue
  }
  const apiKeyDefaultMessage = message`${envVar(serviceApiKeyEnvVar)} environment variable`

  return object("Service options", {
    url: withDefault(urlOption, urlDefault, { message: urlDefaultMessage }),
    apiKey: withDefault(apiKeyOption, apiKeyDefault, { message: apiKeyDefaultMessage }),
  })
}

const outputChoice = choice(["md", "json"], { caseInsensitive: true, metavar: "md|json" })
const outputOption = option("--output", outputChoice, {
  description: message`The type of output to generate (${value("json")} implies ${optionName("--quiet")})`,
})

const outputOptions = object("Output options", {
  all: option("--all", {
    description: message`Show fields that are hidden by default in the markdown table`,
  }),
  output: withDefault(outputOption, "md"),
  quiet: option("--quiet", {
    description: message`Suppress all output except the markdown/JSON`,
  }),
  shortHeaders: option("--short-headers", {
    description: message`Use the field aliases as the markdown table headers (can help reduce the width of the table)`,
  }),
})
export type OutputOptions = InferValue<typeof outputOptions>

const queryArgument = argument(string({ metavar: "QUERY" }), { description: message`The FilterQL query` })

const baseArguments = object({
  query: optional(queryArgument),
})

export const getBaseCommandParser = <T extends ServiceName>(commandName: T) => {
  const commandConstant = object({ command: constant(commandName) })
  const baseOptions = merge(serviceOptions(commandName), outputOptions)

  const baseParser = merge(commandConstant, baseOptions, baseArguments)
  return baseParser
}
