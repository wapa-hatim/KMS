import { useState } from 'react'
import { ArrowRight, Check, KeyRound, Layers3, ShieldCheck } from 'lucide-react'
import { CButton } from '@coreui/react'
import { supabase } from '../lib/supabase.js'

export default function PasswordUpdatePage({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) setError(updateError.message)
    else onComplete()
  }

  return (
    <main className="auth-screen">
      <section className="auth-story">
        <div className="auth-brand"><span className="brand-mark"><Layers3 size={20} /></span><span><strong>northstar</strong><small>KNOWLEDGE WORKSPACE</small></span></div>
        <div className="auth-story-content"><span className="auth-overline"><span />ACCOUNT SECURITY</span><h1>Keep your team’s<br />knowledge secure.</h1><p>Choose a strong password to protect your workspace access.</p></div>
        <small className="auth-footnote">NORTHSTAR KNOWLEDGE SYSTEM <span>·</span> SECURE TEAM ACCESS</small>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top"><span>YOUR WORKSPACE</span><span className="auth-secure"><ShieldCheck size={14} />Secure connection</span></div>
        <div className="auth-form-wrap">
          <div className="auth-heading"><span className="auth-form-icon"><KeyRound size={19} /></span><h2>Choose a new password</h2><p>Use at least 8 characters.</p></div>
          <form className="auth-form" onSubmit={submit}>
            <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
            <label>Confirm password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></label>
            {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
            <CButton className="auth-submit" type="submit" disabled={busy}>{busy ? 'Updating password...' : 'Update password'}{!busy && <ArrowRight size={16} />}</CButton>
          </form>
          <div className="auth-access-note"><Check size={15} /><span>Your password will be updated for this account.</span></div>
        </div>
        <p className="auth-legal">By continuing, you agree to your organization’s security and acceptable use policies.</p>
      </section>
    </main>
  )
}