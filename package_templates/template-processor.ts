import { createHash } from "node:crypto"
import { glob, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const [version] = process.argv.slice(2)
if (!version) {
  console.error("Usage: template-processor <version>")
  process.exit(1)
}

const templateDir = import.meta.dirname
const relativeTemplatePaths = await Array.fromAsync(glob("**/*.template", { cwd: templateDir }))
const templatePaths = relativeTemplatePaths.map((templatePath) => path.resolve(templateDir, templatePath))
const relativeArtifactPaths = await Array.fromAsync(glob("artifacts/**/inspectarr-*"))
const artifactPaths = relativeArtifactPaths.map((artifactPath) => path.resolve(artifactPath))

const replaceVar = (content: string, varName: string, value: string) => content.replaceAll(`\${{${varName}}}`, value)

const getArtifactHash = async (artifactPath: string) =>
  createHash("sha256")
    .update(await readFile(artifactPath))
    .digest("hex")

const artifactHashes = await Promise.all(
  artifactPaths.map(
    async (artifactPath) => [path.basename(artifactPath), await getArtifactHash(artifactPath)] as const,
  ),
)

await Promise.all(
  templatePaths.map(async (templatePath) => {
    let templateContent = await readFile(templatePath, "utf8")
    templateContent = replaceVar(templateContent, "version", version)
    for (const [artifactName, artifactHash] of artifactHashes)
      templateContent = replaceVar(templateContent, `${artifactName}-hash`, artifactHash)

    const processedTemplatePath = path.resolve(templateDir, templatePath.replace(".template", ""))
    await writeFile(processedTemplatePath, templateContent)
    console.info(`'${templatePath}' -> '${processedTemplatePath}'`)
  }),
)
