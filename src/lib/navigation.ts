// Prefixes an app path with the deploy base (e.g. /water-delivery-system/ on
// GitHub Pages) so full-page redirects work outside the site root.
export function appPath(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path
}

export function navigateTo(path: string): void {
  window.location.assign(appPath(path))
}
