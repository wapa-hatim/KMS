import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { diffLines } from 'diff'
import { Archive, ArrowDownToLine, Bookmark, BookmarkCheck, Check, Clock3, FileText, History, Pencil, RotateCcw, Send, ShieldCheck, X } from 'lucide-react'

const dateLabel = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))

export default function DocumentReaderDialog({ document, canEdit, canPublish, attachments, versions, loadingHistory, saving, saved, onOpenChange, onEdit, onToggleSaved, onDownload, onStatusChange, onRestore }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const changes = useMemo(() => selectedVersion ? diffLines(selectedVersion.content || '', document?.content || '') : [], [document?.content, selectedVersion])

  async function restoreVersion() {
    if (!selectedVersion) return
    setRestoring(true)
    const restored = await onRestore(selectedVersion)
    setRestoring(false)
    if (restored) setSelectedVersion(null)
  }

  return (
    <Dialog.Root open={Boolean(document)} onOpenChange={onOpenChange}>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content document-dialog">
        {document && <>
          <div className="dialog-heading"><div><span className="dialog-kicker">{document.category.toUpperCase()} <span>/</span> {document.status.toUpperCase()}</span><Dialog.Title>{document.title}</Dialog.Title><Dialog.Description>{document.summary}</Dialog.Description></div><Dialog.Close asChild><button type="button" className="icon-button" aria-label="Close document"><X size={18} /></button></Dialog.Close></div>
          <div className="document-meta"><span className="owner-avatar">{(document.owner_name || 'Team member').split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><strong>{document.owner_name || 'Team member'}</strong><span>Updated {dateLabel(document.updated_at)}</span><span><Clock3 size={14} />{document.read_time} min read</span>{document.tags?.map((tag) => <span className="reader-tag" key={tag}>#{tag}</span>)}</div>
          <div className="document-body markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{document.content || '*No document content yet.*'}</ReactMarkdown></div>
          {attachments.length > 0 && <section className="reader-attachments"><h3>Attachments <span>{attachments.length}</span></h3>{attachments.map((attachment) => <button type="button" key={attachment.id} onClick={() => onDownload(attachment)}><FileText size={16} /><span>{attachment.file_name}<small>{(attachment.byte_size / (1024 * 1024)).toFixed(1)} MB</small></span><ArrowDownToLine size={15} /></button>)}</section>}
          <div className="reader-tools">
            {canEdit && <button type="button" className="secondary-button" onClick={onEdit}><Pencil size={14} />Edit</button>}
            {canEdit && document.status === 'Draft' && <button type="button" className="reader-action-button" disabled={saving} onClick={() => onStatusChange('In review')}><Send size={14} />Submit for review</button>}
            {canPublish && document.status === 'In review' && <button type="button" className="reader-action-button" disabled={saving} onClick={() => onStatusChange('Published')}><Check size={14} />Publish</button>}
            {canPublish && document.status !== 'Archived' && <button type="button" className="reader-archive-button" disabled={saving} onClick={() => onStatusChange('Archived')}><Archive size={14} />Archive</button>}
            <button type="button" className="secondary-button reader-save-button" onClick={onToggleSaved}>{saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}{saved ? 'Saved' : 'Save'}</button>
          </div>
          <section className="revision-section">
            <button type="button" className="revision-toggle" onClick={() => setHistoryOpen((current) => !current)}><History size={15} />Version history <span>{versions.length}</span><span className="revision-toggle-copy">{historyOpen ? 'Hide' : 'View'}</span></button>
            {historyOpen && <div className="revision-content">{loadingHistory ? <div className="admin-loading"><span className="loading-spinner" />Loading revisions...</div> : versions.length ? <>
              <div className="revision-list">{versions.map((version) => <button type="button" className={`revision-item ${selectedVersion?.id === version.id ? 'active' : ''}`} key={version.id} onClick={() => setSelectedVersion(version)}><span><strong>Version {version.version}</strong><small>{dateLabel(version.created_at)} · {version.status || 'Draft'}</small></span><span className="revision-changed-by">{version.changed_by_name || 'Team member'}</span></button>)}</div>
              {selectedVersion && <div className="version-diff"><div className="version-diff-heading"><strong>Version {selectedVersion.version} compared with current</strong>{canEdit && <button type="button" className="secondary-button" disabled={restoring} onClick={restoreVersion}><RotateCcw size={13} />{restoring ? 'Restoring...' : 'Restore this version'}</button>}</div><div className="diff-columns"><div><h4>Selected version</h4><pre>{changes.filter((part) => !part.added).map((part, index) => <span className={part.removed ? 'diff-removed' : ''} key={index}>{part.value}</span>)}</pre></div><div><h4>Current version</h4><pre>{changes.filter((part) => !part.removed).map((part, index) => <span className={part.added ? 'diff-added' : ''} key={index}>{part.value}</span>)}</pre></div></div></div>}
            </> : <p className="report-empty">No earlier revisions are available.</p>}</div>}
          </section>
          <div className="document-dialog-footer"><span><ShieldCheck size={14} />Workspace only</span><span>{saving ? 'Saving status...' : ''}</span></div>
        </>}
      </Dialog.Content></Dialog.Portal></Dialog.Root>
  )
}