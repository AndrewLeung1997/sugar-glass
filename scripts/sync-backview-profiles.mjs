import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(root, 'public')

function loadEnv() {
  const text = readFileSync(resolve(root, '.env.local'), 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1).trim()
  }
  return env
}

function toIn(cm) {
  return `${Math.round(cm / 2.54)}吋`
}

function seed(id) {
  return [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0)
}

const IDS = ['p109', 'p110', 'p111']

const META = {
  p109: { name: 'Nagisa', age: 25, city: '深水灣', occupation: '遊艇會會員', tagline: '碼頭與旗幟', bio: '週末常在遊艇會，最愛泊岸之後那一陣海風。相信陽光同甲板就夠。期待一段也願意出海、不怕曬的人。', tags: ['遊艇會', '碼頭', '海', '陽光', '旅行'], verified: true, lifestyle: '頂級' },
  p110: { name: 'Kanade', age: 27, city: '粉嶺', occupation: '高爾夫球手', tagline: '球道與午後', bio: '在粉嶺球會練習四年，最愛一桿過樹的安靜。相信草地比說話誠實。尋找一個也懂節奏、不急於成績的人。', tags: ['高爾夫', '球會', '草地', '午後', '紅茶'], verified: true, lifestyle: '奢華' },
  p111: { name: 'Yuiha', age: 22, city: '薄扶林', occupation: '大學生', tagline: '校園與單車', bio: '在大學讀比較文學，最愛圖書館石階同樹蔭。下課踩單車穿過中庭。期待一段一起安靜走校園的人。', tags: ['校園', '大學', '閱讀', '單車', '咖啡'], verified: false, lifestyle: '文青' },
  p97: { name: 'Hikari', age: 24, city: '淺水灣', occupation: '遊艇模特', tagline: '海風與甲板', bio: '週末常在南區遊艇拍攝，最愛黃昏甲板的風。相信海平面是最好的對話。期待一段也願意出海、不怕曬的人。', tags: ['遊艇', '海', '攝影', '黃昏', '旅行'], verified: true, lifestyle: '奢華' },
  p98: { name: 'Kohana', age: 27, city: '沙田', occupation: '馬場禮賓', tagline: '晨霧與草地', bio: '在沙田馬場做禮賓三年，最愛清晨草地未開賽的安靜。相信等待也是一種優雅。尋找一個也懂節奏、不急於掌聲的人。', tags: ['馬場', '賽馬', '清晨', '禮賓', '紅茶'], verified: true, lifestyle: '頂級' },
  p99: { name: 'Airi', age: 23, city: '西九', occupation: '芭蕾舞者', tagline: '把杆與鏡光', bio: '專業芭蕾舞者，排練室的把杆是我的日常。身體比語言誠實。期待一段細膩、彼此尊重節奏的關係。', tags: ['芭蕾', '舞蹈', '古典樂', '美術', '巴黎'], verified: true, lifestyle: '高端' },
  p100: { name: 'Nozomi', age: 26, city: '赤柱', occupation: '瑜伽導師', tagline: '日出與呼吸', bio: '在赤柱海邊教晨瑜伽，最愛第一口海風。相信呼吸是回到自己的路。期待一段也願意慢下來的人。', tags: ['瑜伽', '海邊', '日出', '冥想', '果昔'], verified: true, lifestyle: '簡約' },
  p101: { name: 'Uta', age: 25, city: '旺角', occupation: '獨立歌手', tagline: '麥克風與霓虹', bio: '在小型 live house 駐唱，也自己寫歌。最愛關燈之後只剩一盞橙光。尋找一個也敢走進人群、也敢安靜聽歌的人。', tags: ['唱歌', '舞台', '吉他', '霓虹', '深夜'], verified: false, lifestyle: '文青' },
  p102: { name: 'Mizore', age: 28, city: '金鐘', occupation: '鋼琴家', tagline: '黑鍵與夜色', bio: '交響樂團鋼琴手，巡演過歐亞。舞台之外愛一個人走夜路。期待一段懂休止符、也懂掌聲的關係。', tags: ['鋼琴', '古典樂', '夜色', '紅酒', '巴黎'], verified: true, lifestyle: '奢華' },
  p103: { name: 'Nagi', age: 24, city: '九龍塘', occupation: '網球教練', tagline: '陽光與白線', bio: '半職業網球手，週末教球。最愛陽光與流汗的痛快。期待一段健康、一起出汗的關係。', tags: ['網球', '運動', '陽光', '健康', '旅行'], verified: false, lifestyle: '高端' },
  p104: { name: 'Kaguya', age: 29, city: '上環', occupation: '茶道家', tagline: '和服與抹茶', bio: '在上環茶室教授茶道，相信一碗茶就是一次呼吸。週末臨帖到天黑。理想約會是一起在榻榻米上留一段空白。', tags: ['茶道', '和服', '抹茶', '京都', '安靜'], verified: true, lifestyle: '奢華' },
  p105: { name: 'Hiyori', age: 27, city: '中環', occupation: '畫廊助理', tagline: '白牆與油畫', bio: '在當代畫廊工作，最愛閉館後的安靜。相信看一幅畫需要時間。尋找一個也懂留白的人。', tags: ['藝術', '畫廊', '策展', '紅酒', '設計'], verified: true, lifestyle: '奢華' },
  p106: { name: 'Asahi', age: 26, city: '西貢', occupation: 'Spa 芳療師', tagline: '溫泉與霧氣', bio: '在西貢山莊做芳療，相信觸碰是療癒的開始。下班愛看蒸汽散去。尋找一段慢下來的關係。', tags: ['spa', '芳療', '溫泉', '冥想', '自然'], verified: true, lifestyle: '高端' },
  p107: { name: 'Kotoha', age: 25, city: '太子', occupation: '花藝師', tagline: '花市與晨光', bio: '在花墟做花藝，凌晨收花是日常。相信花是日常的詩。理想約會是一起逛花市、回家插一瓶。', tags: ['花藝', '花市', '晨光', '手作', '攝影'], verified: false, lifestyle: '文青' },
  p108: { name: 'Suzune', age: 24, city: '灣仔', occupation: '城市旅人', tagline: '天台與日落', bio: '喜歡在灣仔天台看日落，把城市當成另一種海。生活是耳機與外套。尋找一個也願意抬頭的人。', tags: ['天台', '日落', '城市', '旅行', '咖啡'], verified: false, lifestyle: '文青' },
}

