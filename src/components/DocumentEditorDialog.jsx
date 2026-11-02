import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { FilePlus2, FileText, Eye, Pencil, Plus, ShieldCheck, Trash2, Upload, X } from 'lucide-react'

const templates = {
  blank: { label: 'Blank page', content: '' },
  sop: { label: 'Standard operating procedure', content: '## Purpose\n\nDescribe the outcome this procedure supports.\n\n## Before you begin\n\n- Required access\n- Materials or prerequisites\n\n## Procedure\n\n1. First step\n2. Next step\n3. Verify the result\n\n## Ownership and review\n\n- **Owner:**\n- **Review cadence:**\n- **Related resources:**' },
  incident: { label: 'Incident post-mortem', content: '## Incident summary\n\n**Date:**\n**Impact:**\n**Duration:**\n\n## Timeline\n\n| Time | Event |\n| --- | --- |\n| | |\n\n## Root cause\n\n## What went well\n\n## What could improve\n\n## Follow-up actions\n\n- [ ] Action, owner, due date' },
  design: { label: 'System design specification', content: '## Context and goals\n\n## Requirements\n\n### Functional\n\n### Non-functional\n\n## Proposed design\n\n```text\nComponent A -> Component B\n```\n\n## Alternatives considered\n\n## Risks and mitigations\n\n## Open questions' },
  faq: { label: 'Frequently asked questions', content: '## Question one\n\nAnswer with the direct response first. Add links to the source of truth.\n\n## Question two\n\n## Related resources' },
}

const acceptedFiles = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.mp4'
const maxFileSize = 50 * 1024 * 1024

function toForm(document, collections, members) {
  return {
    title: document?.title || '',
    summary: document?.summary || '',
    collectionId: document?.collection_id || collections.find((collection) => collection.name === document?.category)?.id || '',
    department: document?.department || 'Company-wide',
    ownerId: document?.owner_id || members[0]?.user_id || '',
    tags: document?.tags || [],
    templateKey: document?.template_key || 'blank',
    content: document?.content || '',
  }
}

export default function DocumentEditorDialog({ open, onOpenChange, document, collections, members, saving, onSave, onManageCollections }) {
  const [form, setForm] = useState(() => toForm(document, collections, members))
  const [files, setFiles] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [preview, setPreview] = useState(false)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(toForm(document, collections, members))
    setFiles([])
    setTagInput('')
    setPreview(false)
    setFileError('')
  }, [open, document, collections, members])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function addTag(event) {
    event.preventDefault()
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (tag && !form.tags.includes(tag)) updateForm('tags', [...form.tags, tag])
    setTagInput('')
  }

  function selectFiles(event) {
    const selected = [...event.target.files]
    const invalid = selected.find((file) => file.size > maxFileSize)
    if (invalid) {
      setFileError(`${invalid.name} is larger than the 50 MB per-file limit.`)
      return
    }
    setFileError('')
    setFiles((current) => [...current, ...selected.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size))])
    event.target.value = ''
  }

  function submit(event) {
    event.preventDefault()
    onSave({ ...form, files, read_time: Math.max(1, Math.ceil(form.content.trim().split(/\s+/).length / 200)) })
  }

  const selectedTemplate = templates[form.templateKey] || templates.blank

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content document-editor-dialog">
          <div className="dialog-heading"><div><span className="dialog-kicker">{document ? 'DOCUMENT WORKSPACE' : 'KNOWLEDGE LIBRARY'}</span><Dialog.Title>{document ? 'Edit document' : 'New document'}</Dialog.Title><Dialog.Description>Write in Markdown, organize the page, and attach source files.</Dialog.Description></div><Dialog.Close asChild><button type="button" className="icon-button" aria-label="Close editor"><X size={18} /></button></Dialog.Close></div>
          <form className="document-form editor-form" onSubmit={submit}>
            <div className="editor-form-top"><label>Template<select value={form.templateKey} onChange={(event) => { const templateKey = event.target.value; updateForm('templateKey', templateKey); if (!form.content || window.confirm('Replace the current content with this template?')) updateForm('content', templates[templateKey].content) }}>{Object.entries(templates).map(([key, template]) => <option value={key} key={key}>{template.label}</option>)}</select></label><span className="format-indicator">Markdown · GFM</span></div>
            <label>Title<input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="e.g. How we run customer interviews" required maxLength={120} autoFocus /></label>
            <label>Short description<input value={form.summary} onChange={(event) => updateForm('summary', event.target.value)} placeholder="What will someone find in this document?" required maxLength={180} /></label>
            <div className="form-two-col editor-meta-grid">
              <label>Collection<select value={form.collectionId} onChange={(event) => updateForm('collectionId', event.target.value)} required><option value="" disabled>Select a collection</option>{collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label>
              <label>Department<input value={form.department} onChange={(event) => updateForm('department', event.target.value)} placeholder="Company-wide" maxLength={60} /></label>
              <label>Content owner<select value={form.ownerId} onChange={(event) => updateForm('ownerId', event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option value={member.user_id} key={member.user_id}>{member.full_name || member.email || 'Team member'}</option>)}</select></label>
              <label>Tags<input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') addTag(event) }} placeholder="Type a tag and press Enter" /></label>
            </div>
            {form.tags.length > 0 && <div className="document-tags">{form.tags.map((tag) => <button type="button" className="document-tag" key={tag} onClick={() => updateForm('tags', form.tags.filter((item) => item !== tag))}>#{tag}<X size={11} /></button>)}</div>}
            <div className="editor-toolbar"><span>CONTENT</span><div><button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(false)}><Pencil size={13} />Write</button><button type="button" className={!preview ? '' : 'active'} onClick={() => setPreview(true)}><Eye size={13} />Preview</button></div></div>
            {preview ? <div className="markdown-preview editor-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{form.content || '*Nothing to preview yet.*'}</ReactMarkdown></div> : <label className="sr-only" htmlFor="document-content">Markdown document content</label>}
            {!preview && <textarea id="document-content" className="markdown-input" value={form.content} onChange={(event) => updateForm('content', event.target.value)} placeholder={selectedTemplate.content || '## Start with the answer\n\nAdd helpful context, links, lists, and code blocks...'} rows="11" required />}
            <div className="attachment-picker">
              <label className="attachment-select"><input type="file" accept={acceptedFiles} multiple onChange={selectFiles} /><span><Upload size={15} />Select files</span><small>PDF, DOCX, PPTX, text, images, MP4 · max 50 MB each</small></label>
              {files.length > 0 && <div className="selected-files">{files.map((file, index) => <div className="selected-file" key={`${file.name}-${file.size}`}><FileText size={14} /><span>{file.name}<small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><Trash2 size={13} /></button></div>)}</div>}
              {fileError && <p className="file-error" role="alert">{fileError}</p>}
            </div>
            <div className="form-footer editor-form-footer"><span><ShieldCheck size={14} />Private to your workspace</span><div><Dialog.Close asChild><button type="button" className="secondary-button">Cancel</button></Dialog.Close><button className="create-button btn" type="submit" disabled={saving || !collections.length}><FilePlus2 size={15} />{saving ? 'Saving...' : document ? 'Save changes' : 'Create draft'}</button></div></div>
            {!collections.length && <button className="create-collection-inline" type="button" onClick={onManageCollections}><Plus size={14} />Create a collection before adding a document</button>}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}