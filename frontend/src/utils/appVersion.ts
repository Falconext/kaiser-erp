const CURRENT_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
const RELOAD_FLAG = 'vendify:reloaded-for-new-build'

type VersionPayload = {
  version?: string
  builtAt?: string
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

export const getCurrentAppVersion = () => CURRENT_VERSION

export const hasNewAppVersion = async (): Promise<boolean> => {
  if (!isBrowser() || CURRENT_VERSION === 'dev') return false

  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!response.ok) return false

    const payload = (await response.json()) as VersionPayload
    return Boolean(payload.version && payload.version !== CURRENT_VERSION)
  } catch {
    return false
  }
}

export const reloadIfNewAppVersion = async () => {
  if (!isBrowser()) return false
  const isStale = await hasNewAppVersion()
  if (!isStale) {
    sessionStorage.removeItem(RELOAD_FLAG)
    return false
  }

  if (sessionStorage.getItem(RELOAD_FLAG) === CURRENT_VERSION) return false
  sessionStorage.setItem(RELOAD_FLAG, CURRENT_VERSION)
  window.location.reload()
  return true
}

export const scheduleAppVersionChecks = () => {
  if (!isBrowser() || CURRENT_VERSION === 'dev') return

  const check = () => {
    void reloadIfNewAppVersion()
  }

  window.addEventListener('focus', check)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check()
  })
}
