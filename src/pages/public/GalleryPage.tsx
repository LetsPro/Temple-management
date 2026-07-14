import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { Skeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

type Album = Database['public']['Tables']['gallery_albums']['Row']
type GalleryImage = Database['public']['Tables']['gallery_images']['Row']

export default function GalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const [albumsRes, imagesRes] = await Promise.all([
        supabase.from('gallery_albums').select('*').eq('is_active', true).order('display_order'),
        supabase.from('gallery_images').select('*').eq('is_active', true).order('display_order'),
      ])
      setAlbums(albumsRes.data || [])
      setImages(imagesRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = selectedAlbum === 'all' ? images : images.filter(i => i.album_id === selectedAlbum)

  const closeLightbox = () => setLightboxIndex(null)
  const prev = () => lightboxIndex !== null && setLightboxIndex(Math.max(0, lightboxIndex - 1))
  const next = () => lightboxIndex !== null && setLightboxIndex(Math.min(filtered.length - 1, lightboxIndex + 1))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, filtered.length])

  return (
    <div className="page-container py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Moments of Grace</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-temple-text mb-3 font-serif">Temple Gallery</h1>
        <p className="text-temple-muted">Glimpses of sacred rituals, festivals and moments from our temple's journey.</p>
      </div>

      {/* Album filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-1">
        <button
          onClick={() => setSelectedAlbum('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedAlbum === 'all' ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-muted border-temple-border hover:border-vermilion-300'}`}
        >
          All Photos ({images.length})
        </button>
        {albums.map(album => (
          <button
            key={album.id}
            onClick={() => setSelectedAlbum(album.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedAlbum === album.id ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-muted border-temple-border hover:border-vermilion-300'}`}
          >
            {album.name} ({images.filter(i => i.album_id === album.id).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className={`w-full ${i % 3 === 0 ? 'h-52' : 'h-36'} rounded-xl`} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🖼️" title="No photos yet" description="Check back soon for temple photos and memories." />
      ) : (
        <div className="columns-2 md:columns-3 gap-3">
          {filtered.map((image, idx) => (
            <div key={image.id} className="break-inside-avoid mb-3 group cursor-pointer overflow-hidden rounded-2xl" onClick={() => setLightboxIndex(idx)}>
              <img
                src={image.image_url}
                alt={image.caption}
                className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {image.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 z-10">
            <X size={20} />
          </button>
          <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-4 text-white/80 hover:text-white p-3 rounded-full bg-white/10 text-2xl" disabled={lightboxIndex === 0}>‹</button>
          <div className="max-w-4xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <img
              src={filtered[lightboxIndex].image_url}
              alt={filtered[lightboxIndex].caption}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            {filtered[lightboxIndex].caption && (
              <p className="text-white/70 text-sm text-center mt-3">{filtered[lightboxIndex].caption}</p>
            )}
            <div className="text-white/40 text-xs text-center mt-1">{lightboxIndex + 1} / {filtered.length}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-4 text-white/80 hover:text-white p-3 rounded-full bg-white/10 text-2xl" disabled={lightboxIndex === filtered.length - 1}>›</button>
        </div>
      )}
    </div>
  )
}
