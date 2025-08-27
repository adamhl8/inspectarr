import type { OperationMap } from "filterql"

import type { AllMediaDataKeys } from "~/cli/types.ts"
import { omit } from "~/utils.ts"

export const customOperations: OperationMap = {
  SORT: (data, args, { resolveField }) => {
    const [field = "", direction = "asc"] = args

    let resolvedField = resolveField(field) as AllMediaDataKeys
    if (!resolvedField) throw new Error(`Unknown field '${field}' for operation 'SORT'`)

    if (resolvedField === "size") resolvedField = "rawSize"
    else if (resolvedField === "resolution") resolvedField = "rawResolution"

    if (direction !== "asc" && direction !== "desc")
      throw new Error(
        `Invalid direction argument '${direction}' for operation 'SORT': should be either 'asc' or 'desc'`,
      )

    const collator = new Intl.Collator(undefined, { ignorePunctuation: true, sensitivity: "base", numeric: true })
    const sortedData = data.toSorted((a, b) => {
      const aValue = a[resolvedField] ?? ""
      const bValue = b[resolvedField] ?? ""
      const aString = typeof aValue === "string" ? aValue : aValue.toString()
      const bString = typeof bValue === "string" ? bValue : bValue.toString()
      if (direction === "desc") return collator.compare(bString, aString)
      return collator.compare(aString, bString)
    })

    return sortedData
  },
  EXCLUDE: (data, args, { resolveField }) => {
    const fields = args.map((field) => resolveField(field)).filter((field) => field !== undefined)

    const dataAfterExcludes = data.map((obj) => omit(obj, fields))
    return dataAfterExcludes as typeof data
  },
}
