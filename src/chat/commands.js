export const CHAT_COMMANDS = [
  { id: 'help', keys: ['help', '指令', 'commands', '?'], label: '/help', hint: '查看全部指令' },
  { id: 'bot', keys: ['bot', 'back', 'assistant', 'end', '返回', '助理'], label: '/bot', hint: '返回助理（離開人工）' },
  { id: 'human', keys: ['human', 'staff', 'cs', '人工', '客服'], label: '/human', hint: '轉介人工客服' },
  { id: 'register', keys: ['register', 'join', 'signup', '註冊', '開戶'], label: '/register', hint: '註冊開戶表單' },
  { id: 'faq', keys: ['faq', 'joininfo', '入會'], label: '/faq', hint: '入會事宜' },
  { id: 'cancel', keys: ['cancel', '取消'], label: '/cancel', hint: '取消目前步驟' },
]

export function parseChatCommand(text) {
  const raw = String(text || '').trim()
  if (!raw.startsWith('/')) return null
  const token = raw.slice(1).split(/\s+/)[0].toLowerCase()
  if (!token) return { id: 'help', raw }
  const hit = CHAT_COMMANDS.find(item => item.keys.includes(token) || item.label.slice(1) === token)
  return hit ? { ...hit, raw } : { id: 'unknown', raw, token }
}

export function filterCommands(text) {
  const raw = String(text || '')
  if (!raw.startsWith('/')) return []
  const token = raw.slice(1).split(/\s+/)[0].toLowerCase()
  if (!token) return CHAT_COMMANDS
  return CHAT_COMMANDS.filter(item => (
    item.label.slice(1).startsWith(token)
    || item.keys.some(k => k.startsWith(token))
  ))
}

export const COMMAND_HELP = CHAT_COMMANDS
  .map(item => `${item.label}  ${item.hint}`)
  .join('\n')
