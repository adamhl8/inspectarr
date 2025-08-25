import type { KnipConfig } from "knip"

const config: KnipConfig = {
  entry: ["src/index.ts"],
  project: ["**"],
  "github-actions": false,
}

// biome-ignore lint/style/noDefaultExport: needs to be default
export default config
