import process from "node:process"
import type { Schema } from "filterql"

import type { CliParameters, FlagResult, Flags, FlagsToType } from "~/cli/types.ts"

const serviceName = process.argv[2]?.toUpperCase() || "<SERVICE>"

const clientFlags = {
  url: {
    type: String,
    description: `The URL of the instance (default: the "${serviceName}_URL" environment variable)`,
  },
  apiKey: {
    type: String,
    description: `The API key for the instance (default: the "${serviceName}_API_KEY" environment variable)`,
  },
} as const satisfies Flags

const outputTypes = ["md", "json"] as const
type OutputType = (typeof outputTypes)[number]
// we validate that this is actually a valid output type in cli.ts
const Output = (outputType: OutputType): FlagResult<OutputType> => {
  if (!outputType.trim()) return { value: "md" }
  if (!outputTypes.includes(outputType)) return { error: `Invalid output type '${outputType}'` }
  return { value: outputType }
}

const outputFlags = {
  output: {
    type: Output,
    description: 'The type of output to generate ("json" implies --quiet)',
    placeholder: "<md|json>",
    default: "md",
  },
  quiet: {
    type: Boolean,
    description: "Suppress all output except the markdown/JSON",
    default: false,
  },
  shortHeaders: {
    type: Boolean,
    description: "Use the field aliases as the markdown table headers (can help reduce the width of the table)",
    default: false,
  },
} as const satisfies Flags
export type OutputFlags = FlagsToType<typeof outputFlags>

export const baseFlags = {
  ...clientFlags,
  ...outputFlags,
} as const satisfies Flags

export const baseParameters = ["[query]"] as const satisfies CliParameters

export const baseSchema = {
  title: { type: "string", alias: "t" },
  monitored: { type: "boolean", alias: "m" },
  releaseGroup: { type: "string", alias: "rg" },
  source: { type: "string", alias: "src" },
  videoCodec: { type: "string", alias: "vc" },
  audioCodec: { type: "string", alias: "ac" },
  resolution: { type: "string", alias: "rs" },
  size: { type: "string", alias: "sz" },
} as const satisfies Schema

/**
 * These are extra properties we want to attach to the data, but don't want to be displayed/queryable.
 */
const extraDataProperties = {
  rawResolution: 0,
  rawSize: 0,
} as const
export type ExtraDataProperties = typeof extraDataProperties
export const extraDataPropertiesKeys = Object.keys(extraDataProperties) as (keyof ExtraDataProperties)[]
