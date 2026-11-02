import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { CButton } from '@coreui/react'
import {
  ArrowDownUp, ArrowRight, Bell, Bookmark, BookmarkCheck, BookOpen,
  ChartNoAxesColumn, Check, ChevronDown, ChevronRight, CircleHelp, Clock3,
  FileText, Filter, FolderKanban, Layers3, LifeBuoy, LogOut, Menu, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, Sparkles, X,
  UsersRound,
} from 'lucide-react'
import { useSupabaseSession } from './auth/useSupabaseSession.js'
import RoleDashboard from './components/RoleDashboard.jsx'
import AccountMenu from './components/AccountMenu.jsx'
import SignOutDialog from './components/SignOutDialog.jsx'
import WorkspaceAdmin from './components/WorkspaceAdmin.jsx'
import WorkspaceReports from './components/WorkspaceReports.jsx'
import CollectionManagerDialog from './components/CollectionManagerDialog.jsx'
import DocumentEditorDialog from './components/DocumentEditorDialog.jsx'
import DocumentReaderDialog from './components/DocumentReaderDialog.jsx'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

const AuthPage = lazy(() => import('./auth/AuthPage.jsx'))
const PasswordUpdatePage = lazy(() => import('./auth/PasswordUpdatePage.jsx'))

const seedDocuments = [
  { id: 'd1', title: 'Customer escalation playbook', summary: 'A practical path from first response to a confident resolution.', category: 'Playbooks', department: 'Customer success', updated_at: '2026-10-28T10:00:00Z', owner_name: 'Maya Chen', read_time: 8, status: 'Published', content: 'Start by acknowledging the impact and setting a clear next update time. Confirm the customer, affected workspace, and severity before routing the issue.\n\nFor a P1 incident, page the on-call lead and open an incident channel. Keep customer updates factual, brief, and on a predictable cadence.\n\nBefore closing, summarize the cause, resolution, and follow-up owner. Add a short note to the incident log so the next team has the full context.' },
  { id: 'd2', title: 'Q4 product launch checklist', summary: 'Owners, dependencies, and launch-day checks for product releases.', category: 'Operations', department: 'Product', updated_at: '2026-10-27T15:00:00Z', owner_name: 'Noah Williams', read_time: 6, status: 'In review', content: 'Confirm launch scope and decision owner. Validate release notes, support readiness, analytics events, and rollback criteria.\n\nOn launch day, verify the release in production, watch the agreed health metrics, and post a concise status update to the launch channel.' },
  { id: 'd3', title: 'Writing that works at Northstar', summary: 'Our lightweight guide to clear, useful internal documentation.', category: 'Guides', department: 'People & culture', updated_at: '2026-10-26T09:30:00Z', owner_name: 'Iris Patel', read_time: 5, status: 'Published', content: 'Write for the person who needs to act, not the person who wrote the document. Put the decision or next step first, then add context.\n\nUse descriptive headings, short paragraphs, and links to source material. Name an owner and review date so useful content stays useful.' },
  { id: 'd4', title: 'Security incident response', summary: 'Triage, contain, communicate, and document a security event.', category: 'Playbooks', department: 'Security', updated_at: '2026-10-24T11:00:00Z', owner_name: 'Andre Lewis', read_time: 11, status: 'Published', content: 'Report suspected security incidents immediately through the security response channel. Preserve evidence and avoid making changes that could obscure the timeline.\n\nThe incident lead assigns severity, coordinates containment, and records decisions. Share only confirmed information with impacted teams.' },
  { id: 'd5', title: 'New teammate onboarding map', summary: 'A first-month path through the people, tools, and work that matter.', category: 'People', department: 'People & culture', updated_at: '2026-10-22T13:00:00Z', owner_name: 'Sofia Martin', read_time: 7, status: 'Published', content: 'Week one is about access, introductions, and understanding the team’s purpose. In weeks two and three, shadow a real workflow and take on a small, well-scoped task.\n\nAt the end of the month, meet with your manager to review what is clear, what is blocked, and what you want to learn next.' },
  { id: 'd6', title: 'Research repository: interview notes', summary: 'Where research lives and how to keep participant notes organized.', category: 'Research', department: 'Design', updated_at: '2026-10-20T08:30:00Z', owner_name: 'Ethan Brooks', read_time: 4, status: 'Published', content: 'Store approved notes in the research repository. Use the project name and interview date in each entry, and remove direct identifiers before sharing broadly.\n\nLink observations to the research question and note whether a finding is a quote, an observation, or an interpretation.' },
]

const seedCollections = [
  { id: 'demo-playbooks', name: 'Playbooks', description: 'Repeatable ways of working', parent_id: null },
  { id: 'demo-guides', name: 'Guides', description: 'Practical team guidance', parent_id: null },
  { id: 'demo-operations', name: 'Operations', description: 'How we run the business', parent_id: null },
  { id: 'demo-people', name: 'People', description: 'People and culture resources', parent_id: null },
  { id: 'demo-research', name: 'Research', description: 'Research notes and findings', parent_id: null },
]
const dateLabel = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))

