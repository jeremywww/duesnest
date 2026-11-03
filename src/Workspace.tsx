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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    supabase!.from('organizations').select('id,name').order('created_at').then(({ data, error }) => {
      if (!active) return
      setLoading(false)
      if (error) { setError(error.message); return }
      setOrganizations(data ?? [])
      setSelected(previous => data?.some(o => o.id === previous) ? previous : data?.[0]?.id ?? '')
    })
    return () => { active = false }
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
  return <><section className="workspace-bar" aria-label="Organizations">
    {loading ? <p role="status">Loading organizations…</p> : <>
      {!!organizations.length && <label htmlFor="organization">Organization<select aria-label="Organization" id="organization" disabled={busy} value={selected} onChange={e => setSelected(e.target.value)}>{organizations.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label>}
      {creating || !organizations.length ? <form className="new-organization" onSubmit={createOrganization}><label className="sr-only" htmlFor="new-organization-name">New organization</label><input id="new-organization-name" autoFocus required maxLength={120} value={name} disabled={busy} onChange={e => setName(e.target.value)} placeholder="Organization name" /><button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>{<button type="button" className="text-button" disabled={busy} onClick={() => { setCreating(false); setName('') }}>Cancel</button>}</form> : <button className="outline compact-new-organization" onClick={() => setCreating(true)}>＋ Add organization</button>}
    </>}
    {error && <div role="alert" className="form-error">{error} <button className="outline" onClick={() => setAttempt(x => x + 1)}>Reload organizations</button></div>}
  </section>{current ? <MemberDirectory key={current.id} organization={current} /> : !loading && !error ? <main className="content"><h1>Create your first organization</h1><p>Each organization has its own members and dues records.</p></main> : null}</>
}
