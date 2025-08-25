import process from "node:process"
import type { Schema } from "filterql"
import type { TablemarkOptions } from "tablemark"
import { tablemark } from "tablemark"

import type { OutputFlags } from "~/cli/shared.ts"
import type { JsonifiableMediaData } from "~/cli/types.ts"

const pipeRegex = /\|/g

export class Logger {
  readonly #options: OutputFlags
  readonly #schema: Schema

  public constructor(options: OutputFlags, schema: Schema) {
    this.#options = options
    this.#schema = schema
  }

  public info(message: string): void {
    if (!this.#options.quiet) console.info(message)
  }

  public printMediaData(data: JsonifiableMediaData) {
    const output = this.#options.output === "md" ? this.toMarkdown(data) : this.toJson(data)
    process.stdout.write(output)
  }

  private toMarkdown(data: JsonifiableMediaData): string {
    const tablemarkOptions: TablemarkOptions = {
      textHandlingStrategy: "advanced", // https://github.com/haltcase/tablemark/issues/24
      toCellText: ({ value }) => {
        // we want to show null/undefined as empty cells
        if (value === null || value === undefined) return ""
        return value.toString().replaceAll(pipeRegex, "\\|") // need to escape any pipe characters
      },
    }
    if (this.#options.shortHeaders)
      tablemarkOptions.toHeaderTitle = ({ key, title }) => this.#schema[key]?.alias ?? title.toLowerCase()

    return tablemark(data, tablemarkOptions)
  }

  private toJson(data: JsonifiableMediaData): string {
    return JSON.stringify(data)
  }
}
