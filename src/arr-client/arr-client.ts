import { uniq } from "es-toolkit"
import ky from "ky"
import type { Result } from "ts-explicit-errors"
import { attempt, err, isErr } from "ts-explicit-errors"
import type { Entries } from "type-fest"

import type { JsonifiableMediaData, MediaData } from "~/cli/types.ts"

export abstract class ArrClient {
  public name: string
  readonly #baseUrl: string
  readonly #apiKey: string

  public constructor(name: string, baseUrl: string, apiKey: string) {
    this.name = name
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

    const normalizedMediaData: JsonifiableMediaData = mediaData.map((dataObject) => {
      const dataObjectEntries = Object.entries(dataObject) as Entries<typeof dataObject>
      const normalizedDataObjectEntries = dataObjectEntries.map(([key, value]) => {
        if (Array.isArray(value)) {
          const uniqueString = uniq(value).join(",").trim()
          return [key, uniqueString || null] // empty arrays should be null
        }
        if (typeof value === "string") return [key, value.trim()]
        if (value === undefined) return [key, null]
        return [key, value]
      })

      return Object.fromEntries(normalizedDataObjectEntries)
    })

    return normalizedMediaData
  }
}
