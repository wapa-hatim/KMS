import { ArrowRight, BookOpen, Check, Clock3, FileText, ShieldCheck, Sparkles } from 'lucide-react'

const roleCopy = {
  owner: {
    eyebrow: 'WORKSPACE STEWARD',
    title: 'Your workspace, at a glance',
    description: 'Keep company knowledge organized, current, and accessible to the right people.',
    permission: 'You can manage workspace access, edit content, and oversee the knowledge library.',
    action: 'Create a document',
  },
  editor: {
    eyebrow: 'EDITOR DESK',
    title: 'Make good knowledge easier to find',
    description: 'Create and improve team documentation, then keep published guidance up to date.',
    permission: 'You can create and edit documents, and read all knowledge in this workspace.',
    action: 'Write a document',
  },
  viewer: {
    eyebrow: 'READER HOME',
    title: 'Find the context to move forward',
    description: 'Browse trusted answers and save the guidance you return to most.',
    permission: 'You can read and bookmark documents. Editing and publishing are reserved for editors.',
    action: null,
  },
}

const roleNames = { owner: 'Workspace owner', editor: 'Editor', viewer: 'Reader' }
const permissions = [
  { label: 'Read published documents', owner: true, editor: true, viewer: true },
  { label: 'Create and edit documents', owner: true, editor: true, viewer: false },
  { label: 'Manage workspace access', owner: true, editor: false, viewer: false },
]

export default function RoleDashboard({ role, documents, savedCount, onCreate }) {
  const currentRole = roleCopy[role] ? role : 'viewer'
  const copy = roleCopy[currentRole]
  const drafts = documents.filter((document) => document.status === 'Draft').length
  const inReview = documents.filter((document) => document.status === 'In review').length
  const published = documents.filter((document) => document.status === 'Published').length

  return (
    <section className={`role-dashboard role-${currentRole}`} aria-label={`${roleNames[currentRole]} dashboard`}>
      <div className="role-dashboard-main">
        <div className="role-dashboard-copy">
          <div className="role-dashboard-eyebrow"><span className="role-indicator" />{copy.eyebrow}<span className="role-divider">/</span><span className="role-name">{roleNames[currentRole]}</span></div>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        {copy.action && <button className="role-dashboard-action" onClick={onCreate}><span><FileText size={16} /></span>{copy.action}<ArrowRight size={15} /></button>}
      </div>
      <div className="role-metrics">
        <div className="role-metric"><span className="metric-icon metric-blue"><BookOpen size={16} /></span><span><strong>{documents.length}</strong><small>Library documents</small></span></div>
        {currentRole === 'owner' && <>
          <div className="role-metric"><span className="metric-icon metric-amber"><Clock3 size={16} /></span><span><strong>{inReview}</strong><small>In review</small></span></div>
          <div className="role-metric"><span className="metric-icon metric-green"><Check size={16} /></span><span><strong>{published}</strong><small>Published</small></span></div>
        </>}
        {currentRole === 'editor' && <>
          <div className="role-metric"><span className="metric-icon metric-amber"><FileText size={16} /></span><span><strong>{drafts}</strong><small>Drafts to develop</small></span></div>
          <div className="role-metric"><span className="metric-icon metric-green"><Check size={16} /></span><span><strong>{published}</strong><small>Published guides</small></span></div>
        </>}
        {currentRole === 'viewer' && <>
          <div className="role-metric"><span className="metric-icon metric-green"><BookmarkIcon /></span><span><strong>{savedCount}</strong><small>Saved for later</small></span></div>
          <div className="role-metric"><span className="metric-icon metric-amber"><Sparkles size={16} /></span><span><strong>{published}</strong><small>Published guides</small></span></div>
        </>}
      </div>
      <div className="role-permission"><span className="permission-check"><ShieldCheck size={15} /></span><span><strong>Your access</strong>{copy.permission}</span></div>
      <details className="permission-details">
        <summary>Compare role permissions</summary>
        <div className="permission-table-wrap"><table className="permission-table"><thead><tr><th>CAPABILITY</th><th>OWNER</th><th>EDITOR</th><th>READER</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.label}><th scope="row">{permission.label}</th>{['owner', 'editor', 'viewer'].map((permissionRole) => <td key={permissionRole}>{permission[permissionRole] ? <Check size={15} aria-label="Allowed" /> : <span aria-label="Not allowed">-</span>}</td>)}</tr>)}</tbody></table></div>
      </details>
    </section>
  )
}

function BookmarkIcon() {
  return <BookOpen size={16} />
}