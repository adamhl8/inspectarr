import { command } from "cleye"
import type { Schema } from "filterql"
import type { SetOptional } from "type-fest"

import { baseFlags, baseParameters, baseSchema } from "~/cli/shared.ts"
import type { Flags, FlagsToType, SchemaToType, ToMediaData } from "~/cli/types.ts"

const sonarrOptionFlags = {
  byEpisode: {
    type: Boolean,
    default: false,
    description: "Display media by individual episode",
  },
  bySeason: {
    type: Boolean,
    default: false,
    description: "Display media by individual season",
  },
} as const satisfies Flags
export type SonarrOptions = FlagsToType<typeof sonarrOptionFlags>

export const sonarrCommand = command({
  name: "sonarr",
  flags: {
    ...baseFlags,
    ...sonarrOptionFlags,
  },
  parameters: [...baseParameters],
})

export const sonarrSchema = {
  ...baseSchema,
  type: {
    type: "string",
  },
  season: {
    type: "number",
    alias: "s",
  },
  episode: {
    type: "number",
    alias: "e",
  },
} as const satisfies Schema

export type SonarrSchema = typeof sonarrSchema
type SonarrSchemaOptional = SetOptional<SonarrSchema, "season" | "episode">
type SonarrSchemaToType = SchemaToType<SonarrSchemaOptional>
export type SonarrMediaData = ToMediaData<SonarrSchemaToType>
