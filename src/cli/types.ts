import type { Schema } from "filterql"
import type { JsonPrimitive, SimplifyDeep } from "type-fest"

import type { RadarrMediaData } from "~/cli/radarr.ts"
import type { SonarrMediaData } from "~/cli/sonarr.ts"

/**
 * Converts a FilterQL schema type to a type with the same keys mapped to their `type` strings.
 *
 * @example
 * ```ts
 * const schema = {
 *   title: { type: "string" },
 *   size: { type: "number" }
 *   monitored: { type: "boolean" },
 * } as const satisfies Schema
 *
 * type SchemaType = SchemaToType<typeof schema>
 * // {
 * //   title: string
 * //   size: number
 * //   monitored: boolean
 * // }
 * ```
 */
export type SchemaToType<T extends Schema> = {
  [K in keyof T]: NonNullable<T[K]> extends { type: infer U }
    ? U extends "string"
      ? string
      : U extends "number"
        ? number
        : U extends "boolean"
          ? boolean
          : unknown
    : unknown
}

type KeysOf<T> = T extends T ? keyof T : never

type MediaDataValue = JsonPrimitive | undefined
type MediaDataValueOrArray = MediaDataValue | MediaDataValue[]

/**
 * This type is used to represent the data array we build in the `getMediaData` method of the respective client.
 *
 * In general, the data returned by radarr/sonarr may be `undefined`. Ultimately, the data returned by `getMediaData` needs to be jsonifiable (no `undefined`), which we handle *after* the data array is built via the `normalizeMediaData` function.
 *
 * We allow `undefined` for values in each data object because it makes it much easier to build the data array.
 */
export type ToMediaData<T> = {
  [K in keyof T]: MediaDataValueOrArray
}[]

export type MediaData = SimplifyDeep<RadarrMediaData | SonarrMediaData>

export type AllMediaDataKeys = KeysOf<MediaData[number]>

/**
 * This type represents the jsonifiable data array we build in the `normalizeMediaData` function.
 *
 * This is what we filter against and thus what is used for the output.
 */
export type JsonifiableMediaData = SimplifyDeep<Record<AllMediaDataKeys, JsonPrimitive>[]>
