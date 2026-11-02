import * as Dialog from '@radix-ui/react-dialog'
import { LogOut, ShieldCheck, X } from 'lucide-react'

export default function SignOutDialog({ open, onOpenChange, onConfirm, loading }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content logout-dialog">
          <div className="logout-dialog-top"><span className="logout-dialog-icon"><LogOut size={18} /></span><Dialog.Close asChild><button className="icon-button" type="button" aria-label="Close sign out dialog"><X size={17} /></button></Dialog.Close></div>
          <Dialog.Title className="logout-dialog-title">Log out of Northstar?</Dialog.Title>
          <Dialog.Description className="logout-dialog-description">You’ll need to sign in again to access your workspace and documents.</Dialog.Description>
          <div className="logout-dialog-security"><ShieldCheck size={15} /><span>Your work is saved and protected.</span></div>
          <div className="logout-dialog-actions"><Dialog.Close asChild><button className="secondary-button" type="button" disabled={loading}>Cancel</button></Dialog.Close><button className="logout-confirm" type="button" disabled={loading} onClick={onConfirm}><LogOut size={14} />{loading ? 'Logging out...' : 'Log out'}</button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}