import { useState, useRef } from 'react'
import { X, Upload, Sparkles } from 'lucide-react'

interface Props {
  onClose: () => void
  onSave: (data: { imageUrl: string; name: string; accessory: string }) => void
  current?: { imageUrl: string; name: string; accessory: string } | null
}

const ACCESSORIES = [
  { id: 'none', emoji: '😶', label: '없음' },
  { id: 'cat', emoji: '🐱', label: '고양이' },
  { id: 'crown', emoji: '👑', label: '왕관' },
  { id: 'bow', emoji: '🎀', label: '리본' },
  { id: 'star', emoji: '⭐', label: '별' },
  { id: 'flower', emoji: '🌸', label: '꽃' },
  { id: 'glasses', emoji: '🕶️', label: '선글라스' },
  { id: 'hat', emoji: '🎩', label: '모자' },
  { id: 'halo', emoji: '😇', label: '천사' },
]

const FRAME_COLORS = [
  { color: '#f472b6', label: '핑크' },
  { color: '#a78bfa', label: '보라' },
  { color: '#60a5fa', label: '파랑' },
  { color: '#34d399', label: '초록' },
  { color: '#fbbf24', label: '노랑' },
  { color: '#f87171', label: '빨강' },
]

export default function CharacterSetupModal({ onClose, onSave, current }: Props) {
  const [imageUrl, setImageUrl] = useState(current?.imageUrl || '')
  const [name, setName] = useState(current?.name || '')
  const [accessory, setAccessory] = useState(current?.accessory || 'none')
  const [frameColor, setFrameColor] = useState('#f472b6')
  const [isDragging, setIsDragging] = useState(false)
  const [previewAnim, setPreviewAnim] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      setImageUrl(e.target?.result as string)
      setPreviewAnim(true)
      setTimeout(() => setPreviewAnim(false), 600)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleSave = () => {
    if (!imageUrl || !name.trim()) return
    onSave({ imageUrl, name: name.trim(), accessory })
    onClose()
  }

  const accIcon = ACCESSORIES.find(a => a.id === accessory)?.emoji || ''

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10002,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        width: 480,
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'modalPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #fce7f3, #ede9fe)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f3e8ff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles style={{ width: 22, height: 22, color: '#c026d3' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#6b21a8' }}>
              나만의 캐릭터 만들기
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20, color: '#9ca3af' }} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', gap: 24 }}>
          {/* Left: Upload + Preview */}
          <div style={{ flex: '0 0 160px' }}>
            {/* Preview */}
            {imageUrl ? (
              <div style={{
                textAlign: 'center',
                marginBottom: 16,
                animation: previewAnim ? 'mascotBubble 0.3s ease-out' : 'none',
              }}>
                <div style={{ fontSize: 28, marginBottom: -12 }}>
                  {accIcon !== '😶' ? accIcon : ''}
                </div>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `4px solid ${frameColor}`,
                  boxShadow: `0 6px 20px ${frameColor}66`,
                  margin: '0 auto',
                  animation: 'mascotWalk 0.35s ease-in-out infinite alternate',
                }}>
                  <img src={imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#6b21a8',
                  background: '#f3e8ff',
                  borderRadius: 10,
                  padding: '3px 10px',
                  display: 'inline-block',
                }}>
                  {name || '이름을 입력해요'}
                </div>
              </div>
            ) : (
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '3px dashed #d8b4fe',
                background: '#faf5ff',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}>
                🐣
              </div>
            )}

            {/* Upload area */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#a78bfa' : '#ddd6fe'}`,
                borderRadius: 12,
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? '#f5f3ff' : '#fafafa',
                transition: 'all 0.2s',
              }}
            >
              <Upload style={{ width: 20, height: 20, color: '#a78bfa', margin: '0 auto 4px' }} />
              <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>사진 올리기</p>
              <p style={{ fontSize: 10, color: '#9ca3af' }}>클릭 또는 드래그</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {/* Frame color */}
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 6 }}>테두리 색</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FRAME_COLORS.map(fc => (
                  <button
                    key={fc.color}
                    onClick={() => setFrameColor(fc.color)}
                    title={fc.label}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: fc.color,
                      border: frameColor === fc.color ? '3px solid #1e1b4b' : '2px solid white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Settings */}
          <div style={{ flex: 1 }}>
            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b21a8', marginBottom: 6 }}>
                캐릭터 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 민준이, 공주님..."
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '2px solid #e9d5ff',
                  fontSize: 14,
                  outline: 'none',
                  fontWeight: 600,
                  color: '#4c1d95',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Accessory */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b21a8', marginBottom: 6 }}>
                악세서리
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {ACCESSORIES.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setAccessory(acc.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 10,
                      border: `2px solid ${accessory === acc.id ? '#a78bfa' : '#f3e8ff'}`,
                      background: accessory === acc.id ? '#f5f3ff' : 'white',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: accessory === acc.id ? 700 : 500,
                      color: accessory === acc.id ? '#6d28d9' : '#6b7280',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{acc.emoji}</div>
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div style={{
              marginTop: 16,
              padding: '10px 12px',
              background: '#fef9c3',
              borderRadius: 10,
              border: '1px solid #fde047',
            }}>
              <p style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>💡 사용 팁</p>
              <ul style={{ fontSize: 10, color: '#92400e', marginTop: 4, paddingLeft: 14, lineHeight: 1.8 }}>
                <li>얼굴 사진이 가장 귀여워요!</li>
                <li>클릭하면 말을 걸어요 🗨️</li>
                <li>화면을 자유롭게 돌아다녀요</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f3e8ff',
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: '2px solid #e5e7eb',
              background: 'white',
              fontSize: 14,
              fontWeight: 600,
              color: '#6b7280',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!imageUrl || !name.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: imageUrl && name.trim() ? 'linear-gradient(135deg, #c026d3, #7c3aed)' : '#e5e7eb',
              fontSize: 14,
              fontWeight: 700,
              color: imageUrl && name.trim() ? 'white' : '#9ca3af',
              cursor: imageUrl && name.trim() ? 'pointer' : 'not-allowed',
              boxShadow: imageUrl && name.trim() ? '0 4px 12px rgba(192,38,211,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            ✨ 캐릭터 만들기!
          </button>
        </div>
      </div>
    </div>
  )
}
