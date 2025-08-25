import ky from "ky"
import type { Result } from "ts-explicit-errors"
import { attempt, err, isErr } from "ts-explicit-errors"
import type { Entries, JsonPrimitive } from "type-fest"

import type { JsonifiableMediaData, JsonifiableMediaDataObject, MediaData } from "~/cli/types.ts"

export abstract class ArrClient {
  readonly #baseUrl: string
  readonly #apiKey: string

  public constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    this.#apiKey = apiKey
  }

  public async makeRequest<T>(endpoint: string): Promise<Result<T>> {
    const prefixUrl = `${this.#baseUrl}/api/v3`
    const headers = {
      "X-Api-Key": this.#apiKey,
      Accept: "application/json",
    }

    const response = await attempt(() => ky(endpoint, { prefixUrl, headers, retry: 2 }))
    if (isErr(response)) return err(`failed to make request to '${endpoint}'`, response)

    const data = await attempt(() => response.json<T>())
    if (isErr(data)) return err(`failed to parse JSON response from '${endpoint}'`, data)

    return data
  }

  public abstract getAllMedia(): Promise<Result<unknown[]>>

  public abstract getMediaData(): Promise<Result<MediaData>>

  public async getNormalizedMediaData(): Promise<Result<JsonifiableMediaData>> {
    const mediaData = await this.getMediaData()
    if (isErr(mediaData)) return err("failed to get media data", mediaData)

    const unique = (arr: unknown[] | undefined) => [...new Set(arr)].join(",").trim()

    const normalizedMediaData: JsonifiableMediaData = []

    for (const entry of mediaData) {
      const mediaDataObject: JsonifiableMediaDataObject = {}
      for (const [key, value] of Object.entries(entry) as Entries<typeof entry>) {
        let normalizedValue: JsonPrimitive

        if (Array.isArray(value)) {
          const uniqueString = unique(value)
          normalizedValue = uniqueString || null // empty arrays should be null
        } else if (typeof value === "string") normalizedValue = value.trim()
        else if (value === undefined) normalizedValue = null
        else normalizedValue = value

        mediaDataObject[key] = normalizedValue
      }
      normalizedMediaData.push(mediaDataObject)
    }

    return normalizedMediaData
  }
}
