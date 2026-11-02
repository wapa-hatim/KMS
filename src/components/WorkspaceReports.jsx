import { useMemo } from 'react'
import { Activity, ArrowDownToLine, BookOpen, Check, Clock3, FileText, TrendingUp } from 'lucide-react'

function exportCsv(documents) {
  const rows = [['Title', 'Collection', 'Department', 'Status', 'Owner', 'Last updated']]
  documents.forEach((document) => rows.push([document.title, document.category, document.department, document.status, document.owner_name, document.updated_at]))
  const csv = rows.map((row) => row.map((value) => {
    let text = String(value ?? '')
    if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = Object.assign(document.createElement('a'), { href: url, download: 'northstar-knowledge-report.csv' })
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function WorkspaceReports({ documents, auditEvents, memberCount, requireReview, reviewIntervalDays }) {
  const report = useMemo(() => {
    const now = Date.now()
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000
    const threshold = reviewIntervalDays * 24 * 60 * 60 * 1000
    const published = documents.filter((item) => item.status === 'Published').length
    const inReview = documents.filter((item) => item.status === 'In review').length
    const drafts = documents.filter((item) => item.status === 'Draft').length
    const stale = requireReview ? documents.filter((item) => item.status !== 'In review' && now - new Date(item.updated_at).getTime() > threshold).length : 0
    const recentEvents = auditEvents.filter((item) => new Date(item.created_at).getTime() >= monthAgo)
    const collections = Object.entries(documents.reduce((counts, item) => ({ ...counts, [item.category]: (counts[item.category] || 0) + 1 }), {}))
      .sort((left, right) => right[1] - left[1])
    return { published, inReview, drafts, stale, recentEvents, collections }
  }, [auditEvents, documents, requireReview, reviewIntervalDays])

  const maxCollectionCount = Math.max(1, ...report.collections.map(([, count]) => count))

  return (
    <section className="page-content reports-page">
      <div className="page-intro reports-intro"><div><div className="eyebrow"><span className="live-dot" />WORKSPACE INSIGHTS <span className="eyebrow-divider">/</span> LAST 30 DAYS</div><h1>Reports & analytics</h1><p className="page-subtitle">A current view of your knowledge library and its upkeep.</p></div><button className="admin-secondary-button" onClick={() => exportCsv(documents)}><ArrowDownToLine size={15} />Export CSV</button></div>

      <div className="report-metrics">
        <article className="report-metric"><span className="report-metric-icon report-blue"><BookOpen size={17} /></span><span><small>LIBRARY SIZE</small><strong>{documents.length}</strong><em>documents</em></span></article>
        <article className="report-metric"><span className="report-metric-icon report-green"><Check size={17} /></span><span><small>PUBLISHED</small><strong>{report.published}</strong><em>available to readers</em></span></article>
        <article className="report-metric"><span className="report-metric-icon report-amber"><Clock3 size={17} /></span><span><small>NEEDS ATTENTION</small><strong>{report.inReview + report.stale}</strong><em>{report.inReview} in review · {report.stale} stale</em></span></article>
        <article className="report-metric"><span className="report-metric-icon report-teal"><Activity size={17} /></span><span><small>TEAM ACTIVITY</small><strong>{report.recentEvents.length}</strong><em>{memberCount} workspace members</em></span></article>
      </div>

      <div className="report-grid">
        <section className="report-panel"><div className="report-panel-heading"><div><h2>Collection coverage</h2><p>Documents grouped by collection.</p></div><TrendingUp size={17} /></div>
          {report.collections.length ? <div className="collection-chart">{report.collections.map(([category, count]) => <div className="chart-row" key={category}><span>{category}</span><div className="chart-track"><i style={{ width: `${(count / maxCollectionCount) * 100}%` }} /></div><strong>{count}</strong></div>)}</div> : <p className="report-empty">No documents to report yet.</p>}
        </section>
        <section className="report-panel"><div className="report-panel-heading"><div><h2>Content pipeline</h2><p>Current document lifecycle status.</p></div><FileText size={17} /></div>
          <div className="pipeline-row"><span className="pipeline-dot pipeline-published" />Published <strong>{report.published}</strong><div><i style={{ width: `${documents.length ? (report.published / documents.length) * 100 : 0}%` }} /></div></div>
          <div className="pipeline-row"><span className="pipeline-dot pipeline-review" />In review <strong>{report.inReview}</strong><div><i style={{ width: `${documents.length ? (report.inReview / documents.length) * 100 : 0}%` }} /></div></div>
          <div className="pipeline-row"><span className="pipeline-dot pipeline-draft" />Drafts <strong>{report.drafts}</strong><div><i style={{ width: `${documents.length ? (report.drafts / documents.length) * 100 : 0}%` }} /></div></div>
          <p className="report-footnote">{requireReview ? `Stale content is defined as unchanged beyond ${reviewIntervalDays} days.` : 'Scheduled content review is disabled for this workspace.'}</p>
        </section>
      </div>

      <section className="report-panel activity-panel"><div className="report-panel-heading"><div><h2>Recent document activity</h2><p>Recorded document changes during the last 30 days.</p></div><Activity size={17} /></div>
        {report.recentEvents.length ? <div className="activity-list">{report.recentEvents.slice(0, 8).map((event) => <div className="activity-row" key={event.id}><span className="activity-dot" /><span><strong>{event.action === 'created' ? 'Created' : 'Updated'} a document</strong><small>{event.document_title || 'Workspace document'}</small></span><time>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(event.created_at))}</time></div>)}</div> : <p className="report-empty">No document activity has been recorded in the last 30 days.</p>}
      </section>
    </section>
  )
}