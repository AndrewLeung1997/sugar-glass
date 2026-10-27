export function interleaveFeed(profiles, reels, every = 3) {
  const out = []
  let ri = 0
  if (reels[0]) {
    out.push({ kind: 'reel', reel: reels[0], key: reels[0].id })
    ri = 1
  }
  profiles.forEach((p, i) => {
    out.push({ kind: 'profile', profile: p, key: p.id })
    if ((i + 1) % every === 0 && ri < reels.length) {
      out.push({ kind: 'reel', reel: reels[ri], key: reels[ri].id })
      ri++
    }
  })
  return out
}

/** Desktop：Reel 獨立成全寬橫帶，唔同 profile card 共一個 grid，避免拉高同行卡片 */
export function desktopFeedSections(profiles, reels, after = 3) {
  if (!profiles.length) return []
  const head = profiles.slice(0, after)
  const rest = profiles.slice(after)
  const out = [{ kind: 'profiles', items: head, key: 'p-head' }]
  if (reels.length) out.push({ kind: 'reel-band', reels, key: 'reel-band' })
  if (rest.length) out.push({ kind: 'profiles', items: rest, key: 'p-rest' })
  return out
}
