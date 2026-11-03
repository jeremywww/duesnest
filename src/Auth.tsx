import { errorMessage } from './errors'
import { useState, type FormEvent } from 'react'
import { supabase } from './supabase'

export function Auth({ recovery = false, onRecovered }: { recovery?: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        onRecovered()
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setMessage('Check your email to confirm your account, then sign in.')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setMessage('If an account exists, a password reset link has been sent.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) { setError(errorMessage(e, 'Unable to complete this request. Please try again.')) }
    finally { setBusy(false) }
  }
  const title = recovery ? 'Choose a new password' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to DuesNest'
  return <main className="auth-shell"><div className="modal"><h1>DuesNest</h1><h2>{title}</h2><p className="muted">Your organizations, members, and dues in one place.</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      {!recovery && <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {(recovery || mode !== 'reset') && <label>Password<input type="password" required minLength={mode === 'signin' && !recovery ? 1 : 12} autoComplete={mode === 'signin' && !recovery ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>}
      {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}
      <button className="primary" type="submit">{busy ? 'Please wait…' : recovery ? 'Save password' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
      {!recovery && <div className="auth-links">{(['signin', 'signup', 'reset'] as const).filter(x => x !== mode).map(x => <button type="button" className="text-button" key={x} onClick={() => { setMode(x); setMessage(''); setError(''); setPassword('') }}>{x === 'signin' ? 'Sign in' : x === 'signup' ? 'Create account' : 'Forgot password?'}</button>)}</div>}
    </fieldset></form></div></main>
}
