import { useState, useEffect, useRef } from 'react'

interface MascotProps {
  imageUrl: string
  name: string
  accessory: string
  onRemove: () => void
}

const MESSAGES = [
  '안녕! 👋', '파이팅! 💪', '열심히 하자!', '오늘도 화이팅!',
  '공부 중~ 📚', '잘 하고 있어! ✨', '배고파~ 🍙', '놀고 싶다 🎮',
  '힘내! 🌟', '최고야! 🏆', '꿈을 향해! 🚀', '사랑해 ❤️',
]

const ACCESSORIES: Record<string, string> = {
  none: '',
  cat: '🐱',
  crown: '👑',
  bow: '🎀',
  star: '⭐',
  flower: '🌸',
  glasses: '🕶️',
  hat: '🎩',
  halo: '😇',
}

export default function MascotCharacter({ imageUrl, name, accessory, onRemove }: MascotProps) {
  const [pos, setPos] = useState({ x: 150, y: 200 })
  const [bubble, setBubble] = useState<string | null>(null)
  const [isPixelated, setIsPixelated] = useState(false)
  const posRef = useRef({ x: 150, y: 200 })
  const velRef = useRef({ x: 1.5, y: 1 })
  const rafRef = useRef<number>()
  const SIZE = 80

  // Random speed changes for more natural movement
  useEffect(() => {
    const changeDirection = () => {
      const speed = 1 + Math.random() * 2
      const angle = Math.random() * Math.PI * 2
      velRef.current = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      }
    }
    const interval = setInterval(changeDirection, 3000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  // Bubble messages
  useEffect(() => {
    const showBubble = () => {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      setBubble(msg)
      setTimeout(() => setBubble(null), 2500)
    }
    const interval = setInterval(showBubble, 4000 + Math.random() * 3000)
    return () => clearInterval(interval)
  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const { x, y } = posRef.current
      let { x: vx, y: vy } = velRef.current

      const maxX = window.innerWidth - SIZE - 10
      const maxY = window.innerHeight - SIZE - 20

      let nx = x + vx
      let ny = y + vy

      if (nx <= 10) { vx = Math.abs(vx); nx = 10 }
      if (nx >= maxX) { vx = -Math.abs(vx); nx = maxX }
      if (ny <= 10) { vy = Math.abs(vy); ny = 10 }
      if (ny >= maxY) { vy = -Math.abs(vy); ny = maxY }

      posRef.current = { x: nx, y: ny }
      velRef.current = { x: vx, y: vy }
      setPos({ x: nx, y: ny })

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const isMovingLeft = velRef.current.x < 0

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'all',
      }}
      onClick={() => {
        const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        setBubble(msg)
        setTimeout(() => setBubble(null), 2500)
      }}
    >
      {/* Speech bubble */}
      {bubble && (
        <div style={{
          position: 'absolute',
          bottom: SIZE + 14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          border: '2.5px solid #f472b6',
          borderRadius: '14px',
          padding: '5px 12px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(244,114,182,0.3)',
          fontWeight: 700,
          color: '#be185d',
          zIndex: 10000,
          animation: 'mascotBubble 0.3s ease-out',
        }}>
          {bubble}
          <div style={{
            position: 'absolute',
            bottom: -9,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '9px solid #f472b6',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '7px solid white',
          }} />
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          fontSize: 10,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          lineHeight: 1,
        }}
        title="캐릭터 숨기기"
      >✕</button>

      {/* Character body */}
      <div
        style={{
          transform: `scaleX(${isMovingLeft ? -1 : 1})`,
          display: 'inline-block',
        }}
      >
        {/* Accessory */}
        {ACCESSORIES[accessory] && (
          <div style={{
            textAlign: 'center',
            fontSize: 22,
            marginBottom: -10,
            lineHeight: 1,
            animation: 'mascotFloat 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          }}>
            {ACCESSORIES[accessory]}
          </div>
        )}

        {/* Face image */}
        <div
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #f472b6',
            boxShadow: '0 4px 16px rgba(244,114,182,0.5), 0 0 0 2px white',
            background: '#fce7f3',
            animation: 'mascotWalk 0.35s ease-in-out infinite alternate',
            imageRendering: isPixelated ? 'pixelated' : 'auto',
          }}
        >
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(1.3) contrast(1.05)',
            }}
            draggable={false}
          />
        </div>

        {/* Shadow */}
        <div style={{
          width: SIZE * 0.7,
          height: 8,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.15)',
          margin: '2px auto 0',
          animation: 'mascotShadow 0.35s ease-in-out infinite alternate',
        }} />
      </div>

      {/* Name tag */}
      <div style={{
        textAlign: 'center',
        marginTop: 3,
        fontSize: 11,
        fontWeight: 800,
        color: '#9d174d',
        background: 'white',
        borderRadius: 10,
        padding: '2px 8px',
        border: '2px solid #fbcfe8',
        boxShadow: '0 2px 6px rgba(244,114,182,0.2)',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        {name}
      </div>
    </div>
  )
}
