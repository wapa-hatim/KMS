import { useEffect, useState } from 'react'
import { Building2, Check, Clock3, MailPlus, Settings2, ShieldCheck, Trash2, UsersRound } from 'lucide-react'

const roleLabels = { owner: 'Owner', editor: 'Editor', viewer: 'Reader' }

export default function WorkspaceAdmin({
  activeTab,
  workspaceId,
  workspaceName,
  requireReview,
  reviewIntervalDays,
  members,
  invitations,
  loading,
  saving,
  inviting,
  currentUserId,
  onTabChange,
  onSaveSettings,
  onInvite,
  onRoleChange,
  onRemoveMember,
  onRevokeInvitation,
}) {
  const [name, setName] = useState(workspaceName)
  const [reviewEnabled, setReviewEnabled] = useState(requireReview)
  const [reviewInterval, setReviewInterval] = useState(String(reviewIntervalDays))
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setName(workspaceName)
    setReviewEnabled(requireReview)
    setReviewInterval(String(reviewIntervalDays))
  }, [workspaceName, requireReview, reviewIntervalDays])

  async function submitInvite(event) {
    event.preventDefault()
    const result = await onInvite(email.trim(), inviteRole)
    if (result) {
      setEmail('')
      setNotice(`Invitation sent to ${email.trim()}.`)
    }
  }

  function submitSettings(event) {
    event.preventDefault()
    onSaveSettings({ name: name.trim(), requireReview: reviewEnabled, reviewIntervalDays: Number(reviewInterval) })
  }

  return (
    <section className="page-content admin-page">
      <div className="page-intro admin-page-intro">
        <div><div className="eyebrow"><span className="live-dot" />WORKSPACE ADMINISTRATION</div><h1>{activeTab === 'people' ? 'People & access' : 'Workspace settings'}</h1><p className="page-subtitle">Manage membership, access levels, and workspace defaults.</p></div>
        <span className="admin-workspace-chip"><Building2 size={15} />{workspaceName}</span>
      </div>

      <nav className="admin-tabs" aria-label="Workspace administration">
        <button className={activeTab === 'people' ? 'active' : ''} onClick={() => onTabChange('people')}><UsersRound size={15} />People</button>
        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => onTabChange('settings')}><Settings2 size={15} />Settings</button>
      </nav>

      {activeTab === 'people' ? <div className="admin-content">
        <section className="admin-section">
          <div className="admin-section-heading"><div><h2>Invite a teammate</h2><p>They’ll receive a secure sign-in link and join with the selected role.</p></div><span className="admin-section-icon"><MailPlus size={17} /></span></div>
          <form className="invite-form" onSubmit={submitInvite}>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" required /></label>
            <label>Workspace role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="viewer">Reader</option><option value="editor">Editor</option></select></label>
            <button type="submit" className="admin-primary-button" disabled={inviting}><MailPlus size={15} />{inviting ? 'Sending...' : 'Send invite'}</button>
          </form>
          {notice && <p className="admin-notice" role="status"><Check size={14} />{notice}</p>}
          <p className="admin-hint"><ShieldCheck size={14} />Only workspace owners can invite members or change access roles.</p>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><h2>Workspace members <span>{members.length}</span></h2><p>Access applies only to this workspace.</p></div><UsersRound className="admin-heading-icon" size={18} /></div>
          {loading ? <div className="admin-loading"><span className="loading-spinner" />Loading members...</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>MEMBER</th><th>ROLE</th><th>JOINED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {members.map((member) => <tr key={member.user_id}>
              <td><div className="member-identity"><span className="member-avatar">{(member.full_name || member.email || '?').slice(0, 1).toUpperCase()}</span><span><strong>{member.full_name || 'Team member'}</strong><small>{member.email || member.user_id}</small></span></div></td>
              <td><select className="member-role-select" aria-label={`Role for ${member.full_name || member.email || 'member'}`} value={member.role} disabled={member.user_id === currentUserId && members.filter((item) => item.role === 'owner').length === 1} onChange={(event) => onRoleChange(member.user_id, event.target.value)}>{Object.entries(roleLabels).map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select></td>
              <td className="member-date">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(member.created_at))}</td>
              <td><button className="member-remove" type="button" aria-label={`Remove ${member.full_name || member.email || 'member'}`} disabled={member.user_id === currentUserId} onClick={() => onRemoveMember(member)}><Trash2 size={15} /></button></td>
            </tr>)}
            {!members.length && <tr><td colSpan="4" className="admin-empty">No members found for this workspace.</td></tr>}
          </tbody></table></div>}
        </section>

        <section className="admin-section pending-section">
          <div className="admin-section-heading"><div><h2>Pending invitations <span>{invitations.length}</span></h2><p>Invitations expire after seven days.</p></div><Clock3 className="admin-heading-icon" size={18} /></div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>EMAIL</th><th>ROLE</th><th>SENT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {invitations.map((invitation) => {
              const expired = new Date(invitation.expires_at) <= new Date()
              return <tr key={invitation.id}><td className="invite-email">{invitation.invited_email}</td><td>{roleLabels[invitation.role]}</td><td className={`member-date ${expired ? 'invitation-expired' : ''}`}>{expired ? 'Expired' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(invitation.created_at))}</td><td><button className="member-remove" type="button" aria-label={`Revoke invitation for ${invitation.invited_email}`} onClick={() => onRevokeInvitation(invitation)}><Trash2 size={15} /></button></td></tr>
            })}
            {!invitations.length && <tr><td colSpan="4" className="admin-empty">No pending invitations.</td></tr>}
          </tbody></table></div>
        </section>
      </div> : <div className="admin-content settings-content">
        <section className="admin-section">
          <div className="admin-section-heading"><div><h2>General</h2><p>Update your workspace identity and content review cadence.</p></div><span className="admin-section-icon"><Building2 size={17} /></span></div>
          <form className="settings-form" onSubmit={submitSettings}>
            <label>Workspace name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
            <label className="review-toggle"><span><strong>Require scheduled review</strong><small>Track content that has passed its review interval.</small></span><input type="checkbox" checked={reviewEnabled} onChange={(event) => setReviewEnabled(event.target.checked)} /></label>
            <label>Content review interval<select value={reviewInterval} disabled={!reviewEnabled} onChange={(event) => setReviewInterval(event.target.value)}><option value="90">Every 90 days</option><option value="180">Every 180 days</option><option value="365">Every 365 days</option></select><small>Reports flag documents older than this interval for review.</small></label>
            <div className="settings-form-footer"><span><ShieldCheck size={14} />Role access is enforced by Supabase row-level security.</span><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button></div>
          </form>
        </section>
        <section className="admin-section access-summary"><div className="admin-section-heading"><div><h2>Role access</h2><p>Permissions currently applied to this workspace.</p></div><ShieldCheck className="admin-heading-icon" size={18} /></div>
          <div className="settings-role-row"><strong>Owner</strong><span>Manage members and settings; create, edit, publish, and archive content.</span></div>
          <div className="settings-role-row"><strong>Editor</strong><span>Create and edit documents; read published and in-review content.</span></div>
          <div className="settings-role-row"><strong>Reader</strong><span>Read published documents and manage personal bookmarks.</span></div>
          <p className="workspace-id">Workspace ID <code>{workspaceId}</code></p>
        </section>
      </div>}
    </section>
  )
}