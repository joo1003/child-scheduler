import { useState, useRef, useCallback } from 'react'
import { Music, Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react'

type Mood = 'happy' | 'calm' | 'focus' | 'exciting'

const MOODS: { id: Mood; label: string; emoji: string; color: string; desc: string }[] = [
  { id: 'happy', label: '행복해요', emoji: '😊', color: '#f59e0b', desc: '밝고 경쾌한 멜로디' },
  { id: 'calm', label: '평온해요', emoji: '😌', color: '#6366f1', desc: '잔잔하고 부드러운 음악' },
  { id: 'focus', label: '집중해요', emoji: '🎯', color: '#10b981', desc: '공부할 때 딱 좋은 음악' },
  { id: 'exciting', label: '신나요', emoji: '🎉', color: '#ef4444', desc: '빠르고 신나는 비트' },
]

// Pentatonic scales (in Hz)
const SCALES: Record<Mood, number[]> = {
  happy: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25],
  calm: [220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 440.00, 493.88],
  focus: [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00],
  exciting: [293.66, 329.63, 369.99, 440.00, 493.88, 523.25, 587.33, 659.25],
}

// Note patterns (indices into scale)
const MELODY_PATTERNS: Record<Mood, number[][]> = {
  happy: [[0,2,4,2,3,1,4,0],[2,4,5,4,3,2,1,2],[0,1,3,4,5,3,2,0],[4,5,6,5,4,3,2,1]],
  calm: [[0,2,4,2,1,0,2,1],[0,1,3,2,1,0,1,0],[2,3,4,3,2,1,2,0],[0,2,3,4,3,2,0,1]],
  focus: [[0,0,2,2,1,1,3,3],[2,2,4,4,3,3,1,1],[0,1,2,1,0,2,1,0],[3,2,1,2,3,1,2,0]],
  exciting: [[0,2,4,6,5,3,2,4],[0,4,3,4,2,4,1,4],[4,5,6,5,4,2,4,3],[0,2,4,2,4,5,4,2]],
}

const TEMPOS: Record<Mood, number> = {
  happy: 0.22,
  calm: 0.45,
  focus: 0.3,
  exciting: 0.15,
}

