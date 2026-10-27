import { useEffect, useRef, useState } from 'react'
import { FILTERS } from '../data.js'
import { importBackviewProfiles, importLocalProfiles, listProfiles, listReels, removeProfile, removeReel, saveProfile, saveReels } from '../auth/adminApi.js'
import AdminBusyOverlay from './AdminBusyOverlay.jsx'

const empty = {
  id: '', name: '', age: '', city: '', occupation: '', tagline: '', bio: '',
  tags: '', verified: true, lifestyle: '奢華',
  height: '', weight: '', bust: '', waist: '', hip: '',
  education: '大學', skills: '', interests: '',
  photos: [], cover: '', createdAt: undefined,
}

const STEPS = [
  { id: 'basic', label: '基本資料' },
  { id: 'figure', label: '身材與背景' },
  { id: 'photos', label: '相片' },
  { id: 'reels', label: 'Reels' },
]

function stripUnit(v, unit) {
  return String(v || '').replace(new RegExp(`${unit}$`), '').trim()
}

function joinList(v) {
  return Array.isArray(v) ? v.join('、') : String(v || '')
}

function profileToForm(p) {
  const fig = p.figure || {}
  return {
    id: p.id,
    name: p.name || '',
    age: p.age || '',
    city: p.city || '',
    occupation: p.occupation || '',
    tagline: p.tagline || '',
    bio: p.bio || '',
    tags: joinList(p.tags),
    verified: Boolean(p.verified),
    lifestyle: p.stats?.lifestyle || '奢華',
    height: stripUnit(fig.height, 'cm'),
    weight: stripUnit(fig.weight, 'kg'),
    bust: stripUnit(fig.bust, '吋'),
    waist: stripUnit(fig.waist, '吋'),
    hip: stripUnit(fig.hip, '吋'),
    education: p.education || '',
    skills: joinList(p.skills),
    interests: joinList(p.interests),
    photos: [...(p.photos || [])],
    cover: p.cover || '',
    createdAt: p.createdAt,
  }
}

function fileKey(f) {
  return `${f.name}-${f.size}-${f.lastModified}`
}

function FileThumb({ file, onRemove, video }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <div className="wall-thumb new">
      {src && (video
        ? <video src={src} muted playsInline preload="metadata" />
        : <img src={src} alt="" />)}
      <button type="button" onClick={onRemove} aria-label="移除">×</button>
    </div>
  )
}

