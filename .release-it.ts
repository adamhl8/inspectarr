import { releaseItConfig } from "@adamhl8/configs"

const config = releaseItConfig({
  hooks: {
    "after:bump": ["just build-binaries"],
    "after:release": ["bun scripts/publish.ts ${version}"],
  },
  github: {
    assets: ["bin/inspectarr-*"],
  },
})

export default config
