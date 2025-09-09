import process from "node:process"
import type { Schema } from "filterql"
import type { TablemarkOptions } from "tablemark"
import { tablemark } from "tablemark"

import { hiddenFieldKeys, internalFieldKeys, mergedFieldKeys } from "~/cli/base-fields.ts"
import type { OutputOptions } from "~/cli/base-options.ts"
import { sonarrHiddenFieldKeys } from "~/cli/sonarr.ts"
import type { AllMediaDataKeys, JsonifiableMediaData } from "~/cli/types.ts"
import { formatQualifiedValue, omit } from "~/utils.ts"

const pipeRegex = /\|/g

export class Logger {
  public readonly options: OutputOptions
  readonly #schema: Schema

  public constructor(options: OutputOptions, schema: Schema) {
    this.options = options
    this.#schema = schema
  }

  public info(message: string): void {
    if (!this.options.quiet) console.info(message)
  }

  public printMediaData(data: JsonifiableMediaData) {
    const output = this.options.output === "md" ? this.toMarkdown(data) : this.toJson(data)
    process.stdout.write(output)
  }

  private toMarkdown(data: JsonifiableMediaData): string {
    const tablemarkOptions: TablemarkOptions = {
      textHandlingStrategy: "advanced", // https://github.com/haltcase/tablemark/issues/24
      maxWidth: 50,
      toCellText: ({ value }) => {
        // we want to show null/undefined as empty cells
        if (value === null || value === undefined) return ""
        return value.toString().replaceAll(pipeRegex, "\\|") // need to escape any pipe characters
      },
    }
    if (this.options.shortHeaders)
      tablemarkOptions.toHeaderTitle = ({ key, title }) => this.#schema[key]?.alias ?? title.toLowerCase()

    const markdownData = data.map((dataObject) => {
      const newDataObject = { ...dataObject }

      for (const key of mergedFieldKeys) {
        if (key === "year") newDataObject.title = formatQualifiedValue(newDataObject.title, newDataObject.year)
        else if (key === "audioChannels")
          newDataObject.audioCodec = formatQualifiedValue(newDataObject.audioCodec, newDataObject.audioChannels)
      }

      const fieldsToOmit: AllMediaDataKeys[] = [...internalFieldKeys, ...mergedFieldKeys]
      if (!this.options.all) fieldsToOmit.push(...hiddenFieldKeys, ...sonarrHiddenFieldKeys)

      return omit(newDataObject, fieldsToOmit)
    })

    return tablemark(markdownData, tablemarkOptions)
  }

  private toJson(data: JsonifiableMediaData): string {
    return JSON.stringify(data)
  }
}
