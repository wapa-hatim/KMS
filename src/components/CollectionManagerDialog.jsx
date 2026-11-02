import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Archive, FolderPlus, Pencil, Plus, Save, X } from 'lucide-react'

export default function CollectionManagerDialog({ open, onOpenChange, collections, saving, onCreate, onRename, onArchive }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  async function submitCreate(event) {
    event.preventDefault()
    const created = await onCreate({ name: name.trim(), description: description.trim(), parentId: parentId || null })
    if (created) {
      setName('')
      setDescription('')
      setParentId('')
    }
  }

  async function submitRename(event, collectionId) {
    event.preventDefault()
    const renamed = await onRename(collectionId, editingName.trim())
    if (renamed) setEditingId(null)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content collection-dialog">
          <div className="dialog-heading"><div><span className="dialog-kicker">KNOWLEDGE ORGANIZATION</span><Dialog.Title>Manage collections</Dialog.Title><Dialog.Description>Group documents into clear, searchable spaces.</Dialog.Description></div><Dialog.Close asChild><button type="button" className="icon-button" aria-label="Close collections"><X size={18} /></button></Dialog.Close></div>

          <form className="collection-create-form" onSubmit={submitCreate}>
            <label>Collection name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Engineering" maxLength={80} required /></label>
            <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What belongs here?" maxLength={240} /></label>
            <label>Parent collection<select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Top-level collection</option>{collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label>
            <button type="submit" className="admin-primary-button" disabled={saving}><FolderPlus size={15} />{saving ? 'Saving...' : 'Create collection'}</button>
          </form>

          <div className="collection-manage-list"><h3>Active collections <span>{collections.length}</span></h3>
            {collections.map((collection) => <div className="managed-collection" key={collection.id}>
              {editingId === collection.id ? <form className="collection-rename-form" onSubmit={(event) => submitRename(event, collection.id)}><input aria-label="Collection name" value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={80} required autoFocus /><button type="submit" className="collection-action" aria-label="Save collection name"><Save size={15} /></button><button type="button" className="collection-action" aria-label="Cancel rename" onClick={() => setEditingId(null)}><X size={15} /></button></form> : <><span className="collection-managed-icon"><FolderPlus size={15} /></span><span className="managed-collection-copy"><strong>{collection.name}</strong><small>{collection.description || 'No description'}</small></span><button type="button" className="collection-action" aria-label={`Rename ${collection.name}`} onClick={() => { setEditingId(collection.id); setEditingName(collection.name) }}><Pencil size={14} /></button><button type="button" className="collection-action archive-action" aria-label={`Archive ${collection.name}`} onClick={() => onArchive(collection)}><Archive size={14} /></button></>}
            </div>)}
            {!collections.length && <div className="collection-empty"><span>Create your first collection to start organizing documents.</span></div>}
          </div>
          <div className="collection-dialog-footer"><span>Documents in archived collections remain available in the full library.</span><Dialog.Close asChild><button className="secondary-button" type="button">Done</button></Dialog.Close></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}