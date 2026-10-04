/**
 * Merges caller options over defaults, skipping keys set to undefined. A plain spread lets
 * `{ relTol: undefined }` replace the default with undefined, which is easy to do by
 * forwarding an optional field and turns a tolerance into NaN.
 */
export function withDefaults<T extends object>(defaults: Readonly<T>, over?: Readonly<Partial<T>>): T {
  const out = { ...defaults } as T;
  if (over === undefined) return out;
  for (const k of Object.keys(over) as (keyof T)[]) {
    const v = over[k];
    if (v !== undefined) out[k] = v as T[keyof T];
  }
  return out;
}
