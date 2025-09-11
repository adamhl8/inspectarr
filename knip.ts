import { knipConfig } from "@adamhl8/configs"

const config = knipConfig({
  entry: ["package_templates/template-processor.ts"],
  "github-actions": false,
} as const)

export default config
