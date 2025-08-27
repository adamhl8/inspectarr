import type { Result } from "ts-explicit-errors"
import { err, isErr } from "ts-explicit-errors"

import { ArrClient } from "~/arr-client/arr-client.ts"
import type { SonarrMediaData, SonarrOptions } from "~/cli/sonarr.ts"
import type { paths } from "~/generated/sonarr-schema.js"
import { formatSize, getRawResolution } from "~/utils.ts"

type SonarrAllMedia = paths["/api/v3/series"]["get"]["responses"]["200"]["content"]["application/json"]
type SonarrSeries = SonarrAllMedia[number]

type SeriesEpisodes = paths["/api/v3/episode"]["get"]["responses"]["200"]["content"]["application/json"]
type SeriesEpisode = SeriesEpisodes[number] | undefined
type SeasonArray = SeriesEpisode[] | undefined

/**
 * Represents an array of SeasonArray, where the index represents the season number.
 * Similarly, each SeasonArray represents an array of episodes, where the index represents the episode number.
 *
 * Seasons/episodes are not guaranteed to be in any particular order, so by creating an array where the index represents the season/episode number, we naturally get the correct order.
 *
 * Missing seasons/episodes will be `undefined`, which gives us a good way to detect when they're missing.
 *
 * @example
 * ```ts
 * const seasonsArray: SeasonsArray = [
 *   undefined, // this is season 0, usually undefined
 *   [undefined, { title: "Episode 1" }, { title: "Episode 2" }], // this is season 1 (episode 0 will usually be undefined)
 *   [{ title: "Episode 0" }, { title: "Episode 1" }, { title: "Episode 2" }], // this is season 2
 * ]
 * ```
 */
type SeasonsArray = SeasonArray[]

type SeriesBySeason = { series: SonarrSeries; seasons: SeasonsArray }

// The following helper functions help us extract specific information from a series/season/episode.

const seriesTitle = (series: SonarrSeries) => series.title
const seriesYear = (series: SonarrSeries) => series.year
const seasonIdentifier = (seasonNumber: number) => seasonNumber.toString().padStart(2, "0")
const episodeIdentifier = (episode?: SeriesEpisode) => episode?.episodeNumber?.toString().padStart(2, "0")
const seriesType = (series: SonarrSeries) => series.seriesType
const episodeReleaseGroup = (episode?: SeriesEpisode) => episode?.episodeFile?.releaseGroup
const episodeSource = (episode?: SeriesEpisode) => episode?.episodeFile?.quality?.quality?.source
const episodeVideoCodec = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.videoCodec
const episodeAudioCodec = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.audioCodec
const episodeAudioChannels = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.audioChannels
const episodeResolution = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.resolution
const episodeRawResolution = (episode?: SeriesEpisode) => getRawResolution(episode?.episodeFile?.mediaInfo?.resolution)
const rawEpisodeSize = (episode?: SeriesEpisode) => episode?.episodeFile?.size
const episodeSize = (episode?: SeriesEpisode) => formatSize(rawEpisodeSize(episode))

const getTotalSize = (seasons: SeasonsArray, raw = false) => {
  const isEveryEpisodeSizeUndefined = seasons.every((season) =>
    season?.every((episode) => episode?.episodeFile?.size === undefined),
  )
  if (isEveryEpisodeSizeUndefined) return

  const rawTotalSize = gatherEpisodeData(seasons, rawEpisodeSize)
    .filter((size) => size !== undefined)
    .reduce((acc, size) => acc + size, 0)

  return raw ? rawTotalSize : formatSize(rawTotalSize)
}

/**
 * Takes a SeasonsArray and iterates through each season and episode, applying the provided episode function to each episode.
 *
 * Returns a flat array of data returned by the episode function.
 */
const gatherEpisodeData = <T>(seasons: SeasonsArray, episodeFn: (episode: SeriesEpisode) => T) =>
  seasons.flatMap((season) => season?.map(episodeFn)).filter(Boolean)

export class SonarrClient extends ArrClient {
  readonly #options: SonarrOptions

  public constructor(baseUrl: string, apiKey: string, options: SonarrOptions) {
    super("Sonarr", baseUrl, apiKey)
    this.#options = options
  }

  public async getAllMedia(): Promise<Result<SonarrAllMedia>> {
    return await this.makeRequest<SonarrAllMedia>("series")
  }

  private async getAllEpisodesForSeries(series: SonarrSeries): Promise<Result<SeriesEpisodes>> {
    if (!series.id) return err(`series id is missing for series '${series.title}'`)
    const episodes = await this.makeRequest<SeriesEpisodes>(`episode?seriesId=${series.id}&includeEpisodeFile=true`)
    if (isErr(episodes)) return err(`failed to get episode data for series '${series.title}' (${series.id})`, episodes)
    return episodes
  }

