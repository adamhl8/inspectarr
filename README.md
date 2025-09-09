<p align="center">
<h1 align="center"><img style="color:#36BCF7; width:38px; height:38px;" src="https://raw.githubusercontent.com/adamhl8/inspectarr/refs/heads/main/assets/logo.svg"> Inspectarr</h1>
</p>

A CLI tool for querying and inspecting the media in your Radarr and Sonarr instances

<p align="center">
  <img alt="demo" src="https://github.com/adamhl8/inspectarr/blob/main/assets/demo.gif">
</p>

---

<!-- toc -->

- [Installation](#installation)
  - [Homebrew (macOS/Linux)](#homebrew-macoslinux)
  - [Scoop (Windows)](#scoop-windows)
  - [Manual](#manual)
- [Usage](#usage)
  - [Setup](#setup)
  - [Basic Usage](#basic-usage)
  - [Queries](#queries)
  - [Inspectarr Options](#inspectarr-options)

<!-- tocstop -->

If you're looking for a more general tool to manage/change your \*arrs, check out [managarr](https://github.com/Dark-Alex-17/managarr).

## Installation

### Homebrew (macOS/Linux)

```sh
brew install adamhl8/inspectarr/inspectarr
```

### Scoop (Windows)

```sh
scoop bucket add inspectarr https://github.com/adamhl8/scoop-inspectarr.git
scoop install inspectarr
```

### Manual

Binaries are available on the [releases](https://github.com/adamhl8/inspectarr/releases) page.

<details>
  <summary><i>Why are the binaries so big?</i></summary>
  This project is written in TypeScript and the binaries are generated via <a href="https://bun.com/docs/bundler/executables">Bun's compile feature</a>. The Bun runtime itself is included in the binary, hence the size.
</details>

## Usage

### Setup

Inspectarr requires your Radarr/Sonarr URL and API key to connect to your instances. You can provide these via:

- Environment variables: `RADARR_URL`, `RADARR_API_KEY`, `SONARR_URL`, `SONARR_API_KEY`
- Or directly when running Inspectarr:
  - e.g. `inspectarr radarr --url 'your-radarr-url' --api-key 'your-api-key'`

### Basic Usage

`inspectarr <radarr|sonarr> [options]... [query]`

- Use `inspectarr help <command>` to see more detailed usage information: `inspectarr help sonarr`

Running Inspectarr without a query will display _all_ of your downloaded media:

```sh
inspectarr radarr
```

- By default, Inspectarr outputs a markdown table of the results.

You can also output the results as JSON if you want to do some further processing (pipe it to another command, etc.):

```sh
inspectarr sonarr --output json | json_pp
```

### Queries

Inspectarr uses [FilterQL](https://github.com/adamhl8/filterql) to filter/transform the results. See the [FilterQL readme](https://github.com/adamhl8/filterql#queries) for all of the available features.

**Examples:**

```sh
# display media with a bluray source and 1080p (resolution starts with 1920)
inspectarr radarr 'source == bluray && resolution ^= 1920'

# display media from specific release groups
inspectarr sonarr 'releaseGroup == NTb || releaseGroup == FLUX'

# display media where the title contains 'star wars' (case-insensitive)
inspectarr sonarr 'title i*= "star wars"'

# display media where the title does *not* contain 'star wars'
inspectarr sonarr '!title i*= "star wars"'

# display media released after 1990, then sort by title
inspectarr radarr 'year > 1990 | SORT title'

# display media where monitored is true and where the video codec is x265 (contains '265')
inspectarr radarr 'monitored && videoCodec *= 265'
```

#### Fields

> [!TIP]
> Some fields are hidden by default to prevent the markdown table from being too wide.
>
> - To display hidden fields, use the `--all` option.
>
> You don't have to display hidden fields to use them in queries.

> [!TIP]
> If the markdown table is too wide, use the `EXCLUDE` operation to exclude specific fields/columns.
>
> For example: `inspectarr sonarr --all '* | EXCLUDE audioLanguage subtitleLanguage'`

**General fields:**

- `title` (alias: `t`) - Media title
- `year` (alias: `y`) - Release year
- `monitored` (alias: `m`) - Whether the media is monitored
- `releaseGroup` (alias: `rg`) - Release group name
- `source` (alias: `src`) - Media source (bluray, webdl, etc.)
- `qualityProfile` (alias: `qp`) - Quality profile name
- `videoCodec` (alias: `vc`) - Video codec (x264, x265, etc.)
- `audioCodec` (alias: `ac`) - Audio codec (AAC, EAC3, etc.)
- `audioChannels` (alias: `ach`) - Audio channels (2, 5.1, etc.)
- `audioLanguage` (alias: `al`) - List of audio languages (eng, jpn, etc.)
- `subtitleLanguage` (alias: `sl`) - List of subtitle languages (eng, spa, etc.)
- `resolution` (alias: `rs`) - Video resolution
- `size` (alias: `sz`) - File size

**Sonarr-specific fields:**

- `type` - Series type (standard, anime, daily)
- `season` (alias: `s`) - Season number
- `episode` (alias: `e`) - Episode number

#### Internal Fields

These fields are used internally and are never displayed in the markdown table.

- Note: The JSON output will always include all fields.

- `rawResolution` - Total pixel count
- `rawSize` - File size in bytes

#### Operations

In addition to the [built-in FilterQL operations](https://github.com/adamhl8/filterql#operations), the following operations are available:

- `EXCLUDE`: Exclude the given fields/columns from the output
  - `EXCLUDE [field]...`

```sh
# display media with a bluray source and exclude the 'resolution' and 'size' columns
inspectarr radarr 'source == bluray | EXCLUDE resolution size'
```

### Inspectarr Options

**Service options:**

- `--url`: The URL of the instance (default: "\<SERVICE\>\_URL" environment variable)
- `--api-key`: The API key for the instance (default: "\<SERVICE\>\_API_KEY" environment variable)

**Output options:**

- `--all`: Show fields that are hidden by default in the markdown table
- `--output md|json`: The type of output to generate (`json` implies `--quiet`) (default: `md`)
- `--quiet`: Suppress all output except the markdown/JSON
- `--short-headers`: Use the field aliases as the markdown table headers (can help reduce the width of the table)

**Sonarr-specific options:**

By default, media from Sonarr is displayed by series.

- `--by-season`: Display media by individual season
- `--by-episode`: Display media by individual episode
