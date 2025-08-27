import type { command } from "cleye"
import type { Schema } from "filterql"
import type { JsonPrimitive, Simplify, SimplifyDeep } from "type-fest"

import type { RadarrMediaData } from "~/cli/radarr.ts"
import type { SonarrMediaData } from "~/cli/sonarr.ts"

export type Flags = Parameters<typeof command>[0]["flags"]
export type CliParameters = Parameters<typeof command>[0]["parameters"]

/**
 * An object that contains the value of the flag or an error message
 *
 * We use this because we don't want to throw errors inside our custom type functions. This allows us to handle the errors later
 */
export type FlagResult<T> =
  | {
      value: T
      error?: never
    }
  | {
      value?: never
      error: string
    }

/**
 * Takes a FlagResult or the flag's default value
 *
 * If the result is a FlagResult, it returns the FlagResult's value or exits with the FlagResult's error message
 *
 * If the result is a default value, it returns the default value
 */
export function handleFlagResult<T, Default extends T>(
  result: Default | FlagResult<T>,
  exitFn: (message: string) => never,
): T | never {
  if (result && typeof result === "object") {
    if ("error" in result) exitFn(result.error)
    else if ("value" in result) return result.value
  }
  return result
}

/**
 * Converts a cleye `Flags` type to a type with the same keys mapped to their `type` property.
 *
 * @example
 * ```ts
 * const myFlags = {
 *   foo: {
 *     type: String,
 *   },
 *   bar: {
 *     type: Boolean,
 *   },
 * } as const satisfies Flags
 *
 * type MyFlags = FlagsToType<typeof myFlags>
 * // {
 * //   foo: string
 * //   bar: boolean
 * // }
 * ```
 */
export type FlagsToType<T extends Exclude<Flags, undefined>> = Simplify<{
  [K in keyof T]: T[K] extends { type: infer U }
    ? // biome-ignore lint/suspicious/noExplicitAny: args can't be of type unknown[] or else this doesn't infer the type properly
      U extends (...args: any[]) => infer R
      ? R extends FlagResult<infer V> // if R is a FlagResult, we want the type here to be the type of the FlagResult value
        ? V
        : R
      : unknown
    : unknown
}>

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