  private async getAllSeriesBySeason(): Promise<Result<SeriesBySeason[]>> {
    const allMedia = await this.getAllMedia()
    if (isErr(allMedia)) return err("failed to get sonarr media", allMedia)

    const allSeriesBySeason: SeriesBySeason[] = []

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ignore
    const processSeries = async (series: SonarrSeries) => {
      const episodes = await this.getAllEpisodesForSeries(series)
      if (isErr(episodes)) return episodes

      const seasons: SeasonArray[] = []
      for (const episode of episodes) {
        let { hasFile, seasonNumber, episodeNumber, absoluteEpisodeNumber } = episode
        if (!hasFile) continue

        // if both the seasonNumber and episodeNumber are undefined, this is probably a series of type 'daily', in which case we use the absoluteEpisodeNumber
        if (seasonNumber === undefined && episodeNumber === undefined) {
          seasonNumber = 0
          episodeNumber = absoluteEpisodeNumber ?? 0
        }

        if (seasonNumber === undefined || episodeNumber === undefined)
          return err(
            `Unexpected invalid episode data for series '${series.title}': ${JSON.stringify(series, null, 2)} ${JSON.stringify(episode, null, 2)}`,
          )

        seasons[seasonNumber] ??= []
        const season = seasons[seasonNumber]
        if (!season) return
        season[episodeNumber] = episode
      }

      const seriesBySeason: SeriesBySeason = { series, seasons }
      allSeriesBySeason.push(seriesBySeason)

      return
    }

    const processSeriesPromises = allMedia.map(async (series) => processSeries(series))
    const processSeriesResults = await Promise.all(processSeriesPromises)
    for (const result of processSeriesResults) {
      if (isErr(result)) return err("failed to process series", result)
    }

    return allSeriesBySeason
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: it's more clear if we keep all of this in one function
  public async getMediaData() {
    const allSeriesBySeason = await this.getAllSeriesBySeason()
    if (isErr(allSeriesBySeason)) return allSeriesBySeason

    const data: SonarrMediaData = []

    if (this.#options.byEpisode) {
      for (const { series, seasons } of allSeriesBySeason) {
        for (const [seasonNumber, season] of seasons.entries()) {
          if (!season) continue
          for (const episode of season) {
            if (!episode) continue
            data.push({
              title: seriesTitle(series),
              year: seriesYear(series),
              season: seasonIdentifier(seasonNumber),
              episode: episodeIdentifier(episode),
              type: seriesType(series),
              monitored: episode?.monitored,
              releaseGroup: episodeReleaseGroup(episode),
              source: episodeSource(episode),
              videoCodec: episodeVideoCodec(episode),
              audioCodec: episodeAudioCodec(episode),
              audioChannels: episodeAudioChannels(episode),
              resolution: episodeResolution(episode),
              rawResolution: episodeRawResolution(episode),
              size: episodeSize(episode),
              rawSize: rawEpisodeSize(episode),
            })
          }
        }
      }
    } else if (this.#options.bySeason) {
      for (const { series, seasons } of allSeriesBySeason) {
        for (const [seasonNumber, season] of seasons.entries()) {
          if (!season) continue
          data.push({
            title: seriesTitle(series),
            year: seriesYear(series),
            season: seasonIdentifier(seasonNumber),
            type: seriesType(series),
            monitored: series.seasons?.find((seasonElement) => seasonElement.seasonNumber === seasonNumber)?.monitored,
            releaseGroup: gatherEpisodeData([season], episodeReleaseGroup),
            source: gatherEpisodeData([season], episodeSource),
            videoCodec: gatherEpisodeData([season], episodeVideoCodec),
            audioCodec: gatherEpisodeData([season], episodeAudioCodec),
            audioChannels: gatherEpisodeData([season], episodeAudioChannels),
            resolution: gatherEpisodeData([season], episodeResolution),
            rawResolution: gatherEpisodeData([season], episodeRawResolution),
            size: getTotalSize([season]),
            rawSize: getTotalSize([season], true),
          })
        }
      }
    } else {
      for (const { series, seasons } of allSeriesBySeason) {
        if (seasons.flat().length === 0) continue
        data.push({
          title: seriesTitle(series),
          year: seriesYear(series),
          type: seriesType(series),
          monitored: series.monitored,
          releaseGroup: gatherEpisodeData(seasons, episodeReleaseGroup),
          source: gatherEpisodeData(seasons, episodeSource),
          videoCodec: gatherEpisodeData(seasons, episodeVideoCodec),
          audioCodec: gatherEpisodeData(seasons, episodeAudioCodec),
          audioChannels: gatherEpisodeData(seasons, episodeAudioChannels),
          resolution: gatherEpisodeData(seasons, episodeResolution),
          rawResolution: gatherEpisodeData(seasons, episodeRawResolution),
          size: getTotalSize(seasons),
          rawSize: getTotalSize(seasons, true),
        })
      }
    }

    return data
  }
}
