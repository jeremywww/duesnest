import { errorMessage } from './errors'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from './api'
import { MemberDirectory } from './MemberDirectory'

type Organization = { id: string; name: string }
export function Workspace({ userId }: { userId: string }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    api.organizations().then(data => {
      if (!active) return
      setLoading(false)
      setOrganizations(data ?? [])
      setSelected(previous => data?.some(o => o.id === previous) ? previous : data?.[0]?.id ?? '')
    }).catch(e => { if (active) { setLoading(false); setError(errorMessage(e, 'Unable to load organizations.')) } })
    return () => { active = false }
  }, [attempt])
  async function createOrganization(event: FormEvent) {
    event.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true); setError('')
    try {
      const data = await api.createOrganization(name.trim())
      setOrganizations(old => [...old, data]); setSelected(data.id); setName(''); setCreating(false)
    } catch (e) { setError(errorMessage(e, 'Unable to create organization.')) }
    finally { setBusy(false) }
  }
  const current = organizations.find(o => o.id === selected)
  return <><style>{`@keyframes workspace-spin { to { transform: rotate(360deg) } } .workspace-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; width:100%; min-height:100px; color:#526a83; font-size:14px; font-weight:600 } @media (prefers-reduced-motion: reduce) { .workspace-spinner { animation-duration:2s !important } }`}</style><section className="workspace-bar" aria-label="Organizations">
    {loading ? <div className="workspace-loading" role="status" aria-live="polite"><span className="workspace-spinner" aria-hidden="true" style={{ display: "inline-block", width: 25, height: 25, flexShrink: 0, border: "3px solid #dbeafe", borderTopColor: "#0c74f5", borderRadius: "50%", animation: "workspace-spin .8s linear infinite" }} /><span>Getting your workspace ready…</span></div> : <>
      {!!organizations.length && <label htmlFor="organization">Organization<select aria-label="Organization" id="organization" disabled={busy} value={selected} onChange={e => setSelected(e.target.value)}>{organizations.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label>}
      {creating || !organizations.length ? <form className="new-organization" onSubmit={createOrganization}><label className="sr-only" htmlFor="new-organization-name">New organization</label><input id="new-organization-name" autoFocus required maxLength={120} value={name} disabled={busy} onChange={e => setName(e.target.value)} placeholder="Organization name" /><button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>{<button type="button" className="text-button" disabled={busy} onClick={() => { setCreating(false); setName('') }}>Cancel</button>}</form> : <button className="outline compact-new-organization" onClick={() => setCreating(true)}>＋ Add organization</button>}
    </>}
    {error && <div role="alert" className="form-error">{error} <button className="outline" onClick={() => setAttempt(x => x + 1)}>Reload organizations</button></div>}
  </section>{current ? <MemberDirectory key={current.id} organization={current} /> : !loading && !error ? <main className="content"><h1>Create your first organization</h1><p>Each organization has its own members and dues records.</p></main> : null}</>
}
