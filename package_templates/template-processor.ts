/** biome-ignore-all lint/performance/noAwaitInLoops: ignore */
import path from "node:path"
import process from "node:process"
import { Glob } from "bun"

const args = process.argv.slice(2)
const [version] = args
if (!version) {
  console.error("Usage: template-processor <version>")
  process.exit(1)
}

const templateGlob = new Glob("**/*.template")
const templatePaths = await Array.fromAsync(templateGlob.scan({ cwd: import.meta.dir, absolute: true }))

const artifactGlob = new Glob("artifacts/**/inspectarr-*")
const artifactPaths = await Array.fromAsync(artifactGlob.scan({ absolute: true }))

for (const templatePath of templatePaths) {
  const templateFile = Bun.file(templatePath)
  let templateContent = await templateFile.text()
  templateContent = replaceVar(templateContent, "version", version)

  for (const artifactPath of artifactPaths) {
    const artifactName = path.basename(artifactPath)
    const artifactHash = await getArtifactHash(artifactPath)
    templateContent = replaceVar(templateContent, `${artifactName}-hash`, artifactHash)
  }

  const processedTemplatePath = path.resolve(import.meta.dir, templatePath.replace(".template", ""))
  await Bun.write(processedTemplatePath, templateContent)
  console.info(`'${templatePath}' -> '${processedTemplatePath}'`)
}

function replaceVar(content: string, varName: string, value: string) {
  return content.replaceAll(`\${{${varName}}}`, value)
}

async function getArtifactHash(artifactPath: string) {
  const hasher = new Bun.CryptoHasher("sha256")
  const artifactFile = Bun.file(artifactPath)
  const artifactArrayBuffer = await artifactFile.arrayBuffer()
  const artifactHash = hasher.update(artifactArrayBuffer).digest("hex")
  return artifactHash
}