export default function AdminCms() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(empty)
  const [cover, setCover] = useState(null)
  const [wall, setWall] = useState([])
  const [reelFiles, setReelFiles] = useState([])
  const [reelCaption, setReelCaption] = useState('')
  const [reels, setReels] = useState([])
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyText, setBusyText] = useState('')
  const [step, setStep] = useState(0)
  const wallInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const reelInputRef = useRef(null)
  const formRef = useRef(null)

  const load = async () => {
    try {
      setList(await listProfiles())
    } catch (ex) {
      setList([])
      setErr(ex.message || '讀取 profile 失敗')
    }
    try {
      setReels(await listReels())
    } catch {
      setReels([])
    }
  }
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const editing = Boolean(form.id)

  const resetForm = () => {
    setForm(empty)
    setCover(null)
    setWall([])
    setReelFiles([])
    setReelCaption('')
    setStep(0)
    if (wallInputRef.current) wallInputRef.current.value = ''
    if (coverInputRef.current) coverInputRef.current.value = ''
    if (reelInputRef.current) reelInputRef.current.value = ''
  }

  const startEdit = (p) => {
    setErr('')
    setOk('')
    setForm(profileToForm(p))
    setCover(null)
    setWall([])
    setReelFiles([])
    setReelCaption('')
    setStep(0)
    if (wallInputRef.current) wallInputRef.current.value = ''
    if (coverInputRef.current) coverInputRef.current.value = ''
    if (reelInputRef.current) reelInputRef.current.value = ''
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const addWallFiles = (fileList) => {
    const incoming = [...fileList].filter(f => f.type.startsWith('image/'))
    setWall(prev => {
      const seen = new Set(prev.map(fileKey))
      return [...prev, ...incoming.filter(f => !seen.has(fileKey(f)))]
    })
  }

  const addReelFiles = (fileList) => {
    const incoming = [...fileList].filter(f => f.type.startsWith('video/'))
    setReelFiles(prev => {
      const seen = new Set(prev.map(fileKey))
      return [...prev, ...incoming.filter(f => !seen.has(fileKey(f)))]
    })
  }

  const profileReels = reels.filter(r => r.profileId === form.id)
  const last = step === STEPS.length - 1

  const validateStep = (i) => {
    if (i === 0) {
      if (!form.name.trim()) return '請輸入名字'
      if (!form.age) return '請輸入年齡'
      if (!form.city.trim()) return '請輸入地區'
      if (!form.occupation.trim()) return '請輸入職業'
    }
    if (i === 2 && !form.cover && !cover) return '請上傳封面相片'
    return ''
  }

  const goNext = () => {
    const msg = validateStep(step)
    if (msg) { setErr(msg); return }
    setErr('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const goPrev = () => {
    setErr('')
    setStep(s => Math.max(s - 1, 0))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!last) {
      goNext()
      return
    }
    setErr('')
    setOk('')
    const coverErr = validateStep(2)
    if (coverErr) { setErr(coverErr); setStep(2); return }
    const basicErr = validateStep(0)
    if (basicErr) { setErr(basicErr); setStep(0); return }
    setBusyText('')
    setBusy(true)
    try {
      const saved = await saveProfile(form, { cover, wall })
      if (reelFiles.length) {
        await saveReels(saved.id, reelFiles, { caption: reelCaption, cover: saved.cover })
      }
      setOk(editing ? `已更新 ${saved.name}` : `已新增 ${saved.name}`)
      resetForm()
      await load()
    } catch (ex) {
      setErr(ex.message || '儲存失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-grid">
      <AdminBusyOverlay show={busy} text={busyText || (editing ? '正在更新，請稍候…' : '正在上傳，請稍候…')} />
      <form className="admin-panel glass cms-wizard" ref={formRef} onSubmit={onSubmit}>
        <fieldset disabled={busy} className="admin-lock">
          <div className="cms-wizard-head">
            <span className="create-user-kicker">Profile</span>
            <h2>{editing ? `修改 ${form.name || 'Profile'}` : '建立 Profile'}</h2>
            {editing && (
              <button type="button" className="admin-ghost" onClick={resetForm}>取消修改，改為新增</button>
            )}
          </div>

          <ol className="cms-steps">
            {STEPS.map((item, i) => (
              <li key={item.id} className={i === step ? 'on' : i < step ? 'done' : ''}>
                <button type="button" onClick={() => { setErr(''); setStep(i) }}>
                  <span>{i + 1}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ol>

          <div key={STEPS[step].id} className="cms-step-pane">
            {step === 0 && (
              <>
                <div className="admin-2">
                  <label>名字<input value={form.name} onChange={set('name')} /></label>
                  <label>年齡<input type="number" value={form.age} onChange={set('age')} /></label>
                </div>
                <div className="admin-2">
                  <label>地區<input value={form.city} onChange={set('city')} /></label>
                  <label>職業<input value={form.occupation} onChange={set('occupation')} /></label>
                </div>
                <label>標語<input value={form.tagline} onChange={set('tagline')} /></label>
                <label>關於我<textarea rows={4} value={form.bio} onChange={set('bio')} /></label>
                <div className="admin-2">
                  <label>風格
                    <select value={form.lifestyle} onChange={set('lifestyle')}>
                      {FILTERS.filter(f => f !== '全部').map(f => <option key={f}>{f}</option>)}
                    </select>
                  </label>
                  <label className="admin-check"><input type="checkbox" checked={form.verified} onChange={set('verified')} /> 已認證</label>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="admin-3">
                  <label>胸圍（吋）<input value={form.bust} onChange={set('bust')} placeholder="33" /></label>
                  <label>腰圍（吋）<input value={form.waist} onChange={set('waist')} placeholder="24" /></label>
                  <label>臀圍（吋）<input value={form.hip} onChange={set('hip')} placeholder="35" /></label>
                </div>
                <div className="admin-2">
                  <label>身高（cm）<input value={form.height} onChange={set('height')} placeholder="165" /></label>
                  <label>體重（kg）<input value={form.weight} onChange={set('weight')} placeholder="48" /></label>
                </div>
                <label>教育程度<input value={form.education} onChange={set('education')} /></label>
                <label>技能<input value={form.skills} onChange={set('skills')} placeholder="用逗號分隔" /></label>
                <label>興趣<input value={form.interests} onChange={set('interests')} placeholder="用逗號分隔" /></label>
                <label>Tags<input value={form.tags} onChange={set('tags')} placeholder="用逗號分隔" /></label>
              </>
            )}

            {step === 2 && (
              <>
                <div className="wall-picker">
                  <div className="wall-head">
                    <span>封面相片</span>
                    <button type="button" onClick={() => coverInputRef.current?.click()}>
                      {form.cover || cover ? '更換封面' : '選擇封面'}
                    </button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={e => setCover(e.target.files?.[0] || null)}
                    />
                  </div>
                  {(cover || form.cover) && (
                    <div className="wall-grid">
                      {cover ? <FileThumb file={cover} onRemove={() => { setCover(null); if (coverInputRef.current) coverInputRef.current.value = '' }} /> : (
                        <div className="wall-thumb">
                          <img src={form.cover} alt="" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="wall-picker">
                  <div className="wall-head">
                    <span>Photo wall · 已選 {form.photos.length + wall.length} 張</span>
                    <button type="button" onClick={() => wallInputRef.current?.click()}>加入相片（可多選）</button>
                    <input
                      ref={wallInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={e => { addWallFiles(e.target.files); e.target.value = '' }}
                    />
                  </div>
                  {(form.photos.length > 0 || wall.length > 0) && (
                    <div className="wall-grid">
                      {form.photos.map(url => (
                        <div key={url} className="wall-thumb">
                          <img src={url} alt="" />
                          <button type="button" aria-label="移除" onClick={() => setForm(f => ({ ...f, photos: f.photos.filter(p => p !== url) }))}>×</button>
                        </div>
                      ))}
                      {wall.map((file, i) => (
                        <FileThumb key={fileKey(file)} file={file} onRemove={() => setWall(prev => prev.filter((_, idx) => idx !== i))} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <div className="wall-picker">
                <div className="wall-head">
                  <span>Reels · {profileReels.length + reelFiles.length} 條</span>
                  <button type="button" onClick={() => reelInputRef.current?.click()}>加入影片（可多選）</button>
                  <input
                    ref={reelInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    hidden
                    onChange={e => { addReelFiles(e.target.files); e.target.value = '' }}
                  />
                </div>
                <label>Reel 說明（今次新上傳共用）<input value={reelCaption} onChange={e => setReelCaption(e.target.value)} placeholder="可留空" /></label>
                {(profileReels.length > 0 || reelFiles.length > 0) && (
                  <div className="wall-grid">
                    {profileReels.map(r => (
                      <div key={r.id} className="wall-thumb">
                        {r.poster ? <img src={r.poster} alt="" /> : <video src={r.src} muted playsInline preload="metadata" />}
                        <button type="button" aria-label="移除" onClick={async () => { if (confirm('刪除這條 Reel？')) { await removeReel(r.id); load() } }}>×</button>
                      </div>
                    ))}
                    {reelFiles.map((file, i) => (
                      <FileThumb key={fileKey(file)} file={file} video onRemove={() => setReelFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    ))}
                  </div>
                )}
                <p className="admin-hint">單條上限 80MB，建議直向 9:16。此步可留空。</p>
              </div>
            )}
          </div>

          {err && <div className="gate-err">{err}</div>}
          {ok && <div className="gate-ok">{ok}</div>}

          <div className="cms-step-nav">
            <button type="button" className="admin-ghost" onClick={goPrev} disabled={step === 0}>上一步</button>
            <span className="cms-step-count">{step + 1} / {STEPS.length}</span>
            {last ? (
              <button className="lp-btn primary" type="submit" disabled={busy}>
                {busy ? '上傳中…' : editing ? '更新 Profile' : '儲存 Profile'}
              </button>
            ) : (
              <button className="lp-btn primary" type="submit">下一步</button>
            )}
          </div>
        </fieldset>
      </form>

      <section className="admin-panel glass admin-list">
        <div className="cms-list-head">
          <h2>已建立 Profile{list.length ? `（${list.length}）` : ''}</h2>
          <button type="button" className="admin-ghost" disabled={busy} onClick={async () => {
            if (!confirm('將 12 個背影 AI Profile 上傳到 Firebase。已存在的會跳過。')) return
            setErr('')
            setOk('')
            setBusy(true)
            try {
              const result = await importBackviewProfiles(({ current, total, name }) => {
                setBusyText(`正在上傳 ${name}（${current} / ${total}）`)
              })
              const fail = result.failed.length ? `，失敗 ${result.failed.length}` : ''
              setOk(`已上傳 ${result.imported} 個背影 profile，跳過 ${result.skipped} 個${fail}`)
              await load()
            } catch (ex) {
              setErr(ex.message || '上傳失敗')
            } finally {
              setBusy(false)
              setBusyText('')
            }
          }}>上傳背影 Profile</button>
          <button type="button" className="admin-ghost" disabled={busy} onClick={async () => {
            if (!confirm('將本機 AI 圖片同 Profile 上傳到 Firebase。已存在的會跳過。')) return
            setErr('')
            setOk('')
            setBusy(true)
            try {
              const result = await importLocalProfiles(({ current, total, name }) => {
                setBusyText(`正在匯入 ${name}（${current} / ${total}）`)
              })
              const fail = result.failed.length ? `，失敗 ${result.failed.length}` : ''
              setOk(`已匯入 ${result.imported} 個，跳過 ${result.skipped} 個${fail}`)
              await load()
            } catch (ex) {
              setErr(ex.message || '匯入失敗')
            } finally {
              setBusy(false)
              setBusyText('')
            }
          }}>匯入本機 Profile</button>
        </div>
        {!list.length && <p className="admin-hint">未有 CMS profile。男士專區會顯示這裡的真實資料。</p>}
        <div className="cms-list">
          {list.map(p => (
            <div key={p.id} className={`cms-item ${form.id === p.id ? 'on' : ''}`}>
              {p.cover && <img src={p.cover} alt="" />}
              <div>
                <b>{p.name} · {p.age}</b>
                <small>{p.city} · {p.occupation}</small>
                <small>{p.photos?.length || 0} 張相片 · {reels.filter(r => r.profileId === p.id).length} 條 Reel</small>
              </div>
              <div className="cms-actions">
                <button type="button" onClick={() => startEdit(p)}>修改</button>
                <button type="button" onClick={async () => { if (confirm(`刪除 ${p.name}？`)) { if (form.id === p.id) resetForm(); await removeProfile(p.id); load() } }}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
