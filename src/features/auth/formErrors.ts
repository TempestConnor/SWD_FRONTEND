import { errorMessages } from '../../api/errorMessages'
import { ApiError } from '../../api/errors'

export type FormErrors<Field extends string> = {
  fields: Partial<Record<Field, string>>
  form?: string
}

/** What a known errorCode means for this form: a message on one field, or on the whole form. */
export type ErrorCodeMessages<Field extends string> = Record<string, { field?: Field; message: string }>

const GENERIC_MESSAGE = errorMessages.generic

/**
 * Maps a failed request onto form fields by errorCode and validation violations.
 * Anything unrecognised gets a generic message; the server's detail text is never shown.
 */
export function toFormErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
  codes: ErrorCodeMessages<Field>,
): FormErrors<Field> {
  if (!(error instanceof ApiError)) {
    return { fields: {}, form: GENERIC_MESSAGE }
  }

  const known = codes[error.errorCode]
  if (known) {
    return known.field ? { fields: { [known.field]: known.message } as FormErrors<Field>['fields'] } : { fields: {}, form: known.message }
  }

  if (error.errorCode === 'VALIDATION_FAILED') {
    const mapped: FormErrors<Field>['fields'] = {}
    for (const violation of error.violations) {
      if (isField(violation.field, fields)) {
        mapped[violation.field] ??= violation.message
      }
    }
    if (Object.keys(mapped).length > 0) {
      return { fields: mapped }
    }
  }

  return { fields: {}, form: GENERIC_MESSAGE }
}

function isField<Field extends string>(name: string, fields: readonly Field[]): name is Field {
  return (fields as readonly string[]).includes(name)
}
