import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"

import { $ } from "bun"

interface Package {
  repo: string
  template: string
  file: string
}

interface GitIdentity {
  name: string
  email: string
}

interface PublishContext {
  tag: string
  ciToken: string
  templateVars: Map<string, string>
  gitIdentity: GitIdentity
}

const PACKAGES: Package[] = [
  { repo: "homebrew-inspectarr", template: "homebrew/inspectarr.rb.template", file: "Formula/inspectarr.rb" },
  { repo: "scoop-inspectarr", template: "scoop/inspectarr.json.template", file: "inspectarr.json" },
]

const TEMPLATES_DIR = path.resolve(import.meta.dir, "../package_templates")
const BINARIES_GLOB = "bin/inspectarr-*"

const parseArgs = () => {
  const tag = process.argv.at(2)
  if (!tag) {
    console.error("usage: publish <tag>")
    process.exit(1)
  }

  const ciToken = process.env["CI_TOKEN"]
  if (!ciToken) {
    console.error("CI_TOKEN is not set")
    process.exit(1)
  }

  return { tag, ciToken }
}

const getBinaryHash = async (binaryPath: string) => {
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(await Bun.file(binaryPath).arrayBuffer())
  return hasher.digest("hex")
}

/** The `${{...}}` placeholders a template can use: the version, plus a `<binary>-hash` per built binary. */
const getTemplateVars = async (tag: string) => {
  const binaryPaths = await Array.fromAsync(new Bun.Glob(BINARIES_GLOB).scan({ absolute: true }))
  const binaryHashes = await Promise.all(
    binaryPaths.map(
      async (binaryPath) => [`${path.basename(binaryPath)}-hash`, await getBinaryHash(binaryPath)] as const,
    ),
  )

  // the tag is v-prefixed, the templates want a bare version
  return new Map([["version", tag.replace(/^v/v, "")], ...binaryHashes])
}

/** A fresh clone doesn't inherit the identity the release workflow configures on this repo. */
const getGitIdentity = async (): Promise<GitIdentity> => ({
  name: (await $`git config user.name`.text()).trim(),
  email: (await $`git config user.email`.text()).trim(),
})

const renderTemplate = async (template: string, templateVars: Map<string, string>) => {
  let content = await Bun.file(path.resolve(TEMPLATES_DIR, template)).text()
  for (const [varName, value] of templateVars) content = content.replaceAll(`\${{${varName}}}`, value)
  return content
}

const publishPackage = async (pkg: Package, context: PublishContext) => {
  const { tag, ciToken, templateVars, gitIdentity } = context
  const content = await renderTemplate(pkg.template, templateVars)

  const remote = `https://adamhl8:${ciToken}@github.com/adamhl8/${pkg.repo}.git`
  const cloneDir = await fs.mkdtemp(path.join(os.tmpdir(), `${pkg.repo}-`))
  await $`git clone --depth 1 ${remote} ${cloneDir}`.quiet()

  await Bun.write(path.join(cloneDir, pkg.file), content)
  await $`git -C ${cloneDir} add -A`
  await $`git -C ${cloneDir} -c user.name=${gitIdentity.name} -c user.email=${gitIdentity.email} commit -m ${tag}`
  await $`git -C ${cloneDir} push ${remote}`.quiet()

  console.info(`${pkg.repo}: ${pkg.file} -> ${tag}`)
}

const { tag, ciToken } = parseArgs()
const templateVars = await getTemplateVars(tag)
const gitIdentity = await getGitIdentity()

await Promise.all(
  PACKAGES.map(async (pkg) => {
    await publishPackage(pkg, { tag, ciToken, templateVars, gitIdentity })
  }),
)
