import type { Schema } from "filterql"

/**
 * These are fields that we _always_ hide in the markdown output.
 */
const internalFields = {
  rawResolution: { type: "number" },
  rawSize: { type: "number" },
} as const satisfies Schema
export const internalFieldKeys = Object.keys(internalFields) as (keyof typeof internalFields)[]

/**
 * These are fields that are hidden by default in the markdown output unless the `-all` option is used.
 */
const hiddenFields = {
  qualityProfile: { type: "string", alias: "qp" },
  audioLanguage: { type: "string", alias: "al" },
  subtitleLanguage: { type: "string", alias: "sl" },
} as const satisfies Schema
export const hiddenFieldKeys = Object.keys(hiddenFields) as (keyof typeof hiddenFields)[]

/**
 * These are fields that are merged into another field in the markdown output.
 *
 * We do this to reduce the width of the table. For example, rather than having a column for 'year', we make the year part of the title.
 *
 * - year -> title (year)
 * - audioChannels -> audioCodec (audioChannels)
 */
const mergedFields = {
  year: { type: "number", alias: "y" },
  audioChannels: { type: "number", alias: "ach" },
} as const satisfies Schema
export const mergedFieldKeys = Object.keys(mergedFields) as (keyof typeof mergedFields)[]

export const baseSchema = {
  title: { type: "string", alias: "t" },
  monitored: { type: "boolean", alias: "m" },
  releaseGroup: { type: "string", alias: "rg" },
  source: { type: "string", alias: "src" },
  videoCodec: { type: "string", alias: "vc" },
  audioCodec: { type: "string", alias: "ac" },
  resolution: { type: "string", alias: "rs" },
  size: { type: "string", alias: "sz" },
  ...internalFields,
  ...hiddenFields,
  ...mergedFields,
} as const satisfies Schema
