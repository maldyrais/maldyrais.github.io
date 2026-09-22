const DEV = import.meta.env.DEV

export function reportError(scope, error) {
  if (!DEV) return
  console.error(`[${scope}]`, error)
}

export function reportWarning(scope, error) {
  if (!DEV) return
  console.warn(`[${scope}]`, error)
}