function mapDocument(document, availableCollections = []) {
  const collection = availableCollections.find((item) => item.id === document.collection_id)
  return {
    ...document,
    category: collection?.name || document.category || 'General',
    collection_name: collection?.name || document.category || 'General',
    summary: document.summary || '',
    department: document.department || 'Company-wide',
    owner_name: document.owner_name || 'Team member',
    read_time: document.read_time || 5,
    status: document.status || 'Published',
    content: document.content || '',
    tags: document.tags || [],
    attachments: document.attachments || [],
  }
}

function IconButton({ label, className = '', children, ...props }) {
  return <button aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>
}

function App() {
  const [documents, setDocuments] = useState(seedDocuments)
  const [collections, setCollections] = useState(seedCollections)
  const [activeSection, setActiveSection] = useState('library')
  const [activeCategory, setActiveCategory] = useState('All collections')
  const [activeView, setActiveView] = useState('All knowledge')
  const [query, setQuery] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorDocument, setEditorDocument] = useState(null)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [collectionSaving, setCollectionSaving] = useState(false)
  const [documentSaving, setDocumentSaving] = useState(false)
  const [documentAttachments, setDocumentAttachments] = useState([])
  const [documentVersions, setDocumentVersions] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { session, loading: sessionLoading, recoveryRequired, setRecoveryRequired } = useSupabaseSession()
  const [spaceId, setSpaceId] = useState(null)
  const [spaceName, setSpaceName] = useState('Northstar, Inc.')
  const [requireReview, setRequireReview] = useState(true)
  const [reviewIntervalDays, setReviewIntervalDays] = useState(180)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [auditEvents, setAuditEvents] = useState([])
  const [preferredSpaceId, setPreferredSpaceId] = useState(null)
  const [pendingInviteToken, setPendingInviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite'))
  const [adminSaving, setAdminSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [role, setRole] = useState('owner')
  const [savedIds, setSavedIds] = useState(() => JSON.parse(localStorage.getItem('northstar-saved') || '["d1","d4"]'))
  const [recentIds, setRecentIds] = useState(() => JSON.parse(localStorage.getItem('northstar-recent') || '[]'))
  const [oldestFirst, setOldestFirst] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const categories = useMemo(() => ['All collections', ...collections.map((collection) => collection.name)], [collections])

  useEffect(() => {
    if (!supabase || !session || !pendingInviteToken) return undefined
    let active = true
    supabase.rpc('accept_space_invitation', { invitation_token: pendingInviteToken }).then(({ data: invitedSpaceId, error }) => {
      if (!active) return
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('invite')
      window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`)
      setPendingInviteToken(null)
      if (error) setToast(`Could not accept invitation: ${error.message}`)
      else {
        setToast('Workspace invitation accepted.')
        setPreferredSpaceId(invitedSpaceId)
      }
    }).catch(() => {
      if (active) setToast('Could not accept invitation. Please try the link again.')
    })
    return () => { active = false }
  }, [session, pendingInviteToken])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSpaceId(null)
      setRole('owner')
      setDocuments(seedDocuments)
      setCollections(seedCollections)
      setRequireReview(true)
      setMembers([
        { user_id: 'demo-maya', role: 'owner', full_name: 'Maya Chen', email: 'maya@northstar.example', created_at: '2026-03-10T12:00:00Z' },
        { user_id: 'demo-noah', role: 'editor', full_name: 'Noah Williams', email: 'noah@northstar.example', created_at: '2026-05-04T12:00:00Z' },
        { user_id: 'demo-iris', role: 'viewer', full_name: 'Iris Patel', email: 'iris@northstar.example', created_at: '2026-06-15T12:00:00Z' },
      ])
      setAuditEvents(seedDocuments.slice(0, 4).map((document, index) => ({ id: `demo-event-${index}`, action: index === 3 ? 'created' : 'updated', document_id: document.id, document_title: document.title, created_at: document.updated_at })))
      setLoading(false)
      return
    }
    if (!session) {
      setSpaceId(null)
      setDocuments([])
      setCollections([])
      setMembers([])
      setInvitations([])
      setAuditEvents([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    let membershipQuery = supabase.from('space_members').select('space_id,role').eq('user_id', session.user.id)
    if (preferredSpaceId) membershipQuery = membershipQuery.eq('space_id', preferredSpaceId)
    membershipQuery.limit(1).maybeSingle().then(async ({ data: membership, error }) => {
      if (!active) return
      if (error || !membership) {
        setSpaceId(null)
        setRole('viewer')
        setDocuments([])
        setToast(error ? 'Could not load your access. Check your membership and try again.' : 'No workspace is assigned to this account yet. Ask an owner for access.')
        setLoading(false)
        return
      }
      setSpaceId(membership.space_id)
      setRole(membership.role)
      const { data: space } = await supabase.from('spaces').select('name,require_review,review_interval_days').eq('id', membership.space_id).single()
      if (!active) return
      setSpaceName(space?.name || 'Knowledge workspace')
      setRequireReview(space?.require_review ?? true)
      setReviewIntervalDays(space?.review_interval_days || 180)
      const [collectionResult, documentResult] = await Promise.all([
        supabase.from('collections').select('id,name,description,parent_id,created_at').eq('space_id', membership.space_id).is('archived_at', null).order('name'),
        supabase.from('documents').select('id,title,summary,content,category,department,updated_at,owner_name,read_time,status,collection_id,owner_id,tags,template_key,content_format,review_due_at').eq('space_id', membership.space_id).order('updated_at', { ascending: false }),
      ])
      if (!active) return
      const collectionRows = collectionResult.data || []
      setCollections(collectionRows)
      const { data, error: documentsError } = documentResult
      if (documentsError) {
        setDocuments([])
        setToast('Could not load your documents. Check your space permissions and try again.')
      } else {
        const [memberResult, auditResult, invitationResult, attachmentResult] = await Promise.all([
          supabase.from('space_members').select('user_id,role,created_at').eq('space_id', membership.space_id),
          supabase.from('audit_events').select('id,action,document_id,actor_id,created_at').eq('space_id', membership.space_id).order('created_at', { ascending: false }).limit(100),
          membership.role === 'owner'
            ? supabase.from('space_invitations').select('id,invited_email,role,created_at,expires_at').eq('space_id', membership.space_id).is('accepted_at', null).order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          supabase.from('document_attachments').select('id,document_id,storage_path,file_name,mime_type,byte_size,created_at').eq('space_id', membership.space_id).order('created_at', { ascending: false }),
        ])
        if (!active) return
        const memberRows = memberResult.data || []
        const profileResult = memberRows.length
          ? await supabase.from('profiles').select('user_id,email,full_name').in('user_id', memberRows.map((member) => member.user_id))
          : { data: [] }
        const profilesByUser = new Map((profileResult.data || []).map((profile) => [profile.user_id, profile]))
        setMembers(memberRows.map((member) => ({ ...member, ...profilesByUser.get(member.user_id) })))
        setInvitations(invitationResult.data || [])
        const attachmentsByDocument = new Map()
        ;(attachmentResult.data || []).forEach((attachment) => attachmentsByDocument.set(attachment.document_id, [...(attachmentsByDocument.get(attachment.document_id) || []), attachment]))
        const documentsWithAttachments = (data || []).map((document) => ({ ...document, attachments: attachmentsByDocument.get(document.id) || [] }))
        const mappedDocuments = documentsWithAttachments.map((document) => {
          const owner = profilesByUser.get(document.owner_id)
          return mapDocument({ ...document, owner_name: owner?.full_name || document.owner_name }, collectionRows)
        })
        setDocuments(mappedDocuments)
        const titlesByDocument = new Map(mappedDocuments.map((document) => [document.id, document.title]))
        setAuditEvents((auditResult.data || []).map((event) => ({ ...event, document_title: titlesByDocument.get(event.document_id) || 'Workspace document' })))
      }
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setDocuments([])
      setToast('Could not connect to your workspace.')
      setLoading(false)
    })
    return () => { active = false }
  }, [preferredSpaceId, session])

  useEffect(() => {
    localStorage.setItem('northstar-saved', JSON.stringify(savedIds))
  }, [savedIds])

  useEffect(() => {
    localStorage.setItem('northstar-recent', JSON.stringify(recentIds.slice(0, 30)))
  }, [recentIds])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return documents.filter((document) => {
      const matchesCategory = activeCategory === 'All collections' || document.category === activeCategory
      const matchesView = activeView !== 'My bookmarks' || savedIds.includes(document.id)
      const matchesRecent = activeView !== 'Recently viewed' || recentIds.includes(document.id)
      const matchesSearch = !normalizedQuery || [document.title, document.summary, document.content, document.category, document.department, document.owner_name, ...(document.tags || [])].some((value) => value?.toLowerCase().includes(normalizedQuery))
      return matchesCategory && matchesView && matchesRecent && matchesSearch
    })
      .sort((left, right) => {
        if (activeView === 'Recently viewed') return recentIds.indexOf(left.id) - recentIds.indexOf(right.id)
        const order = new Date(left.updated_at) - new Date(right.updated_at)
        return oldestFirst ? order : -order
      })
  }, [activeCategory, activeView, documents, oldestFirst, query, recentIds, savedIds])

  const toggleSaved = (id) => setSavedIds((current) => current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id])

  async function saveDocument(form) {
    if (!canCreateDocuments) {
      setToast('Your reader role does not allow editing documents.')
      return
    }
    const collection = collections.find((item) => item.id === form.collectionId)
    const owner = members.find((member) => member.user_id === form.ownerId)
    const fields = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      collection_id: form.collectionId,
      category: collection?.name || 'General',
      department: form.department.trim() || 'Company-wide',
      owner_id: form.ownerId || null,
      owner_name: owner?.full_name || owner?.email || 'Team member',
      tags: form.tags,
      template_key: form.templateKey,
      content_format: 'markdown',
      content: form.content.trim(),
      read_time: form.read_time,
    }
    setDocumentSaving(true)
    let savedDocument
    let filesToUpload = form.files

    if (isSupabaseConfigured && session) {
      if (!spaceId) {
        setDocumentSaving(false)
        setToast('This account is not assigned to a workspace yet.')
        return
      }
      const documentId = editorDocument?.id || crypto.randomUUID()
      const query = editorDocument
        ? supabase.from('documents').update(fields).eq('space_id', spaceId).eq('id', documentId)
        : supabase.from('documents').insert({ id: documentId, ...fields, space_id: spaceId, created_by: session.user.id, status: 'Draft' })
      const { data, error } = await query.select('id,title,summary,content,category,department,updated_at,owner_name,read_time,status,collection_id,owner_id,tags,template_key,content_format,review_due_at').single()
      if (error) {
        setDocumentSaving(false)
        setToast(`Could not save document: ${error.message}`)
        return
      }
      savedDocument = mapDocument(data, collections)
      setDocuments((current) => current.some((item) => item.id === savedDocument.id)
        ? current.map((item) => item.id === savedDocument.id ? savedDocument : item)
        : [savedDocument, ...current])

      for (const file of filesToUpload) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${spaceId}/${documentId}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('kms-documents').upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) {
          setToast(`Document saved, but ${file.name} could not be uploaded: ${uploadError.message}`)
          setEditorDocument(savedDocument)
          setDocumentSaving(false)
          return
        }
        const { data: attachment, error: attachmentError } = await supabase.from('document_attachments').insert({
          space_id: spaceId,
          document_id: documentId,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          byte_size: file.size,
          uploaded_by: session.user.id,
        }).select('id,document_id,storage_path,file_name,mime_type,byte_size,created_at').single()
        if (attachmentError) {
          await supabase.storage.from('kms-documents').remove([storagePath])
          setToast(`Document saved, but attachment details could not be recorded: ${attachmentError.message}`)
          setEditorDocument(savedDocument)
          setDocumentSaving(false)
          return
        }
        savedDocument = { ...savedDocument, attachments: [...(savedDocument.attachments || []), attachment] }
      }
    } else {
      const now = new Date().toISOString()
      const demoAttachments = filesToUpload.map((file) => ({
        id: `demo-file-${Date.now()}-${file.name}`,
        file_name: file.name,
        mime_type: file.type,
        byte_size: file.size,
        local_url: URL.createObjectURL(file),
      }))
      savedDocument = mapDocument({
        ...editorDocument,
        ...fields,
        id: editorDocument?.id || `local-${Date.now()}`,
        updated_at: now,
        owner_name: owner?.full_name || owner?.email || 'You',
        attachments: [...(editorDocument?.attachments || []), ...demoAttachments],
        status: editorDocument?.status || 'Draft',
      }, collections)
    }

    setDocuments((current) => current.some((document) => document.id === savedDocument.id)
      ? current.map((document) => document.id === savedDocument.id ? savedDocument : document)
      : [savedDocument, ...current])
    if (selectedDocument?.id === savedDocument.id) setSelectedDocument(savedDocument)
    setEditorDocument(null)
    setEditorOpen(false)
    setActiveSection('library')
    setActiveCategory('All collections')
    setActiveView('All knowledge')
    setDocumentSaving(false)
    setToast(editorDocument ? 'Document changes saved.' : 'Draft created and ready to edit.')
  }

  async function createCollection({ name, description, parentId }) {
    setCollectionSaving(true)
    if (isSupabaseConfigured && session && spaceId) {
      const { data, error } = await supabase.from('collections').insert({ space_id: spaceId, name, description, parent_id: parentId, created_by: session.user.id }).select('id,name,description,parent_id,created_at').single()
      if (error) {
        setCollectionSaving(false)
        setToast(`Could not create collection: ${error.message}`)
        return false
      }
      setCollections((current) => [...current, data].sort((left, right) => left.name.localeCompare(right.name)))
    } else {
      setCollections((current) => [...current, { id: `demo-collection-${Date.now()}`, name, description, parent_id: parentId }].sort((left, right) => left.name.localeCompare(right.name)))
    }
    setCollectionSaving(false)
    setToast(`Collection “${name}” created.`)
    return true
  }

  async function renameCollection(collectionId, name) {
    if (isSupabaseConfigured && session) {
      const { error } = await supabase.from('collections').update({ name }).eq('space_id', spaceId).eq('id', collectionId)
      if (error) {
        setToast(`Could not rename collection: ${error.message}`)
        return false
      }
    }
    setCollections((current) => current.map((collection) => collection.id === collectionId ? { ...collection, name } : collection))
    setDocuments((current) => current.map((document) => document.collection_id === collectionId ? { ...document, category: name, collection_name: name } : document))
    setToast('Collection renamed.')
    return true
  }

  async function archiveCollection(collection) {
    if (collections.some((item) => item.parent_id === collection.id)) {
      setToast('Archive or move nested collections first.')
      return
    }
    if (!window.confirm(`Archive “${collection.name}”? Its documents will remain in the full library.`)) return
    if (isSupabaseConfigured && session) {
      const { error } = await supabase.from('collections').update({ archived_at: new Date().toISOString() }).eq('space_id', spaceId).eq('id', collection.id)
      if (error) {
        setToast(`Could not archive collection: ${error.message}`)
        return
      }
    }
    setCollections((current) => current.filter((item) => item.id !== collection.id))
    if (activeCategory === collection.name) setActiveCategory('All collections')
    setToast(`Collection “${collection.name}” archived.`)
  }

  async function openDocument(document) {
    setSelectedDocument(document)
    setDocumentAttachments(document.attachments || [])
    setDocumentVersions([])
    setHistoryLoading(Boolean(supabase && session))
    if (!supabase || !session) {
      setDocumentVersions(document.demo_versions || [])
      setHistoryLoading(false)
      return
    }
    const [attachmentResult, versionResult] = await Promise.all([
      supabase.from('document_attachments').select('id,document_id,storage_path,file_name,mime_type,byte_size,created_at').eq('space_id', spaceId).eq('document_id', document.id).order('created_at', { ascending: false }),
      supabase.from('document_versions').select('id,version,title,summary,content,changed_by,created_at,status,collection_id,owner_id,tags,content_format').eq('document_id', document.id).order('version', { ascending: false }),
    ])
    setDocumentAttachments(attachmentResult.data || [])
    setDocumentVersions(versionResult.data || [])
    setHistoryLoading(false)
  }

  async function downloadAttachment(attachment) {
    if (attachment.local_url) {
      window.open(attachment.local_url, '_blank', 'noopener,noreferrer')
      return
    }
    const { data, error } = await supabase.storage.from('kms-documents').createSignedUrl(attachment.storage_path, 60)
    if (error) {
      setToast(`Could not open attachment: ${error.message}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function updateDocumentStatus(status) {
    if (!selectedDocument) return
    setDocumentSaving(true)
    if (supabase && session) {
      const { data, error } = await supabase.from('documents').update({ status }).eq('space_id', spaceId).eq('id', selectedDocument.id).select('id,title,summary,content,category,department,updated_at,owner_name,read_time,status,collection_id,owner_id,tags,template_key,content_format,review_due_at').single()
      if (error) {
        setDocumentSaving(false)
        setToast(`Could not update document workflow: ${error.message}`)
        return
      }
      const updated = mapDocument({ ...data, attachments: documentAttachments }, collections)
      setSelectedDocument(updated)
      setDocuments((current) => current.map((document) => document.id === updated.id ? updated : document))
    } else {
      const updated = { ...selectedDocument, status, updated_at: new Date().toISOString() }
      setSelectedDocument(updated)
      setDocuments((current) => current.map((document) => document.id === updated.id ? updated : document))
    }
    setDocumentSaving(false)
    setToast(`Document moved to ${status.toLowerCase()}.`)
  }

  async function restoreDocumentVersion(version) {
    if (!selectedDocument) return false
    const fields = { title: version.title, summary: version.summary, content: version.content, status: version.status, collection_id: version.collection_id, owner_id: version.owner_id, tags: version.tags, content_format: version.content_format }
    if (supabase && session) {
      const { data, error } = await supabase.from('documents').update(fields).eq('space_id', spaceId).eq('id', selectedDocument.id).select('id,title,summary,content,category,department,updated_at,owner_name,read_time,status,collection_id,owner_id,tags,template_key,content_format,review_due_at').single()
      if (error) {
        setToast(`Could not restore version: ${error.message}`)
        return false
      }
      const restored = mapDocument({ ...data, attachments: documentAttachments }, collections)
      setSelectedDocument(restored)
      setDocuments((current) => current.map((document) => document.id === restored.id ? restored : document))
    } else {
      const restored = { ...selectedDocument, ...fields, updated_at: new Date().toISOString() }
      setSelectedDocument(restored)
      setDocuments((current) => current.map((document) => document.id === restored.id ? restored : document))
    }
    setToast('Revision restored as the current document version.')
    return true
  }

  const canCreateDocuments = role === 'owner' || role === 'editor'
  const displayName = session?.user.user_metadata?.full_name || session?.user.email || 'Maya Chen'
  const displayEmail = session?.user.email || 'Demo workspace account'

  async function saveWorkspaceSettings({ name, requireReview: nextRequireReview, reviewIntervalDays: nextReviewInterval }) {
    setAdminSaving(true)
    if (!supabase || !spaceId) {
      setSpaceName(name)
      setRequireReview(nextRequireReview)
      setReviewIntervalDays(nextReviewInterval)
      setAdminSaving(false)
      setToast('Demo workspace settings updated locally.')
      return true
    }
    const { error } = await supabase.from('spaces').update({ name, require_review: nextRequireReview, review_interval_days: nextReviewInterval }).eq('id', spaceId)
    setAdminSaving(false)
    if (error) {
      setToast(`Could not save settings: ${error.message}`)
      return false
    }
    setSpaceName(name)
    setRequireReview(nextRequireReview)
    setReviewIntervalDays(nextReviewInterval)
    setToast('Workspace settings saved.')
    return true
  }

  async function inviteMember(email, inviteRole) {
    setInviting(true)
    if (!supabase || !spaceId) {
      setInvitations((current) => [{ id: `demo-invite-${Date.now()}`, invited_email: email, role: inviteRole, created_at: new Date().toISOString() }, ...current])
      setInviting(false)
      setToast(`Demo invitation prepared for ${email}.`)
      return true
    }

    const { data: token, error: inviteError } = await supabase.rpc('create_space_invitation', {
      target_space: spaceId,
      target_email: email,
      target_role: inviteRole,
    })
    if (inviteError) {
      setInviting(false)
      setToast(`Could not create invitation: ${inviteError.message}`)
      return false
    }

    const redirectUrl = new URL(window.location.origin)
    redirectUrl.searchParams.set('invite', token)
    const { error: emailError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl.toString() } })
    if (emailError) {
      await supabase.from('space_invitations').delete().eq('space_id', spaceId).eq('invited_email', email.toLowerCase())
      setInviting(false)
      setToast(`Could not send invitation email: ${emailError.message}`)
      return false
    }

    const { data: pendingInvitations } = await supabase.from('space_invitations')
      .select('id,invited_email,role,created_at,expires_at')
      .eq('space_id', spaceId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
    setInvitations(pendingInvitations || [])
    setInviting(false)
    setToast(`Invitation email sent to ${email}.`)
    return true
  }

  async function updateMemberRole(userId, nextRole) {
    if (!supabase || !spaceId) {
      setMembers((current) => current.map((member) => member.user_id === userId ? { ...member, role: nextRole } : member))
      setToast('Demo member role updated locally.')
      return
    }
    const { error } = await supabase.from('space_members').update({ role: nextRole }).eq('space_id', spaceId).eq('user_id', userId)
    if (error) {
      setToast(`Could not update member role: ${error.message}`)
      return
    }
    setMembers((current) => current.map((member) => member.user_id === userId ? { ...member, role: nextRole } : member))
    if (userId === session?.user.id) setRole(nextRole)
    setToast('Member role updated.')
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.full_name || member.email} from this workspace?`)) return
    if (!supabase || !spaceId) {
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id))
      setToast('Demo member removed locally.')
      return
    }
    const { error } = await supabase.from('space_members').delete().eq('space_id', spaceId).eq('user_id', member.user_id)
    if (error) {
      setToast(`Could not remove member: ${error.message}`)
      return
    }
    setMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setToast('Member removed from workspace.')
  }

  async function revokeInvitation(invitation) {
    if (!supabase || !spaceId) {
      setInvitations((current) => current.filter((item) => item.id !== invitation.id))
      return
    }
    const { error } = await supabase.from('space_invitations').delete().eq('space_id', spaceId).eq('id', invitation.id)
    if (error) {
      setToast(`Could not revoke invitation: ${error.message}`)
      return
    }
    setInvitations((current) => current.filter((item) => item.id !== invitation.id))
    setToast('Invitation revoked.')
  }

  async function confirmSignOut() {
    if (!supabase) return
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setToast(`Could not sign out: ${error.message}`)
        return
      }
      setLogoutOpen(false)
    } catch {
      setToast('Could not sign out. Check your connection and try again.')
    } finally {
      setSigningOut(false)
    }
  }

  if (isSupabaseConfigured && (sessionLoading || recoveryRequired)) {
    return <Suspense fallback={<main className="auth-loading"><span className="loading-spinner" /><span>Connecting to your workspace...</span></main>}>
      {sessionLoading ? <main className="auth-loading"><span className="loading-spinner" /><span>Connecting to your workspace...</span></main> : <PasswordUpdatePage onComplete={() => setRecoveryRequired(false)} />}
    </Suspense>
  }
  if (isSupabaseConfigured && !session) return <Suspense fallback={<main className="auth-loading"><span className="loading-spinner" /><span>Loading secure sign in...</span></main>}><AuthPage /></Suspense>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Northstar home">
          <span className="brand-mark"><Layers3 size={19} strokeWidth={2.2} /></span>
          <span><strong>northstar</strong><small>KNOWLEDGE WORKSPACE</small></span>
        </a>

        <div className="workspace-switcher">
          <span className="workspace-avatar">N</span>
          <span className="workspace-copy"><strong>{spaceName}</strong><small>{role === 'owner' ? 'Workspace owner' : role === 'editor' ? 'Editor workspace' : 'Read-only access'}</small></span>
          <ChevronDown size={15} />
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Workspace navigation">
          <button className={`nav-item ${activeSection === 'library' && activeView === 'All knowledge' ? 'active' : ''}`} onClick={() => { setActiveSection('library'); setActiveView('All knowledge'); setActiveCategory('All collections') }}><BookOpen size={17} />All knowledge<span className="nav-count">{documents.length}</span></button>
          <button className={`nav-item ${activeSection === 'library' && activeView === 'My bookmarks' ? 'active' : ''}`} onClick={() => { setActiveSection('library'); setActiveView('My bookmarks') }}><Bookmark size={17} />My bookmarks</button>
          <button className={`nav-item ${activeSection === 'library' && activeView === 'Recently viewed' ? 'active' : ''}`} onClick={() => { setActiveSection('library'); setActiveView('Recently viewed') }}><Clock3 size={17} />Recently viewed</button>
        </nav>

        {role !== 'viewer' && <>
          <p className="nav-label secondary-nav-label">INSIGHTS</p>
          <nav className="primary-nav" aria-label="Reports navigation">
            <button className={`nav-item ${activeSection === 'reports' ? 'active' : ''}`} onClick={() => setActiveSection('reports')}><ChartNoAxesColumn size={17} />Reports & analytics</button>
          </nav>
        </>}

        {role === 'owner' && <>
          <p className="nav-label secondary-nav-label">ADMINISTRATION</p>
          <nav className="primary-nav" aria-label="Administration navigation">
            <button className={`nav-item ${activeSection === 'people' ? 'active' : ''}`} onClick={() => setActiveSection('people')}><UsersRound size={17} />People & access</button>
            <button className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => setActiveSection('settings')}><Settings2 size={17} />Workspace settings</button>
          </nav>
        </>}

        <div className="collection-heading"><p className="nav-label">COLLECTIONS</p>{canCreateDocuments && <IconButton label="Manage collections" onClick={() => setCollectionsOpen(true)}><Plus size={15} /></IconButton>}</div>
        <nav className="collection-nav" aria-label="Collections">
          {collections.map((collection, index) => <button key={collection.id} className={`nav-item ${activeCategory === collection.name ? 'active' : ''}`} style={{ paddingLeft: collection.parent_id ? 24 : undefined }} onClick={() => { setActiveSection('library'); setActiveCategory(collection.name); setActiveView('All knowledge') }}><span className={`collection-dot dot-${index % 5}`} />{collection.name}<ChevronRight className="nav-chevron" size={14} /></button>)}
        </nav>

        <div className="sidebar-bottom">
          <div className="storage-note"><div className="storage-icon"><ShieldCheck size={16} /></div><div><strong>Your knowledge, protected</strong><span>Private to your workspace</span></div></div>
          <button className="nav-item"><CircleHelp size={17} />Help & support</button>
          {supabase && session && <button className="nav-item signout-item" onClick={() => setLogoutOpen(true)}><LogOut size={17} />Log out</button>}
          <div className="profile-row"><span className="profile-avatar">{session ? (session.user.email?.[0] || 'Y').toUpperCase() : 'MC'}</span><span className="profile-copy"><strong>{session?.user.user_metadata?.full_name || session?.user.email || 'Maya Chen'}</strong><small>{role === 'owner' ? 'Workspace owner' : role === 'editor' ? 'Editor' : 'Reader'}</small></span><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Layers3 size={18} /></span><strong>northstar</strong></div>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activeSection === 'reports' ? 'Reports & analytics' : activeSection === 'people' ? 'People & access' : activeSection === 'settings' ? 'Workspace settings' : activeView === 'My bookmarks' ? 'My bookmarks' : activeCategory === 'All collections' ? 'Knowledge library' : activeCategory}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything..." aria-label="Search knowledge" /><kbd>⌘ K</kbd></label>
            <IconButton label="Notifications" className="notification-button" onClick={() => setToast('You’re all caught up.')}><Bell size={18} /><i /></IconButton>
            {!isSupabaseConfigured && <label className="demo-role-select"><ShieldCheck size={14} /><select value={role} aria-label="Preview dashboard role" onChange={(event) => setRole(event.target.value)}><option value="owner">Preview: Owner</option><option value="editor">Preview: Editor</option><option value="viewer">Preview: Reader</option></select><ChevronDown size={13} /></label>}
            <AccountMenu name={displayName} email={displayEmail} role={role} canSignOut={Boolean(supabase && session)} onRequestSignOut={() => setLogoutOpen(true)} />
          </div>
        </header>

        {activeSection === 'library' && <section className="page-content">
          <div className="page-intro">
            <div>
              <div className="eyebrow"><span className="live-dot" />COMPANY KNOWLEDGE <span className="eyebrow-divider">/</span> {documents.length} ARTICLES</div>
              <h1>{activeView === 'My bookmarks' ? 'Your bookmarks' : activeCategory === 'All collections' ? 'Knowledge library' : activeCategory}</h1>
              <p className="page-subtitle">A considered home for the ideas, answers, and work that move us forward.</p>
            </div>
            {canCreateDocuments && <CButton className="create-button" onClick={() => { setEditorDocument(null); setEditorOpen(true) }}><Plus size={17} />New document</CButton>}
          </div>

          <RoleDashboard role={role} documents={documents} savedCount={savedIds.length} memberCount={members.length} collectionsCount={collections.length} reviewIntervalDays={reviewIntervalDays} onCreate={() => { setEditorDocument(null); setEditorOpen(true) }} />

          <div className="insight-strip">
            <div className="insight-icon"><Sparkles size={17} /></div>
            <p><strong>Good knowledge compounds.</strong> Capture a useful answer once, and make it easier for everyone to find next time.</p>
            <button onClick={() => setToast('Knowledge health insights are coming soon.')}>Explore insights <ArrowRight size={14} /></button>
          </div>

          <div className="library-toolbar">
            <div className="view-tabs" role="tablist" aria-label="Document view">
              {['All knowledge', 'Recently viewed', 'My bookmarks'].map((view) => <button role="tab" aria-selected={activeView === view} key={view} className={activeView === view ? 'selected' : ''} onClick={() => setActiveView(view)}>{view}{view === 'My bookmarks' && <span className="tab-count">{savedIds.length}</span>}</button>)}
            </div>
            <div className="filter-actions">
              <label className="filter-select"><Filter size={15} /><select aria-label="Filter by collection" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
              <button className="sort-button" onClick={() => setOldestFirst((current) => !current)}><ArrowDownUp size={15} /><span>{oldestFirst ? 'Oldest first' : 'Recently updated'}</span><ChevronDown size={14} /></button>
              <IconButton className="filter-icon-button" label="More filters" onClick={() => setToast('More filters are coming soon.')}><Menu size={17} /></IconButton>
            </div>
          </div>

          <div className="document-list" aria-live="polite">
            <div className="list-header"><span>DOCUMENT</span><span>COLLECTION</span><span>OWNER</span><span>LAST UPDATED</span><span aria-label="Actions" /></div>
            {loading ? <div className="empty-state"><span className="loading-spinner" />Loading your knowledge library...</div> : filteredDocuments.length ? filteredDocuments.map((document) => <article className="document-row" key={document.id}>
              <button className="document-main" onClick={() => { setRecentIds((current) => [document.id, ...current.filter((id) => id !== document.id)]); openDocument(document) }}>
                <span className={`file-icon file-${document.category.toLowerCase().replace(/\s+/g, '-')}`}><FileText size={18} /></span>
                <span className="document-copy"><strong>{document.title}</strong><small>{document.summary}</small></span>
              </button>
              <span className="category-cell"><span className="category-dot" />{document.category}</span>
              <span className="owner-cell"><span className="owner-avatar">{document.owner_name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>{document.owner_name.split(' ')[0]}</span>
              <span className="updated-cell">{dateLabel(document.updated_at)}</span>
              <div className="row-actions"><span className={`status-pill ${document.status === 'In review' ? 'review-status' : document.status === 'Draft' ? 'draft-status' : ''}`}>{document.status === 'Published' ? <Check size={12} /> : null}{document.status}</span><IconButton label={savedIds.includes(document.id) ? 'Remove bookmark' : 'Bookmark document'} onClick={() => toggleSaved(document.id)}>{savedIds.includes(document.id) ? <BookmarkCheck size={17} className="is-saved" /> : <Bookmark size={17} />}</IconButton></div>
            </article>) : <div className="empty-state"><span className="empty-icon"><FolderKanban size={20} /></span><strong>No documents found</strong><span>Try a different search or collection filter.</span></div>}
          </div>

          <footer className="list-footer"><span>Showing <strong>{filteredDocuments.length}</strong> of <strong>{documents.length}</strong> documents</span><button onClick={() => setToast('You’re viewing the latest documents.')}>View activity <ArrowRight size={14} /></button></footer>

          <section className="bottom-note"><div><div className="bottom-note-icon"><LifeBuoy size={17} /></div><div><strong>Can’t find what you’re looking for?</strong><span>Ask your team or create a request for a new guide.</span></div></div><button onClick={() => setToast('Your request has been noted.')}>Request knowledge <ArrowRight size={14} /></button></section>
        </section>}

        {activeSection === 'reports' && (role !== 'viewer'
          ? <WorkspaceReports documents={documents} auditEvents={auditEvents} memberCount={members.length} requireReview={requireReview} reviewIntervalDays={reviewIntervalDays} />
          : <section className="page-content access-denied"><ShieldCheck size={22} /><h1>Reports are restricted</h1><p>Workspace reports are available to owners and editors.</p><button className="admin-primary-button" onClick={() => setActiveSection('library')}>Return to knowledge library</button></section>)}
        {(activeSection === 'people' || activeSection === 'settings') && (role === 'owner'
          ? <WorkspaceAdmin
            activeTab={activeSection}
            workspaceId={spaceId || 'demo-northstar-workspace'}
            workspaceName={spaceName}
            requireReview={requireReview}
            reviewIntervalDays={reviewIntervalDays}
            members={members}
            invitations={invitations}
            loading={loading}
            saving={adminSaving}
            inviting={inviting}
            currentUserId={session?.user.id}
            onTabChange={setActiveSection}
            onSaveSettings={saveWorkspaceSettings}
            onInvite={inviteMember}
            onRoleChange={updateMemberRole}
            onRemoveMember={removeMember}
            onRevokeInvitation={revokeInvitation}
          />
          : <section className="page-content access-denied"><ShieldCheck size={22} /><h1>Owner access required</h1><p>Your workspace role doesn’t allow member or settings administration.</p><button className="admin-primary-button" onClick={() => setActiveSection('library')}>Return to knowledge library</button></section>)}
      </main>

      <CollectionManagerDialog open={collectionsOpen} onOpenChange={setCollectionsOpen} collections={collections} saving={collectionSaving} onCreate={createCollection} onRename={renameCollection} onArchive={archiveCollection} />
      <DocumentEditorDialog open={editorOpen} onOpenChange={setEditorOpen} document={editorDocument} collections={collections} members={members} saving={documentSaving} onSave={saveDocument} onManageCollections={() => setCollectionsOpen(true)} />
      <DocumentReaderDialog
        document={selectedDocument}
        canEdit={canCreateDocuments}
        canPublish={role === 'owner'}
        attachments={documentAttachments}
        versions={documentVersions}
        loadingHistory={historyLoading}
        saving={documentSaving}
        saved={savedIds.includes(selectedDocument?.id)}
        onOpenChange={(open) => { if (!open) setSelectedDocument(null) }}
        onEdit={() => { setEditorDocument(selectedDocument); setSelectedDocument(null); setEditorOpen(true) }}
        onToggleSaved={() => toggleSaved(selectedDocument?.id)}
        onDownload={downloadAttachment}
        onStatusChange={updateDocumentStatus}
        onRestore={restoreDocumentVersion}
      />

      <SignOutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={confirmSignOut} loading={signingOut} />

      {toast && <div role="status" className="toast-message"><Check size={16} />{toast}<IconButton label="Dismiss notification" onClick={() => setToast('')}><X size={14} /></IconButton></div>}
    </div>
  )
}

export default App