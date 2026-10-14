const vid = (n) => `${import.meta.env.BASE_URL}reels/${n}.mp4`
const img = (n) => `${import.meta.env.BASE_URL}${n}.jpg`

export const REELS = [
  { id: 'reel-nanami', profileId: 'p87', src: vid('nanami'), poster: img('p87'), caption: '排練之後，琴盒同夜路。' },
  { id: 'reel-honoka', profileId: 'p89', src: vid('honoka'), poster: img('p89'), caption: '清晨馬場，霧還沒散。' },
  { id: 'reel-natsuki', profileId: 'p92', src: vid('natsuki'), poster: img('p92'), caption: '蘭桂坊，第三首才剛開始。' },
  { id: 'reel-haruka', profileId: 'p96', src: vid('haruka'), poster: img('p96'), caption: '西貢退潮，石縫裡的世界。' },
  { id: 'reel-yui', profileId: 'p83', src: vid('yui'), poster: img('p83'), caption: '落地之後，先喝一杯。' },
]

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
