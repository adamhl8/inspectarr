import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"

import { task } from "@adamhl8/bask"
import { build } from "@adamhl8/configs/bask"
import bun from "bun"

export * from "@adamhl8/configs/bask"

export const generateSchemas = task(async ({ sh }) => {
  await sh`bunx openapi-typescript https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json --output ./src/generated/radarr-schema.d.ts`
  await sh`bunx openapi-typescript https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json --output ./src/generated/sonarr-schema.d.ts`
})

// `demo.tape` types a shorter query than this, so the GIF shows a short command with tidier output.
const DEMO_QUERY = `source == bluray && resolution ^= 1920 && (title i^= "star wars" || title i^= p) | SORT title | EXCLUDE m rs sz`

export const generateDemoGif = task(async ({ sh }) => {
  const binDir = await mkdtemp(path.join(os.tmpdir(), "inspectarr-demo-"))
  const wrapperPath = path.join(binDir, "inspectarr")
  const indexPath = path.join(import.meta.dir, "src/index.ts")

  try {
    await bun.write(wrapperPath, `#!/usr/bin/env bash\nbun ${indexPath} radarr '${DEMO_QUERY}'\n`)
    await sh`chmod +x ${wrapperPath}`
    await sh`vhs demo.tape`.env({ PATH: `${binDir}${path.delimiter}${process.env["PATH"] ?? ""}` })
  } finally {
    await rm(binDir, { recursive: true, force: true })
  }
})

export const buildBinaries = task(async ({ sh }) => {
  const compileFlags = ["--compile", "--production", "--minify", "--sourcemap"]
  await sh`bun build ${compileFlags} --target=bun-windows-x64 --outfile=bin/inspectarr-windows-x64.exe src/index.ts`
  await sh`bun build ${compileFlags} --target=bun-darwin-x64 --outfile=bin/inspectarr-macos-x64 src/index.ts`
  await sh`bun build ${compileFlags} --target=bun-darwin-arm64 --outfile=bin/inspectarr-macos-arm64 src/index.ts`
  await sh`bun build ${compileFlags} --target=bun-linux-x64-musl --outfile=bin/inspectarr-linux-x64 src/index.ts`
  await sh`bun build ${compileFlags} --target=bun-linux-arm64-musl --outfile=bin/inspectarr-linux-arm64 src/index.ts`
})

build.before(generateSchemas)
