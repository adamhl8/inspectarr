import process from "node:process"

import { omit } from "es-toolkit"
import type { Schema } from "filterql"
import type { TablemarkOptions } from "tablemark"
import { tablemark } from "tablemark"

import { hiddenFieldKeys, internalFieldKeys, mergedFieldKeys } from "#cli/base-fields.ts"
import type { OutputOptions } from "#cli/base-options.ts"
import { sonarrHiddenFieldKeys } from "#cli/sonarr.ts"
import type { AllMediaDataKeys, JsonifiableMediaData } from "#cli/types.ts"
import { formatQualifiedValue, stringifyValue } from "#utils.ts"

const pipeRegex = /\|/gv

// null/undefined are shown as empty cells
const toCellText = (value: unknown): string => stringifyValue(value).replaceAll(pipeRegex, String.raw`\|`) // need to escape any pipe characters

const toJson = (data: JsonifiableMediaData): string => JSON.stringify(data)

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
    const output = this.options.output === "md" ? this.toMarkdown(data) : toJson(data)
    process.stdout.write(output)
  }

  private toMarkdown(data: JsonifiableMediaData): string {
    const tablemarkOptions: TablemarkOptions = {
      textHandlingStrategy: "advanced", // https://github.com/haltcase/tablemark/issues/24
      maxWidth: 50,
      toCellText: ({ value }) => toCellText(value),
    }
    if (this.options.shortHeaders)
      tablemarkOptions.toHeaderTitle = ({ key, title }) => this.#schema[key]?.alias ?? title.toLowerCase()

    const markdownData = data.map((dataObject) => {
      const newDataObject = { ...dataObject }

      for (const key of mergedFieldKeys) {
        if (key === "year") newDataObject.title = formatQualifiedValue(newDataObject.title, newDataObject.year)
        // key === "audioChannels"
        else newDataObject.audioCodec = formatQualifiedValue(newDataObject.audioCodec, newDataObject.audioChannels)
      }

      const fieldsToOmit: AllMediaDataKeys[] = [...internalFieldKeys, ...mergedFieldKeys]
      if (!this.options.all) fieldsToOmit.push(...hiddenFieldKeys, ...sonarrHiddenFieldKeys)

      return omit(newDataObject, fieldsToOmit)
    })

    return tablemark(markdownData, tablemarkOptions)
  }
}
