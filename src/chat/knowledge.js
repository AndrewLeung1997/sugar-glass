export const CHAT_KB = [
  {
    id: 'join',
    keys: ['入會', '註冊', '加入', '成為會員', '點加入', '如何加入', '申請', '開戶', 'sign up', 'register', 'join'],
    answer: '女性會員完全免費、免審核，大約 1 分鐘完成。男士需完成身份同埋年收入確認先可以註冊。你可以按 /register 填用戶名稱、密碼、確認密碼同電話，再接收 SMS 驗證碼。開戶後會有一次性邀請碼，帳戶有效 1 日，未付費會自動停用。',
  },
  {
    id: 'fee',
    keys: ['收費', '費用', '幾錢', '會費', '月費', '免費', '價錢', '付費', 'price', 'fee', 'free'],
    answer: '女性完全免費。男士屬於已審核高端會員，具體會費同付費紀錄由職員喺後台更新。如果你想了解男士方案，我可以幫你轉介人工客服。',
  },
  {
    id: 'men',
    keys: ['男士', '男人', '男士專區', '年收入', '審核', '身份'],
    answer: '男士專區只限已登入會員瀏覽。男士需完成身份確認同年收入確認。會員入面大約 71% 係公司經營／董事，亦有醫生、律師等專業人士。',
  },
  {
    id: 'women',
    keys: ['女性', '女士', '女會員', '免費註冊'],
    answer: '女性會員完全免費、免審核，只需電話號碼即可註冊。平台有 24 小時監察同身份確認，用嚟保障雙方安全。',
  },
  {
    id: 'query',
    keys: ['查詢 profile', '查profile', '單次', '睇profile', '睇人', '瀏覽', '男士專區', '一次過'],
    answer: '單次查詢 Profile：請按 /register 填用戶名稱、密碼、確認密碼同電話。驗證成功後會產生一次性邀請碼。帳戶有效 1 日，未付費將自動停用。',
  },
  {
    id: 'login',
    keys: ['登入', 'login', '密碼', '驗證碼', 'otp', 'sms'],
    answer: '已有帳戶請到「會員登入」：先輸入用戶名稱同密碼，再接收 SMS 驗證碼。同一個帳戶同時只可以一個裝置登入。',
  },
  {
    id: 'safe',
    keys: ['安全', '私隱', '監察', '可靠', '詐騙', '安心'],
    answer: 'Velvet 有 24 小時職員巡視、人臉識別身份確認，男士需先通過審核。可疑行為會即時處理。請唔好喺平台外隨意透露敏感個人資料。',
  },
  {
    id: 'date',
    keys: ['約會', '見面', '安排', '日子'],
    answer: '揀好空閒日子就可以安排見面，唔使繁瑣嚟往。配對成功後再約時間同地點。',
  },
]

export function matchKnowledge(text) {
  const q = String(text || '').trim().toLowerCase()
  if (!q) return null
  let best = null
  let score = 0
  for (const item of CHAT_KB) {
    const hits = item.keys.filter(k => q.includes(String(k).toLowerCase())).length
    if (hits > score) {
      score = hits
      best = item
    }
  }
  if (score <= 0) return null
  return best
}

export function detectIntent(text) {
  const q = String(text || '').trim().toLowerCase()
  if (/人工|客服|職員|轉介|真人|help|support/.test(q)) return 'human'
  if (/查詢|查profile|單次|睇profile|代為註冊|開戶|幫我註冊/.test(q)) return 'register'
  if (/入會|註冊|加入|收費|幾錢|免費|男士|安全/.test(q)) return 'kb'
  return matchKnowledge(q) ? 'kb' : 'unknown'
}
