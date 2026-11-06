import { errorMessage } from './errors'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, CircleDollarSign, Plus, Search, Trash2, Users, Wallet } from 'lucide-react'
import logo from './assets/logo.svg'

import { supabase } from './supabase'
type Member = { id: string; name: string; email: string; amount: number; paid: boolean }

const currency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export function MemberDirectory({ organization }: { organization: { id: string; name: string } }) {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  function openMember(member?: Member) {
    setEditing(member?.id ?? null); setName(member?.name ?? ''); setEmail(member?.email ?? ''); setAmount(String(member?.amount ?? 50)); setError(''); setShowForm(true)
  }
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('50')
  const [error, setError] = useState('')

  const [loading, setLoading] = useState(true)
  const [readFailed, setReadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setReadFailed(false); setError('')
    supabase!.from('members').select('id,name,email,amount,paid').eq('organization_id', organization.id).order('created_at').then(({ data, error }) => {
      if (!active) return
      setLoading(false)
      if (error) { setReadFailed(true); setError(error.message); return }
      setMembers(data ?? [])
    })
    return () => { active = false }
  }, [organization.id, attempt])

  const stats = useMemo(() => ({
    total: members.length,
    paid: members.filter(m => m.paid).length,
    collected: members.filter(m => m.paid).reduce((n, m) => n + m.amount, 0),
    outstanding: members.filter(m => !m.paid).reduce((n, m) => n + m.amount, 0)
  }), [members])

  const shown = members.filter(m => (m.name + ' ' + m.email).toLowerCase().includes(search.toLowerCase()))

  function downloadCsv() {
    const cell = (value: string | number) => {
      const text = String(value)
      const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text
      return '"' + safe.replace(/"/g, '""') + '"'
    }
    const rows = [['Name', 'Email', 'Dues (USD)', 'Status'], ...members.map(m => [m.name, m.email, m.amount.toFixed(2), m.paid ? 'Paid' : 'Unpaid'])]
    const csv = '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = (organization.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'organization') + '-members.csv'
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const dollars = Number(amount)
    if (!name.trim() || !email.trim() || !email.includes('@') || !Number.isFinite(dollars) || dollars < 0 || dollars > 1000000) {
      setError('Enter a name, a valid email, and a dues amount between $0 and $1,000,000.')
      return
    }
    setBusy(true); setError('')
    try {
      const fields = { name: name.trim(), email: email.trim(), amount: Math.round(dollars * 100) / 100 }
      const query = editing
        ? supabase!.from('members').update(fields).eq('id', editing).eq('organization_id', organization.id)
        : supabase!.from('members').insert({ organization_id: organization.id, ...fields, paid: false })
      const { data, error } = await query.select('id,name,email,amount,paid').single()
      if (error) throw error
      setMembers(prev => editing ? prev.map(m => m.id === editing ? data : m) : [...prev, data])
      setName(''); setEmail(''); setAmount('50'); setShowForm(false)
    } catch (e) { setError(errorMessage(e, 'Unable to save member.')) }
    finally { setBusy(false) }
  }

  async function togglePaid(id: string) {
    if (busy) return
    const member = members.find(m => m.id === id)
    if (!member) return
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase!.from('members').update({ paid: !member.paid }).eq('id', id).eq('organization_id', organization.id).select('id,name,email,amount,paid').single()
      if (error) throw error
      setMembers(prev => prev.map(m => m.id === id ? data : m))
    } catch (e) { setError(errorMessage(e, 'Unable to update dues.')) }
    finally { setBusy(false) }
  }
  async function removeMember(id: string) {
    if (busy || !window.confirm('Remove this member?')) return
    setBusy(true); setError('')
    try {
      const { error } = await supabase!.from('members').delete().eq('id', id).eq('organization_id', organization.id).select('id').single()
      if (error) throw error
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (e) { setError(errorMessage(e, 'Unable to remove member.')) }
    finally { setBusy(false) }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img src={logo} alt="Duesnest" /></div>
        <div className="nav-section">WORKSPACE</div>
        <div className="nav-item active"><Users size={19}/> Members</div>
        <div className="sidebar-bottom"><span className="status-dot"/> Your organization <small>Members & dues</small></div>
      </aside>
      <main className="main">
        <header className="topbar"><span>Overview <span className="crumb">/ Members</span></span><span className="topbadge">Membership management</span></header>
        <div className="content">{error && !showForm && <p role="alert" className="form-error">{error}</p>}<button disabled={busy || loading} className="outline" onClick={() => setAttempt(n => n + 1)}>Refresh records</button>
          <div className="heading"><div><div className="eyebrow">{organization.name}</div><h1>Members & dues</h1><p className="muted">A simple home for your members and their dues status.</p></div><button disabled={busy || loading} className="primary" onClick={() => openMember()}><Plus size={18}/> Add member</button></div>
          {!loading && !readFailed && <section className="stats">
            <div className="stat"><div className="stat-label"><Users size={17}/> Total members</div><strong>{stats.total}</strong><span>People in your directory</span></div>
            <div className="stat"><div className="stat-label"><Check size={17}/> Paid members</div><strong>{stats.paid}</strong><span>{stats.total ? Math.round(stats.paid / stats.total * 100) : 0}% up to date</span></div>
            <div className="stat"><div className="stat-label"><CircleDollarSign size={17}/> Dues recorded</div><strong>{currency(stats.collected)}</strong><span>Marked as paid</span></div>
            <div className="stat"><div className="stat-label"><Wallet size={17}/> Outstanding</div><strong>{currency(stats.outstanding)}</strong><span>Not yet marked paid</span></div>
          </section>}
          <div className="directory-actions"><button className="outline" disabled={loading || readFailed || busy} onClick={downloadCsv}>↓ Download CSV</button></div>
          <section className="panel">
            <div className="panel-head"><div><h2>Member directory</h2><p className="muted">Track members and manually record dues.</p></div><div className="search"><Search size={17}/><input aria-label="Search members" placeholder="Search members" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
            {loading ? <p role="status" className="empty">Loading members…</p> : readFailed ? <p className="empty">Records could not be loaded. Use Refresh records to try again.</p> : shown.length ? <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>DUES</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{shown.map(m => <tr key={m.id}><td><strong>{m.name}</strong><small>{m.email}</small></td><td>{currency(m.amount)}</td><td><span className={m.paid ? 'pill paid' : 'pill pending'}>{m.paid ? 'Paid' : 'Unpaid'}</span></td><td><button disabled={busy || loading} className="text-button" onClick={() => togglePaid(m.id)}>{m.paid ? 'Mark unpaid' : 'Mark paid'}</button><button disabled={busy || loading} className="text-button" aria-label={'Edit ' + m.name} onClick={() => openMember(m)}>Edit</button><button disabled={busy || loading} className="icon-button" aria-label={'Remove ' + m.name} onClick={() => removeMember(m.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div> :
            <div className="empty"><div className="empty-icon"><Users size={29}/></div><h3>{search ? 'No matching members' : 'Your nest starts here'}</h3><p>{search ? 'Try a different name or email.' : 'Add your first member to begin tracking dues. No payment setup required.'}</p>{!search && <button disabled={busy || loading} className="outline" onClick={() => openMember()}><Plus size={17}/> Add first member</button>}</div>}
          </section>
          <p className="footnote">Records are saved to your organization’s database. Refresh to see changes from other devices. DuesNest does not collect payments.</p>
        </div>
      </main>
      {showForm && <div className="overlay" onMouseDown={e => { if (!busy && e.target === e.currentTarget) setShowForm(false) }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-head"><h2 id="form-title">{editing ? 'Edit member' : 'Add a member'}</h2><button disabled={busy || loading} className="close" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><p className="muted">Keep track of a person and what they owe.</p><form onSubmit={addMember}><label>Full name<input autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Taylor Morgan"/></label><label>Email address<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="taylor@example.com"/></label><label>Dues amount (USD)<input type="number" min="0" max="1000000" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button disabled={busy || loading} className="outline" type="button" onClick={() => setShowForm(false)}>Cancel</button><button disabled={busy || loading} className="primary" type="submit">Save member</button></div></form></div></div>}
    </div>
  )
}
