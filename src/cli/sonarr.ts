import { command, merge, object, option, message } from "@optique/core"
import type { InferValue } from "@optique/core"
import type { Schema } from "filterql"
import { objectKeys } from "ts-extras"
import type { SetOptional } from "type-fest"

import { baseSchema } from "#cli/base-fields.ts"
import { getBaseCommandParser } from "#cli/base-options.ts"
import type { SchemaToType, ToMediaData } from "#cli/types.ts"

const sonarrOptions = object("Sonarr options", {
  bySeason: option("--by-season", {
    description: message`Display media by individual season`,
  }),
  byEpisode: option("--by-episode", {
    description: message`Display media by individual episode`,
  }),
})
export type SonarrOptions = InferValue<typeof sonarrOptions>

const baseParser = getBaseCommandParser("sonarr")
export const sonarrCommand = command("sonarr", merge(sonarrOptions, baseParser))

const sonarrHiddenFields = {
  type: {
    type: "string",
  },
} as const satisfies Schema
export const sonarrHiddenFieldKeys = objectKeys(sonarrHiddenFields)

export const sonarrSchema = {
  ...baseSchema,
  ...sonarrHiddenFields,
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