const WAVEFORMS: Record<Mood, OscillatorType> = {
  happy: 'triangle',
  calm: 'sine',
  focus: 'sine',
  exciting: 'sawtooth',
}

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMood, setCurrentMood] = useState<Mood>('happy')
  const [volume, setVolume] = useState(0.4)
  const [isMuted, setIsMuted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playingRef = useRef(false)
  const moodRef = useRef<Mood>('happy')
  const volumeRef = useRef(0.4)
  const mutedRef = useRef(false)
  const noteIdxRef = useRef(0)
  const patternIdxRef = useRef(0)

  moodRef.current = currentMood
  volumeRef.current = volume
  mutedRef.current = isMuted

  const playNote = useCallback((freq: number, duration: number, type: OscillatorType, gainVal: number, delay = 0) => {
    const ctx = ctxRef.current
    if (!ctx || !masterRef.current) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(masterRef.current)

    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)

    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration * 0.85)

    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + duration)
  }, [])

  const scheduleNext = useCallback(() => {
    if (!playingRef.current) return

    const mood = moodRef.current
    const scale = SCALES[mood]
    const patterns = MELODY_PATTERNS[mood]
    const tempo = TEMPOS[mood]
    const waveform = WAVEFORMS[mood]

    const pattern = patterns[patternIdxRef.current % patterns.length]
    const noteIdx = noteIdxRef.current % pattern.length
    const scaleIdx = pattern[noteIdx]
    const freq = scale[Math.min(scaleIdx, scale.length - 1)]

    // Melody note
    playNote(freq, tempo * 0.85, waveform, 0.15)

    // Bass (every 4 notes, one octave down)
    if (noteIdx % 4 === 0) {
      playNote(freq / 2, tempo * 3.5, 'sine', 0.12)
    }

    // Hi-hat (every 2 notes for exciting/happy)
    if ((mood === 'exciting' || mood === 'happy') && noteIdx % 2 === 0) {
      if (ctxRef.current && masterRef.current) {
        const ctx = ctxRef.current
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
        const src = ctx.createBufferSource()
        const g = ctx.createGain()
        src.buffer = buf
        src.connect(g)
        g.connect(masterRef.current)
        g.gain.value = 0.04
        src.start()
      }
    }

    // Kick drum (every 8 notes for exciting)
    if (mood === 'exciting' && noteIdx % 8 === 0) {
      playNote(60, 0.15, 'sine', 0.25)
    }

    // Chord harmony (calm/happy)
    if ((mood === 'calm' || mood === 'happy') && noteIdx % 4 === 0) {
      const harmFreq = scale[Math.min(scaleIdx + 2, scale.length - 1)]
      playNote(harmFreq, tempo * 1.8, 'sine', 0.06)
    }

    noteIdxRef.current++
    if (noteIdxRef.current % pattern.length === 0) {
      patternIdxRef.current++
    }

    timeoutRef.current = setTimeout(scheduleNext, tempo * 1000)
  }, [playNote])

  const start = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume()
    }

    masterRef.current = ctxRef.current.createGain()
    masterRef.current.gain.value = mutedRef.current ? 0 : volumeRef.current
    masterRef.current.connect(ctxRef.current.destination)

    playingRef.current = true
    noteIdxRef.current = 0
    patternIdxRef.current = 0
    scheduleNext()
  }, [scheduleNext])

  const stop = useCallback(() => {
    playingRef.current = false
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const togglePlay = async () => {
    if (isPlaying) {
      stop()
      setIsPlaying(false)
    } else {
      await start()
      setIsPlaying(true)
    }
  }

  const changeMood = async (mood: Mood) => {
    setCurrentMood(mood)
    moodRef.current = mood
    noteIdxRef.current = 0
    patternIdxRef.current = 0
    if (!isPlaying) {
      await start()
      setIsPlaying(true)
    }
  }

  const changeVolume = (v: number) => {
    setVolume(v)
    if (masterRef.current) masterRef.current.gain.value = isMuted ? 0 : v
  }

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    mutedRef.current = next
    if (masterRef.current) masterRef.current.gain.value = next ? 0 : volume
  }

  const activeMood = MOODS.find(m => m.id === currentMood)!

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9998,
        background: 'white',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '2px solid #e9d5ff',
        overflow: 'hidden',
        minWidth: 220,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${activeMood.color}22, ${activeMood.color}44)`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #f3e8ff' : 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: activeMood.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            animation: isPlaying ? 'musicPulse 1s ease-in-out infinite' : 'none',
          }}>
            {isPlaying ? '🎵' : <Music style={{ width: 16, height: 16, color: 'white' }} />}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95' }}>
              {activeMood.emoji} {activeMood.label}
            </div>
            <div style={{ fontSize: 10, color: '#7c3aed' }}>
              {isPlaying ? '재생 중...' : '음악 플레이어'}
            </div>
          </div>
        </div>
        {isExpanded ? <ChevronDown size={16} color="#7c3aed" /> : <ChevronUp size={16} color="#7c3aed" />}
      </div>

      {/* Controls */}
      {isExpanded && (
        <div style={{ padding: '12px 14px' }}>
          {/* Mood buttons */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              분위기 선택
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {MOODS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => changeMood(mood.id)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 10,
                    border: `2px solid ${currentMood === mood.id ? mood.color : '#e5e7eb'}`,
                    background: currentMood === mood.id ? `${mood.color}22` : 'white',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: currentMood === mood.id ? 700 : 500,
                    color: currentMood === mood.id ? mood.color : '#6b7280',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>

          {/* Play/Pause + Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={togglePlay}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: activeMood.color,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${activeMood.color}66`,
                transition: 'transform 0.1s',
              }}
            >
              {isPlaying
                ? <Pause style={{ width: 16, height: 16, color: 'white' }} />
                : <Play style={{ width: 16, height: 16, color: 'white', marginLeft: 2 }} />}
            </button>

            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
            >
              {isMuted
                ? <VolumeX style={{ width: 16, height: 16, color: '#9ca3af' }} />
                : <Volume2 style={{ width: 16, height: 16, color: '#7c3aed' }} />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={e => changeVolume(Number(e.target.value))}
              style={{ flex: 1, accentColor: activeMood.color, cursor: 'pointer' }}
            />
          </div>

          {/* Desc */}
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
            {activeMood.desc}
          </p>
        </div>
      )}
    </div>
  )
}
