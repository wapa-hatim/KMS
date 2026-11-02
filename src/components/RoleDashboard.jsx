import { ArrowRight, BookOpen, Check, Clock3, FileText, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'

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

export default function RoleDashboard({ role, documents, savedCount, memberCount, collectionsCount, reviewIntervalDays, onCreate }) {
  const currentRole = roleCopy[role] ? role : 'viewer'
  const copy = roleCopy[currentRole]
  const drafts = documents.filter((document) => document.status === 'Draft').length
  const inReview = documents.filter((document) => document.status === 'In review').length
  const published = documents.filter((document) => document.status === 'Published').length
  const reviewDue = documents.filter((document) => document.status === 'Published' && (document.review_due_at ? new Date(document.review_due_at).getTime() <= Date.now() : Date.now() - new Date(document.updated_at).getTime() > reviewIntervalDays * 86400000)).length
  const recentlyUpdated = documents.filter((document) => Date.now() - new Date(document.updated_at).getTime() < 30 * 86400000).length

  const metrics = currentRole === 'owner'
    ? [
      { label: 'Published knowledge', value: published, detail: 'Available to readers', icon: BookOpen, tone: 'kpi-green' },
      { label: 'In review', value: inReview, detail: 'Awaiting approval', icon: Clock3, tone: 'kpi-amber' },
      { label: 'Review overdue', value: reviewDue, detail: `Beyond ${reviewIntervalDays}-day cadence`, icon: FileText, tone: 'kpi-rose' },
      { label: 'Workspace members', value: memberCount, detail: 'Across this workspace', icon: UsersRound, tone: 'kpi-blue' },
    ]
    : currentRole === 'editor'
      ? [
        { label: 'Drafts in progress', value: drafts, detail: 'Ready to improve', icon: FileText, tone: 'kpi-blue' },
        { label: 'In review', value: inReview, detail: 'Awaiting owner approval', icon: Clock3, tone: 'kpi-amber' },
        { label: 'Published guides', value: published, detail: 'Available to readers', icon: Check, tone: 'kpi-green' },
        { label: 'Review overdue', value: reviewDue, detail: `Beyond ${reviewIntervalDays}-day cadence`, icon: Sparkles, tone: 'kpi-rose' },
      ]
      : [
        { label: 'Published to you', value: published, detail: 'Trusted workspace guides', icon: BookOpen, tone: 'kpi-green' },
        { label: 'Saved for later', value: savedCount, detail: 'Your bookmarked pages', icon: Sparkles, tone: 'kpi-amber' },
        { label: 'Collections', value: collectionsCount, detail: 'Browse by topic', icon: FileText, tone: 'kpi-blue' },
        { label: 'Recently updated', value: recentlyUpdated, detail: 'Changed in the last 30 days', icon: Clock3, tone: 'kpi-rose' },
      ]

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
      <div className="role-kpi-grid">{metrics.map(({ label, value, detail, icon: MetricIcon, tone }) => <article className={`role-kpi ${tone}`} key={label}><span className="role-kpi-icon"><MetricIcon size={17} /></span><span className="role-kpi-copy"><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></article>)}</div>
      <div className="role-permission"><span className="permission-check"><ShieldCheck size={15} /></span><span><strong>Your access</strong>{copy.permission}</span></div>
      <details className="permission-details">
        <summary>Compare role permissions</summary>
        <div className="permission-table-wrap"><table className="permission-table"><thead><tr><th>CAPABILITY</th><th>OWNER</th><th>EDITOR</th><th>READER</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.label}><th scope="row">{permission.label}</th>{['owner', 'editor', 'viewer'].map((permissionRole) => <td key={permissionRole}>{permission[permissionRole] ? <Check size={15} aria-label="Allowed" /> : <span aria-label="Not allowed">-</span>}</td>)}</tr>)}</tbody></table></div>
      </details>
    </section>
  )
}