function filesFor(id) {
  return ['', 'a', 'b', 'c'].map((s) => {
    const name = `p${id.slice(1)}${s}.jpg`
    return { name, path: resolve(publicDir, `${id}${s}.jpg`) }
  })
}

function runCurl(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (c) => { out += c })
    child.stderr.on('data', (c) => { err += c })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise(out)
      else reject(new Error(err || out || `curl exit ${code}`))
    })
  })
}

async function signInRest(apiKey, email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const json = await res.json()
  if (!json.idToken) throw new Error(json.error?.message || '登入失敗')
  return json.idToken
}

async function uploadImage(bucketName, idToken, path, filePath) {
  const buckets = [bucketName, bucketName.replace('.firebasestorage.app', '.appspot.com')]
  let lastErr = ''
  for (const bucket of [...new Set(buckets)]) {
    const startUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`
    const start = await runCurl([
      '-sS', '-D', '-', '-o', '/tmp/velvet-storage-start.json',
      '-X', 'POST',
      '--http1.1',
      '-H', `Authorization: Bearer ${idToken}`,
      '-H', 'X-Goog-Upload-Protocol: resumable',
      '-H', 'X-Goog-Upload-Command: start',
      '-H', 'X-Goog-Upload-Header-Content-Type: image/jpeg',
      '-H', 'Content-Type: application/json; charset=UTF-8',
      '--data', '{}',
      '--max-time', '20',
      startUrl,
    ])
    const loc = start.split(/\r?\n/).find((l) => /^x-goog-upload-url:/i.test(l) || /^location:/i.test(l))
    const uploadUrl = loc ? loc.split(':').slice(1).join(':').trim() : ''
    if (!uploadUrl) {
      lastErr = start.slice(0, 240)
      continue
    }
    const out = await runCurl([
      '-sS', '-X', 'POST',
      '--http1.1',
      '-H', 'X-Goog-Upload-Command: upload, finalize',
      '-H', 'X-Goog-Upload-Offset: 0',
      '-H', 'Content-Type: image/jpeg',
      '--data-binary', `@${filePath}`,
      '--max-time', '45',
      uploadUrl,
    ])
    let json
    try { json = JSON.parse(out) } catch { lastErr = out.slice(0, 200); continue }
    if (json.downloadTokens) {
      return {
        url: `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${json.downloadTokens}`,
        path,
        bucket,
      }
    }
    lastErr = json.error?.message || out.slice(0, 200)
  }
  throw new Error(`上傳失敗 ${path}: ${lastErr}`)
}

function fsValue(v) {
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } }
  const fields = {}
  for (const [k, val] of Object.entries(v)) fields[k] = fsValue(val)
  return { mapValue: { fields } }
}

async function writeProfile(projectId, idToken, id, profile) {
  const fields = {}
  for (const [k, val] of Object.entries(profile)) fields[k] = fsValue(val)
  const now = new Date().toISOString()
  fields.createdAt = { timestampValue: now }
  fields.updatedAt = { timestampValue: now }
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/profiles/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || `Firestore 寫入失敗 ${id}`)
}

const env = loadEnv()
const email = process.env.VELVET_ADMIN_EMAIL
const password = process.env.VELVET_ADMIN_PASSWORD
if (!email || !password) {
  console.error('缺少 VELVET_ADMIN_EMAIL / VELVET_ADMIN_PASSWORD')
  process.exit(1)
}

const bucketName = env.VITE_FIREBASE_STORAGE_BUCKET
const idToken = await signInRest(env.VITE_FIREBASE_API_KEY, email, password)
console.log('已登入 admin，開始用 curl 上傳 12 個背影 profile')

for (const id of IDS) {
  const meta = META[id]
  const shots = filesFor(id)
  for (const shot of shots) {
    if (!existsSync(shot.path)) throw new Error(`找不到 ${shot.path}`)
  }
  console.log(`寫入 ${id} ${meta.name}…`)
  const photos = shots.map((shot) => `/${shot.name}`)
  const photoPaths = shots.map((shot) => `public/${shot.name}`)
  const n = seed(id)
  const profile = {
    name: meta.name,
    age: meta.age,
    city: meta.city,
    occupation: meta.occupation,
    tagline: meta.tagline,
    bio: meta.bio,
    cover: photos[0],
    coverPath: photoPaths[0],
    photos,
    photoPaths,
    tags: meta.tags,
    verified: meta.verified,
    stats: { lifestyle: meta.lifestyle },
    figure: {
      height: `${156 + (n % 16)}cm`,
      weight: `${43 + (n % 12)}kg`,
      bust: toIn(78 + (n % 12)),
      waist: toIn(56 + (n % 10)),
      hip: toIn(84 + (n % 12)),
    },
    education: ['高中', '專上', '大學', '學士', '碩士', '海外留學'][n % 6],
    skills: [meta.occupation, ...meta.tags.slice(0, 2)],
    interests: meta.tags,
    source: 'ai-backview',
  }
  await writeProfile(env.VITE_FIREBASE_PROJECT_ID, idToken, id, profile)
  console.log(`完成 ${id} ${meta.name}`)
}

console.log('Firestore 同步完成')
process.exit(0)
