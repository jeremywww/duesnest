import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Auth } from './Auth'
import { Workspace } from './Workspace'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next); setReady(true)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) { setError(error.message); return }
    setSession(null)
  }
  if (!supabase) return <main className="content"><h1>DuesNest</h1><p role="status">DuesNest is not connected yet. Please contact the administrator.</p></main>
  if (!ready) return <main className="content"><p role="status">Loading account…</p></main>
  if (!session || recovery) return <Auth recovery={recovery} onRecovered={() => setRecovery(false)} />
  return <><header className="account-bar"><span>{session.user.email}</span><button className="outline" onClick={signOut}>Sign out</button>{error && <p role="alert">{error}</p>}</header><Workspace key={session.user.id} userId={session.user.id} /></>
}
