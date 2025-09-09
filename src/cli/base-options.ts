import process from "node:process"
import { envVar, message, optionName, text, value } from "@optique/core/message"
import type { InferValue } from "@optique/core/parser"
import { argument, constant, merge, object, option, optional, withDefault } from "@optique/core/parser"
import { choice, string, url } from "@optique/core/valueparser"
import { capitalize } from "es-toolkit/string"

type ServiceName = "radarr" | "sonarr"

const serviceOptions = (serviceName: ServiceName) => {
  const serviceUrlEnvVar = `${serviceName.toUpperCase()}_URL`
  const serviceApiKeyEnvVar = `${serviceName.toUpperCase()}_API_KEY`

  return object("Service options", {
    url: withDefault(
      option("--url", url(), {
        description: message`The URL of the ${text(capitalize(serviceName))} instance`,
      }),
      () => {
        const serviceUrlEnvValue = process.env[serviceUrlEnvVar]
        if (!serviceUrlEnvValue)
          throw new Error(
            `A ${capitalize(serviceName)} URL is required. Provide via '--url' option or '${serviceUrlEnvVar}' environment variable.`,
          )
        return new URL(serviceUrlEnvValue)
      },
      { message: message`${envVar(serviceUrlEnvVar)} environment variable` },
    ),
    apiKey: withDefault(
      option("--api-key", string({ metavar: "API_KEY" }), {
        description: message`The API key of the ${text(capitalize(serviceName))} instance`,
      }),
      () => {
        const serviceApiKeyEnvValue = process.env[serviceApiKeyEnvVar]
        if (!serviceApiKeyEnvValue)
          throw new Error(
            `A ${capitalize(serviceName)} API key is required. Provide via '--api-key' option or '${serviceApiKeyEnvVar}' environment variable.`,
          )
        return serviceApiKeyEnvValue
      },
      { message: message`${envVar(serviceApiKeyEnvVar)} environment variable` },
    ),
  })
}

const outputOptions = object("Output options", {
  all: option("--all", {
    description: message`Show fields that are hidden by default in the markdown table`,
  }),
  output: withDefault(
    option("--output", choice(["md", "json"], { caseInsensitive: true, metavar: "md|json" }), {
      description: message`The type of output to generate (${value("json")} implies ${optionName("--quiet")})`,
    }),
    "md",
  ),
  quiet: option("--quiet", {
    description: message`Suppress all output except the markdown/JSON`,
  }),
  shortHeaders: option("--short-headers", {
    description: message`Use the field aliases as the markdown table headers (can help reduce the width of the table)`,
  }),
})
export type OutputOptions = InferValue<typeof outputOptions>

const baseArguments = object({
  query: optional(argument(string({ metavar: "QUERY" }), { description: message`The FilterQL query` })),
})

export function getBaseCommandParser<T extends ServiceName>(commandName: T) {
  const commandConstant = object({ command: constant(commandName) })
  const baseOptions = merge(serviceOptions(commandName), outputOptions)

  const baseParser = merge(commandConstant, baseOptions, baseArguments)
  return baseParser
}
