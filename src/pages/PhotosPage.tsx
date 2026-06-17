import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Photo } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { useAuth } from '../contexts/AuthContext'
import { Upload, ExternalLink, X, Search, Grid3X3, List } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function PhotosPage() {
  const { selectedChild } = useChild()
  const { myFamily } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPhotos = async () => {
    if (!selectedChild) return
    const { data } = await supabase.from('photos').select('*').eq('child_id', selectedChild.id).order('created_at', { ascending: false })
    if (data) setPhotos(data)
  }

  useEffect(() => { fetchPhotos() }, [selectedChild])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChild || !myFamily || !e.target.files) return
    setUploading(true)
    for (const file of Array.from(e.target.files)) {
      const ext = file.name.split('.').pop()
      const path = `${selectedChild.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (error) { console.error(error); continue }
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      await supabase.from('photos').insert({
        child_id: selectedChild.id,
        family_id: myFamily.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: publicUrl,
        source: 'local',
        taken_at: format(new Date(), 'yyyy-MM-dd'),
        tags: [],
      })
    }
    await fetchPhotos()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (photo: Photo) => {
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(photos.filter((p) => p.id !== photo.id))
    if (selectedPhoto?.id === photo.id) setSelectedPhoto(null)
  }

  const handleGoogleDriveConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      alert('Google Drive 연동을 위해 .env 파일에 VITE_GOOGLE_CLIENT_ID를 설정해주세요.')
      return
    }
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')
    window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=token&scope=${scope}`,
      '_blank'
    )
  }

  const filtered = photos.filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>왼쪽 메뉴에서 아이를 선택하거나 추가해주세요.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{selectedChild.name}의 사진</h1>
          <p className="text-gray-500 text-sm mt-1">사진 {photos.length}장</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGoogleDriveConnect}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
            <ExternalLink className="w-4 h-4 text-green-500" /> Google Drive 연동
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 disabled:opacity-50">
            <Upload className="w-4 h-4" /> {uploading ? '업로드 중...' : '사진 업로드'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="사진 검색" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-500' : 'text-gray-400'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-500' : 'text-gray-400'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">사진을 업로드하세요</p>
          <p className="text-gray-300 text-sm mt-1">클릭하거나 파일을 드래그하세요</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((photo) => (
            <div key={photo.id} onClick={() => setSelectedPhoto(photo)}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all relative group bg-gray-100">
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {photo.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-xs truncate">{photo.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((photo) => (
            <div key={photo.id} onClick={() => setSelectedPhoto(photo)}
              className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:shadow-sm transition-all">
              <img src={photo.url} alt={photo.title} className="w-12 h-12 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{photo.title ?? '제목 없음'}</p>
                <p className="text-xs text-gray-400">
                  {photo.taken_at ? format(parseISO(photo.taken_at), 'yyyy년 M월 d일', { locale: ko }) : '날짜 없음'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.url} alt={selectedPhoto.title} className="w-full max-h-[60vh] object-contain bg-black" />
            <div className="p-4 flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">{selectedPhoto.title ?? '제목 없음'}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {selectedPhoto.taken_at ? format(parseISO(selectedPhoto.taken_at), 'yyyy년 M월 d일', { locale: ko }) : '날짜 없음'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(selectedPhoto)}
                  className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
                <button onClick={() => setSelectedPhoto(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
