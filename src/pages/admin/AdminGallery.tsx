import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Image } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Album = Database['public']['Tables']['gallery_albums']['Row']
type GalleryImage = Database['public']['Tables']['gallery_images']['Row']

export default function AdminGallery() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all')
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [showAddImage, setShowAddImage] = useState(false)
  const [newAlbum, setNewAlbum] = useState({ name: '', description: '' })
  const [newImage, setNewImage] = useState({ image_url: '', caption: '', album_id: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    const [albumsRes, imagesRes] = await Promise.all([
      supabase.from('gallery_albums').select('*').order('display_order'),
      supabase.from('gallery_images').select('*').order('created_at', { ascending: false }),
    ])
    setAlbums(albumsRes.data || [])
    setImages(imagesRes.data || [])
    if (albumsRes.data?.[0] && selectedAlbum === 'all') {
      // keep 'all' by default
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredImages = selectedAlbum === 'all' ? images : images.filter(i => i.album_id === selectedAlbum)

  const createAlbum = async () => {
    if (!newAlbum.name) return
    setSubmitting(true)
    const slug = newAlbum.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
    const { error } = await supabase.from('gallery_albums').insert({ name: newAlbum.name, slug, description: newAlbum.description })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Album created.')
    setNewAlbum({ name: '', description: '' })
    setShowNewAlbum(false)
    load()
  }

  const addImage = async () => {
    if (!newImage.image_url || !newImage.album_id) { toast.error('Please provide image URL and select album.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('gallery_images').insert({ image_url: newImage.image_url, caption: newImage.caption, album_id: newImage.album_id })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Image added.')
    setNewImage({ image_url: '', caption: '', album_id: '' })
    setShowAddImage(false)
    load()
  }

  const deleteImage = async (id: string) => {
    if (!confirm('Delete this image?')) return
    await supabase.from('gallery_images').delete().eq('id', id)
    toast.success('Image deleted.')
    load()
  }

  const toggleAlbumActive = async (album: Album) => {
    await supabase.from('gallery_albums').update({ is_active: !album.is_active }).eq('id', album.id)
    toast.success(`Album ${album.is_active ? 'hidden' : 'shown'}.`)
    load()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Gallery Management</h1>
          <p className="text-temple-muted text-sm">{images.length} images in {albums.length} albums</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewAlbum(true)} className="btn-secondary text-sm">+ Album</button>
          <button onClick={() => setShowAddImage(true)} className="btn-primary text-sm"><Plus size={15} /> Add Image</button>
        </div>
      </div>

      {/* Albums */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button onClick={() => setSelectedAlbum('all')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedAlbum === 'all' ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-muted border-temple-border'}`}>
          All ({images.length})
        </button>
        {albums.map(album => (
          <button key={album.id} onClick={() => setSelectedAlbum(album.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedAlbum === album.id ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-muted border-temple-border'} ${!album.is_active ? 'opacity-60' : ''}`}>
            {album.name} ({images.filter(i => i.album_id === album.id).length})
            {!album.is_active && ' (hidden)'}
          </button>
        ))}
      </div>

      {selectedAlbum !== 'all' && (
        <div className="flex gap-2 text-sm">
          <button onClick={() => { const a = albums.find(a => a.id === selectedAlbum); if (a) toggleAlbumActive(a) }} className="btn-ghost text-sm">
            {albums.find(a => a.id === selectedAlbum)?.is_active ? 'Hide Album' : 'Show Album'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      ) : filteredImages.length === 0 ? (
        <EmptyState icon="🖼️" title="No images yet" description="Add images to your gallery albums." action={<button onClick={() => setShowAddImage(true)} className="btn-primary text-sm">Add Image</button>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredImages.map(img => (
            <div key={img.id} className="group relative rounded-2xl overflow-hidden aspect-square bg-cream-100">
              <img src={img.image_url} alt={img.caption} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                {img.caption && <p className="text-white text-xs text-center px-2 line-clamp-2">{img.caption}</p>}
                <button onClick={() => deleteImage(img.id)} className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New album modal */}
      {showNewAlbum && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-temple-text">New Album</h3><button onClick={() => setShowNewAlbum(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button></div>
            <div className="space-y-3">
              <div><label className="label">Album Name *</label><input value={newAlbum.name} onChange={e => setNewAlbum(p => ({ ...p, name: e.target.value }))} className="input-field" /></div>
              <div><label className="label">Description</label><textarea value={newAlbum.description} onChange={e => setNewAlbum(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" /></div>
              <div className="flex gap-3"><button onClick={() => setShowNewAlbum(false)} className="btn-secondary">Cancel</button><button onClick={createAlbum} disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? 'Creating...' : 'Create Album'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Add image modal */}
      {showAddImage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-temple-text">Add Image</h3><button onClick={() => setShowAddImage(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button></div>
            <div className="space-y-3">
              <div><label className="label">Album *</label>
                <select value={newImage.album_id} onChange={e => setNewImage(p => ({ ...p, album_id: e.target.value }))} className="input-field">
                  <option value="">Select album</option>
                  {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div><label className="label">Image URL *</label><input value={newImage.image_url} onChange={e => setNewImage(p => ({ ...p, image_url: e.target.value }))} className="input-field" placeholder="https://..." /></div>
              {newImage.image_url && <img src={newImage.image_url} alt="preview" className="w-full h-40 object-cover rounded-xl" loading="lazy" onError={e => (e.currentTarget.style.display = 'none')} />}
              <div><label className="label">Caption</label><input value={newImage.caption} onChange={e => setNewImage(p => ({ ...p, caption: e.target.value }))} className="input-field" /></div>
              <div className="flex gap-3"><button onClick={() => setShowAddImage(false)} className="btn-secondary">Cancel</button><button onClick={addImage} disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? 'Adding...' : 'Add Image'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
