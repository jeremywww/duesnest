import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bird, Check, CircleDollarSign, Plus, Search, Trash2, Users, Wallet } from 'lucide-react'

type Member = { id: string; name: string; email: string; amount: number; paid: boolean }
const STORAGE_KEY = 'duesnest:members:v1'

function readMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is Member =>
      typeof x === 'object' && x !== null &&
      typeof x.id === 'string' && typeof x.name === 'string' &&
      typeof x.email === 'string' && typeof x.amount === 'number' &&
      Number.isFinite(x.amount) && typeof x.paid === 'boolean'
    )
  } catch { return [] }
}

const currency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export default function App() {
  const [members, setMembers] = useState<Member[]>(readMembers)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('50')
  const [error, setError] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(members)) }, [members])

  const stats = useMemo(() => ({
    total: members.length,
    paid: members.filter(m => m.paid).length,
    collected: members.filter(m => m.paid).reduce((n, m) => n + m.amount, 0),
    outstanding: members.filter(m => !m.paid).reduce((n, m) => n + m.amount, 0)
  }), [members])

  const shown = members.filter(m => (m.name + ' ' + m.email).toLowerCase().includes(search.toLowerCase()))

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dollars = Number(amount)
    if (!name.trim() || !email.trim() || !email.includes('@') || !Number.isFinite(dollars) || dollars < 0 || dollars > 1000000) {
      setError('Enter a name, a valid email, and a dues amount between $0 and $1,000,000.')
      return
    }
    setMembers(prev => [...prev, { id: crypto.randomUUID(), name: name.trim(), email: email.trim(), amount: Math.round(dollars * 100) / 100, paid: false }])
    setName(''); setEmail(''); setAmount('50'); setError(''); setShowForm(false)
  }

  function togglePaid(id: string) { setMembers(prev => prev.map(m => m.id === id ? { ...m, paid: !m.paid } : m)) }
  function removeMember(id: string) {
    if (window.confirm('Remove this member?')) setMembers(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon"><Bird size={23} strokeWidth={2.6}/></span><span>duesnest<span className="brand-dot">.</span></span></div>
        <div className="nav-section">WORKSPACE</div>
        <div className="nav-item active"><Users size={19}/> Members</div>
        <div className="sidebar-bottom"><span className="status-dot"/> Your personal workspace <small>Local preview · v0.1</small></div>
      </aside>
      <main className="main">
        <header className="topbar"><span>Overview <span className="crumb">/ Members</span></span><span className="topbadge">Membership management</span></header>
        <div className="content">
          <div className="heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Members & dues</h1><p className="muted">A simple home for your members and their dues status.</p></div><button className="primary" onClick={() => setShowForm(true)}><Plus size={18}/> Add member</button></div>
          <section className="stats">
            <div className="stat"><div className="stat-label"><Users size={17}/> Total members</div><strong>{stats.total}</strong><span>People in your directory</span></div>
            <div className="stat"><div className="stat-label"><Check size={17}/> Paid members</div><strong>{stats.paid}</strong><span>{stats.total ? Math.round(stats.paid / stats.total * 100) : 0}% up to date</span></div>
            <div className="stat"><div className="stat-label"><CircleDollarSign size={17}/> Dues recorded</div><strong>{currency(stats.collected)}</strong><span>Marked as paid</span></div>
            <div className="stat"><div className="stat-label"><Wallet size={17}/> Outstanding</div><strong>{currency(stats.outstanding)}</strong><span>Not yet marked paid</span></div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Member directory</h2><p className="muted">Track members and manually record dues.</p></div><div className="search"><Search size={17}/><input aria-label="Search members" placeholder="Search members" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
            {shown.length ? <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>DUES</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{shown.map(m => <tr key={m.id}><td><strong>{m.name}</strong><small>{m.email}</small></td><td>{currency(m.amount)}</td><td><span className={m.paid ? 'pill paid' : 'pill pending'}>{m.paid ? 'Paid' : 'Unpaid'}</span></td><td><button className="text-button" onClick={() => togglePaid(m.id)}>{m.paid ? 'Mark unpaid' : 'Mark paid'}</button><button className="icon-button" aria-label={'Remove ' + m.name} onClick={() => removeMember(m.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div> :
            <div className="empty"><div className="empty-icon"><Users size={29}/></div><h3>{search ? 'No matching members' : 'Your nest starts here'}</h3><p>{search ? 'Try a different name or email.' : 'Add your first member to begin tracking dues. No payment setup required.'}</p>{!search && <button className="outline" onClick={() => setShowForm(true)}><Plus size={17}/> Add first member</button>}</div>}
          </section>
          <p className="footnote">Preview only: data is stored in this browser, not synced across devices. Duesnest does not collect payments.</p>
        </div>
      </main>
      {showForm && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false) }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-head"><h2 id="form-title">Add a member</h2><button className="close" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><p className="muted">Keep track of a person and what they owe.</p><form onSubmit={addMember}><label>Full name<input autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Taylor Morgan"/></label><label>Email address<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="taylor@example.com"/></label><label>Dues amount (USD)<input type="number" min="0" max="1000000" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button className="outline" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary" type="submit">Save member</button></div></form></div></div>}
    </div>
  )
}
