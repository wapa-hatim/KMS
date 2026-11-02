import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, KeyRound, Layers3, Mail, ShieldCheck } from 'lucide-react'
import { CButton } from '@coreui/react'
import { supabase } from '../lib/supabase.js'

const messages = {
  signin: { title: 'Welcome back', description: 'Sign in to pick up where your team left off.' },
  signup: { title: 'Create your account', description: 'Join your team’s private knowledge workspace.' },
  reset: { title: 'Reset your password', description: 'We’ll send a secure password reset link to your inbox.' },
}

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    let result
    if (mode === 'signup') {
      result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (!result.error) setNotice('Account created. Check your email to confirm your address, then sign in.')
    } else if (mode === 'reset') {
      result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
      if (!result.error) setNotice('Password reset instructions are on their way.')
    } else {
      result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    }

    if (result?.error) setError(result.error.message)
    setBusy(false)
  }

  const copy = messages[mode]

  return (
    <main className="auth-screen">
      <section className="auth-story">
        <div className="auth-brand"><span className="brand-mark"><Layers3 size={20} /></span><span><strong>northstar</strong><small>KNOWLEDGE WORKSPACE</small></span></div>
        <div className="auth-story-content">
          <span className="auth-overline"><span />A CLEARER WAY TO WORK</span>
          <h1>Good work deserves<br />to be remembered.</h1>
          <p>Bring your team’s answers, decisions, and expertise into one trusted place.</p>
          <div className="auth-story-rule" />
          <div className="auth-benefit"><span><BookOpen size={16} /></span><div><strong>Knowledge that stays useful</strong><small>Find the context behind the work.</small></div></div>
          <div className="auth-benefit"><span><ShieldCheck size={16} /></span><div><strong>Private by design</strong><small>Access follows your workspace role.</small></div></div>
        </div>
        <small className="auth-footnote">NORTHSTAR KNOWLEDGE SYSTEM <span>·</span> SECURE TEAM ACCESS</small>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top"><span>YOUR WORKSPACE</span><span className="auth-secure"><ShieldCheck size={14} />Secure connection</span></div>
        <div className="auth-form-wrap">
          <div className="auth-heading"><span className="auth-form-icon">{mode === 'reset' ? <KeyRound size={19} /> : <Mail size={19} />}</span><h2>{copy.title}</h2><p>{copy.description}</p></div>

          {mode !== 'reset' && <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'selected' : ''} onClick={() => { setMode('signin'); setError(''); setNotice('') }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setNotice('') }}>Create account</button>
          </div>}

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" required maxLength={100} /></label>}
            <label>Work email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
            {mode !== 'reset' && <label>Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>}
            {mode === 'signin' && <button className="forgot-link" type="button" onClick={() => { setMode('reset'); setError(''); setNotice('') }}>Forgot password?</button>}
            {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-feedback auth-notice" role="status"><Check size={15} />{notice}</p>}
            <CButton className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'signin' ? 'Sign in to workspace' : mode === 'signup' ? 'Create account' : 'Send reset link'}<ArrowRight size={16} /></CButton>
          </form>

          {mode === 'reset' && <button className="back-to-signin" onClick={() => { setMode('signin'); setError(''); setNotice('') }}><ArrowLeft size={14} />Back to sign in</button>}
          <div className="auth-access-note"><ShieldCheck size={15} /><span>New accounts need an invitation from a workspace owner before documents are available.</span></div>
        </div>
        <p className="auth-legal">By continuing, you agree to your organization’s security and acceptable use policies.</p>
      </section>
    </main>
  )
}