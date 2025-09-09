import { command } from "@optique/core/parser"
import type { Schema } from "filterql"

import { baseSchema } from "~/cli/base-fields.ts"
import { getBaseCommandParser } from "~/cli/base-options.ts"
import type { SchemaToType, ToMediaData } from "~/cli/types.ts"

export const radarrSchema = {
  ...baseSchema,
} as const satisfies Schema

const baseParser = getBaseCommandParser("radarr")
export const radarrCommand = command("radarr", baseParser)

export type RadarrSchema = typeof radarrSchema
type RadarrSchemaToType = SchemaToType<RadarrSchema>
export type RadarrMediaData = ToMediaData<RadarrSchemaToType>
