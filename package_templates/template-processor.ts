import path from "node:path"
import process from "node:process"

const [version] = process.argv.slice(2)
if (!version) {
  console.error("Usage: template-processor <version>")
  process.exit(1)
}

const templateDir = import.meta.dir
const templatePaths = await Array.fromAsync(new Bun.Glob("**/*.template").scan({ cwd: templateDir, absolute: true }))
const artifactPaths = await Array.fromAsync(new Bun.Glob("artifacts/**/inspectarr-*").scan({ absolute: true }))

const replaceVar = (content: string, varName: string, value: string) => content.replaceAll(`\${{${varName}}}`, value)

const getArtifactHash = async (artifactPath: string) => {
  const hasher = new Bun.CryptoHasher("sha256")
  const artifact = await Bun.file(artifactPath).arrayBuffer()
  return hasher.update(artifact).digest("hex")
}

const artifactHashes = await Promise.all(
  artifactPaths.map(
    async (artifactPath) => [path.basename(artifactPath), await getArtifactHash(artifactPath)] as const,
  ),
)

await Promise.all(
  templatePaths.map(async (templatePath) => {
    let templateContent = await Bun.file(templatePath).text()
    templateContent = replaceVar(templateContent, "version", version)
    for (const [artifactName, artifactHash] of artifactHashes)
      templateContent = replaceVar(templateContent, `${artifactName}-hash`, artifactHash)

    const processedTemplatePath = path.resolve(templateDir, templatePath.replace(".template", ""))
    await Bun.write(processedTemplatePath, templateContent)
    console.info(`'${templatePath}' -> '${processedTemplatePath}'`)
  }),
)
