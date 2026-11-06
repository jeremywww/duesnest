import { errorMessage } from './errors'
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import { MemberDirectory } from './MemberDirectory'

type Organization = { id: string; name: string }
export function Workspace({ userId }: { userId: string }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [readFailed, setReadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort('Workspace request timed out'), 15_000)
    let active = true
    setLoading(true); setReadFailed(false); setError('')
    async function loadOrganizations() {
      try {
        const { data, error } = await supabase!.from('organizations').select('id,name')
          .order('created_at').abortSignal(controller.signal)
        if (error) throw error
        if (!active) return
        setOrganizations(data ?? [])
        setSelected(previous => data?.some(o => o.id === previous) ? previous : data?.[0]?.id ?? '')
      } catch (error) {
        if (!active) return
        setReadFailed(true)
        setError(controller.signal.aborted
          ? 'Loading organizations timed out. Please try again.'
          : errorMessage(error, 'Unable to load organizations.'))
      } finally {
        clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }
    void loadOrganizations()
    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])
  async function createOrganization(event: FormEvent) {
    event.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase!.from('organizations').insert({ name: name.trim(), owner_id: userId }).select('id,name').single()
      if (error) throw error
      setOrganizations(old => [...old, data]); setSelected(data.id); setName(''); setCreating(false)
    } catch (e) { setError(errorMessage(e, 'Unable to create organization.')) }
    finally { setBusy(false) }
  }
  const current = organizations.find(o => o.id === selected)
  return <><style>{`@keyframes workspace-spin { to { transform: rotate(360deg) } } .workspace-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; width:100%; min-height:100px; color:#526a83; font-size:14px; font-weight:600 } @media (prefers-reduced-motion: reduce) { .workspace-spinner { animation:none !important } }`}</style><section className="workspace-bar" aria-label="Organizations">
    {loading ? <div className="workspace-loading" role="status" aria-live="polite"><span className="workspace-spinner" aria-hidden="true" style={{ display: "inline-block", width: 25, height: 25, flexShrink: 0, border: "3px solid #dbeafe", borderTopColor: "#0c74f5", borderRadius: "50%", animation: "workspace-spin .8s linear infinite" }} /><span>Getting your workspace ready…</span></div> : !readFailed && <>
      {!!organizations.length && <label htmlFor="organization">Organization<select aria-label="Organization" id="organization" disabled={busy} value={selected} onChange={e => setSelected(e.target.value)}>{organizations.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label>}
      {creating || !organizations.length ? <form className="new-organization" onSubmit={createOrganization}><label className="sr-only" htmlFor="new-organization-name">New organization</label><input id="new-organization-name" autoFocus required maxLength={120} value={name} disabled={busy} onChange={e => setName(e.target.value)} placeholder="Organization name" /><button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>{!!organizations.length && <button type="button" className="text-button" disabled={busy} onClick={() => { setCreating(false); setName('') }}>Cancel</button>}</form> : <button className="outline compact-new-organization" onClick={() => setCreating(true)}>＋ Add organization</button>}
    </>}
    {error && <div role="alert" className="form-error">{error} <button className="outline" onClick={() => setAttempt(x => x + 1)}>Reload organizations</button></div>}
  </section>{current ? <MemberDirectory key={current.id} organization={current} /> : !loading && !error ? <main className="content"><h1>Create your first organization</h1><p>Each organization has its own members and dues records.</p></main> : null}</>
}
