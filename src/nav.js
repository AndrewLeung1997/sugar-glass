export function currentPath() {
  return location.pathname || '/'
}

export function go(path) {
  const next = path.startsWith('/') ? path : `/${path}`
  if (location.pathname === next) {
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }
  history.pushState(null, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function migrateHashRoute() {
  const hash = location.hash
  if (!hash.startsWith('#/')) return
  history.replaceState(null, '', hash.slice(1) || '/')
}
