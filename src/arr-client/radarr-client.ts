import type { Result } from "ts-explicit-errors"
import { err, isErr } from "ts-explicit-errors"

import { ArrClient } from "~/arr-client/arr-client.ts"
import type { RadarrMediaData } from "~/cli/radarr.ts"
import type { paths } from "~/generated/radarr-schema.d.ts"
import { formatSize, getRawResolution } from "~/utils.ts"

type RadarrAllMedia = paths["/api/v3/movie"]["get"]["responses"]["200"]["content"]["application/json"][number]
type RadarrQualityProfiles = paths["/api/v3/qualityprofile"]["get"]["responses"]["200"]["content"]["application/json"]

export class RadarrClient extends ArrClient {
  public constructor(baseUrl: string, apiKey: string) {
    super("Radarr", baseUrl, apiKey)
  }

  public getAllMedia(): Promise<Result<RadarrAllMedia[]>> {
    return this.makeRequest<RadarrAllMedia[]>("movie")
  }

  public getAllQualityProfiles(): Promise<Result<RadarrQualityProfiles>> {
    return this.makeRequest<RadarrQualityProfiles>("qualityprofile")
  }

  public async getMediaData() {
    const allMedia = await this.getAllMedia()
    if (isErr(allMedia)) return err("failed to get radarr media", allMedia)

    const qualityProfiles = await this.getAllQualityProfiles()
    if (isErr(qualityProfiles)) return err("failed to get radarr quality profiles", qualityProfiles)

    const data: RadarrMediaData = []
    for (const movie of allMedia) {
      if (!movie.hasFile) continue

      const movieFile = movie.movieFile
      const mediaDetails = movieFile?.mediaInfo

      data.push({
        title: movie.title,
        year: movie.year,
        monitored: movie.monitored,
        releaseGroup: movieFile?.releaseGroup,
        source: movieFile?.quality?.quality?.source,
        qualityProfile: qualityProfiles.find((profile) => profile.id === movie.qualityProfileId)?.name,
        videoCodec: mediaDetails?.videoCodec,
        audioCodec: mediaDetails?.audioCodec,
        audioChannels: mediaDetails?.audioChannels,
        audioLanguage: mediaDetails?.audioLanguages?.split("/"),
        subtitleLanguage: mediaDetails?.subtitles?.split("/"),
        resolution: mediaDetails?.resolution,
        rawResolution: getRawResolution(mediaDetails?.resolution),
        size: formatSize(movieFile?.size),
        rawSize: movieFile?.size,
      })
    }

    return data
  }
}
