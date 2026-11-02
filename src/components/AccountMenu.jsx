import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'

const roleLabels = { owner: 'Workspace owner', editor: 'Editor', viewer: 'Reader' }

function initialsFor(name) {
  if (name.includes('@')) return name[0].toUpperCase()
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export default function AccountMenu({ name, email, role, canSignOut, onRequestSignOut }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function requestSignOut() {
    setOpen(false)
    onRequestSignOut()
  }

  return (
    <div className="account-menu-wrap" ref={menuRef}>
      <button className="header-user-button" type="button" aria-label={`Account details for ${name}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="header-avatar">{initialsFor(name)}</span>
        <span className="header-user-copy"><strong>{name}</strong><small>{roleLabels[role] || 'Workspace member'}</small></span>
        <ChevronDown className="header-user-chevron" size={14} />
      </button>
      {open && <div className="account-menu-panel">
        <div className="account-menu-identity"><span className="account-menu-avatar">{initialsFor(name)}</span><span><strong>{name}</strong><small>{email}</small></span></div>
        <div className="account-menu-role"><ShieldCheck size={15} /><span><small>WORKSPACE ROLE</small><strong>{roleLabels[role] || 'Workspace member'}</strong></span></div>
        {canSignOut && <button className="account-menu-signout" type="button" onClick={requestSignOut}><LogOut size={15} />Sign out</button>}
        {!canSignOut && <p className="account-menu-demo">Demo account · changes are not synced</p>}
      </div>}
    </div>
  )
}