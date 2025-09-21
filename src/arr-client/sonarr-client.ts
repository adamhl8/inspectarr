import type { Result } from "ts-explicit-errors"
import { err, isErr } from "ts-explicit-errors"

import { ArrClient } from "~/arr-client/arr-client.ts"
import type { SonarrMediaData, SonarrOptions } from "~/cli/sonarr.ts"
import type { paths } from "~/generated/sonarr-schema.ts"
import { formatSize, getRawResolution } from "~/utils.ts"

type SonarrAllMedia = paths["/api/v3/series"]["get"]["responses"]["200"]["content"]["application/json"]
type SonarrSeries = SonarrAllMedia[number]
type SonarrQualityProfiles = paths["/api/v3/qualityprofile"]["get"]["responses"]["200"]["content"]["application/json"]

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

interface SeriesBySeason {
  series: SonarrSeries
  seasons: SeasonsArray
}

// The following helper functions help us extract specific information from a series/season/episode.

const seriesTitle = (series: SonarrSeries) => series.title
const seriesYear = (series: SonarrSeries) => series.year
const seriesQualityProfile = (series: SonarrSeries, qualityProfiles: SonarrQualityProfiles) =>
  qualityProfiles.find((profile) => profile.id === series.qualityProfileId)?.name
const seasonIdentifier = (seasonNumber: number) => seasonNumber.toString().padStart(2, "0")
const episodeIdentifier = (episode?: SeriesEpisode) => episode?.episodeNumber?.toString().padStart(2, "0")
const seriesType = (series: SonarrSeries) => series.seriesType
const episodeReleaseGroup = (episode?: SeriesEpisode) => episode?.episodeFile?.releaseGroup
const episodeSource = (episode?: SeriesEpisode) => episode?.episodeFile?.quality?.quality?.source
const episodeVideoCodec = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.videoCodec
const episodeAudioCodec = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.audioCodec
const episodeAudioChannels = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.audioChannels
const episodeAudioLanguage = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.audioLanguages?.split("/")
const episodeSubtitleLanguage = (episode?: SeriesEpisode) => episode?.episodeFile?.mediaInfo?.subtitles?.split("/")
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
  seasons
    .flatMap((season) => season?.map(episodeFn))
    .filter(Boolean)
    .flat() // need to call flat in addition to flatMap because the given episode function may return an array, and flatMap only flattens with depth 1

export class SonarrClient extends ArrClient {
  readonly #options: SonarrOptions

  public constructor(baseUrl: string, apiKey: string, options: SonarrOptions) {
    super("Sonarr", baseUrl, apiKey)
    this.#options = options
  }

  public async getAllMedia(): Promise<Result<SonarrAllMedia>> {
    return await this.makeRequest<SonarrAllMedia>("series")
  }

  public getAllQualityProfiles(): Promise<Result<SonarrQualityProfiles>> {
    return this.makeRequest<SonarrQualityProfiles>("qualityprofile")
  }

  private async getAllEpisodesForSeries(series: SonarrSeries): Promise<Result<SeriesEpisodes>> {
    if (!series.id) return err(`series id is missing for series '${series.title}'`, undefined)
    const episodes = await this.makeRequest<SeriesEpisodes>(`episode?seriesId=${series.id}&includeEpisodeFile=true`)
    if (isErr(episodes)) return err(`failed to get episode data for series '${series.title}' (${series.id})`, episodes)
    return episodes
  }

  private async getAllSeriesBySeason(): Promise<Result<SeriesBySeason[]>> {
    const allMedia = await this.getAllMedia()
    if (isErr(allMedia)) return err("failed to get sonarr media", allMedia)

    const allSeriesBySeason: SeriesBySeason[] = []

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
            undefined,
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

  public async getMediaData() {
    const allSeriesBySeason = await this.getAllSeriesBySeason()
    if (isErr(allSeriesBySeason)) return allSeriesBySeason

    const qualityProfiles = await this.getAllQualityProfiles()
    if (isErr(qualityProfiles)) return err("failed to get sonarr quality profiles", qualityProfiles)

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
              qualityProfile: seriesQualityProfile(series, qualityProfiles),
              releaseGroup: episodeReleaseGroup(episode),
              source: episodeSource(episode),
              videoCodec: episodeVideoCodec(episode),
              audioCodec: episodeAudioCodec(episode),
              audioChannels: episodeAudioChannels(episode),
              audioLanguage: episodeAudioLanguage(episode),
              subtitleLanguage: episodeSubtitleLanguage(episode),
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
            qualityProfile: seriesQualityProfile(series, qualityProfiles),
            releaseGroup: gatherEpisodeData([season], episodeReleaseGroup),
            source: gatherEpisodeData([season], episodeSource),
            videoCodec: gatherEpisodeData([season], episodeVideoCodec),
            audioCodec: gatherEpisodeData([season], episodeAudioCodec),
            audioChannels: gatherEpisodeData([season], episodeAudioChannels),
            audioLanguage: gatherEpisodeData([season], episodeAudioLanguage),
            subtitleLanguage: gatherEpisodeData([season], episodeSubtitleLanguage),
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
          qualityProfile: seriesQualityProfile(series, qualityProfiles),
          releaseGroup: gatherEpisodeData(seasons, episodeReleaseGroup),
          source: gatherEpisodeData(seasons, episodeSource),
          videoCodec: gatherEpisodeData(seasons, episodeVideoCodec),
          audioCodec: gatherEpisodeData(seasons, episodeAudioCodec),
          audioChannels: gatherEpisodeData(seasons, episodeAudioChannels),
          audioLanguage: gatherEpisodeData(seasons, episodeAudioLanguage),
          subtitleLanguage: gatherEpisodeData(seasons, episodeSubtitleLanguage),
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
