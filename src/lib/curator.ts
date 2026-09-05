/** session/local flag: this browser may see the seed publisher. */
export const CURATOR_STORAGE_KEY = "dj-vault-curator"

/**
 * Live-site visitors must not see "Save as seed". Jason unlocks it with
 * `?curator` or `#curator` (remembered on this device). POST /api/seed still
 * requires SEED_ADMIN_SECRET.
 */
export function shouldShowSeedPublisher(opts: {
  isDev: boolean
  href: string
  sessionUnlocked: boolean
}): boolean {
  if (opts.isDev) return true
  return opts.sessionUnlocked || curatorFlagInUrl(opts.href)
}

export function curatorFlagInUrl(href: string): boolean {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }
  if (url.searchParams.has("curator")) return true
  return url.hash.replace(/^#/, "").split("&")[0] === "curator"
}

export function readCuratorUnlocked(storage: {
  getItem(key: string): string | null
}): boolean {
  try {
    return storage.getItem(CURATOR_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

/** Persist unlock and strip the flag from the address bar so it is not shared. */
export function consumeCuratorUnlock(
  location: { href: string; pathname: string; search: string; hash: string },
  history: { replaceState(data: unknown, unused: string, url: string): void },
  storage: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  },
): boolean {
  const fromUrl = curatorFlagInUrl(location.href)
  const fromStorage = readCuratorUnlocked(storage)
  if (fromUrl) {
    try {
      storage.setItem(CURATOR_STORAGE_KEY, "1")
    } catch {
      // private mode / quota
    }
    const url = new URL(location.href)
    url.searchParams.delete("curator")
    if (url.hash.replace(/^#/, "") === "curator") url.hash = ""
    const next = `${url.pathname}${url.search}${url.hash}`
    const prev = `${location.pathname}${location.search}${location.hash}`
    if (next !== prev) history.replaceState(null, "", next)
  }
  return fromUrl || fromStorage
}
