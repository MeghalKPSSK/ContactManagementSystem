/** Coerces an Express route/query param (string | string[] | undefined) to a plain string. */
export const paramStr = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
