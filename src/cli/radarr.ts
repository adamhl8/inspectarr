import { command } from "cleye"
import type { Schema } from "filterql"

import type { ExtraDataProperties } from "~/cli/shared.ts"
import { baseFlags, baseParameters, baseSchema } from "~/cli/shared.ts"
import type { SchemaToType, ToMediaData } from "~/cli/types.ts"

export const radarrCommand = command({
  name: "radarr",
  flags: {
    ...baseFlags,
  },
  parameters: [...baseParameters],
})

export const radarrSchema = {
  ...baseSchema,
} as const satisfies Schema

export type RadarrSchema = typeof radarrSchema
type RadarrSchemaToType = SchemaToType<RadarrSchema>
export type RadarrMediaData = ToMediaData<RadarrSchemaToType & ExtraDataProperties>
