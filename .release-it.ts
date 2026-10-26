import { releaseItConfig } from "@adamhl8/configs"

const config = releaseItConfig({
  hooks: {
    "after:bump": ["bask build-binaries"],
    "after:release": ["bun scripts/publish.ts ${version}"],
  },
  github: {
    assets: ["bin/inspectarr-*"],
  },
})

export default config
