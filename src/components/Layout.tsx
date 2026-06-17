import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, Calendar, Clock, Image, Bell, LogOut, Plus, ChevronDown, MessageCircle, Copy, Check, School, Star, Gamepad2, Sparkles, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useChild } from '../contexts/ChildContext'
import { useState } from 'react'
import ChildModal from './ChildModal'
import MascotCharacter from './MascotCharacter'
import MusicPlayer from './MusicPlayer'
import CharacterSetupModal from './CharacterSetupModal'
import FamilySettingsModal from './FamilySettingsModal'

const navItems = [
  { to: '/timetable', icon: Clock, label: '시간표' },
  { to: '/academies', icon: School, label: '학원/방과후' },
  { to: '/calendar', icon: Calendar, label: '달력' },
  { to: '/photos', icon: Image, label: '사진' },
  { to: '/notices', icon: Bell, label: '알림장' },
  { to: '/chat', icon: MessageCircle, label: '가족 채팅' },
  { to: '/games', icon: Gamepad2, label: '미니 게임' },
  { to: '/interests', icon: Star, label: '관심사' },
]

interface MascotData {
  imageUrl: string
  name: string
  accessory: string
}

export default function Layout() {
  const { user, myFamily, myMember, signOut } = useAuth()
  const { children, selectedChild, selectChild, refreshChildren } = useChild()
  const [showChildModal, setShowChildModal] = useState(false)
  const [showChildPicker, setShowChildPicker] = useState(false)
  const [showFamilyInfo, setShowFamilyInfo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCharacterSetup, setShowCharacterSetup] = useState(false)
  const [showFamilySettings, setShowFamilySettings] = useState(false)
  const [mascot, setMascot] = useState<MascotData | null>(null)
  const [showMascot, setShowMascot] = useState(false)

  const copyInviteCode = () => {
    if (!myFamily) return
    navigator.clipboard.writeText(myFamily.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMascotSave = (data: MascotData) => {
    setMascot(data)
    setShowMascot(true)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{myFamily?.name ?? '우리 아이 스케줄러'}</p>
              <button onClick={() => setShowFamilyInfo(!showFamilyInfo)}
                className="text-xs text-blue-400 hover:text-blue-600 flex items-center gap-1">
                초대코드 보기
              </button>
            </div>
          </div>
          {showFamilyInfo && myFamily && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">가족 초대 코드</p>
              <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2 mb-2">
                <span className="font-mono font-bold text-blue-700 tracking-[0.2em] text-base">{myFamily.invite_code}</span>
                <button onClick={copyInviteCode} className="text-blue-400 hover:text-blue-600 ml-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => {
                  const text = `우리 아이 스케줄러에 초대합니다!\n앱 접속 후 "코드로 참여" 선택 → 코드 입력: ${myFamily.invite_code}`
                  if (navigator.share) {
                    navigator.share({ title: '가족 초대', text })
                  } else {
                    navigator.clipboard.writeText(text)
                    alert('초대 메시지가 복사되었습니다. 카카오톡에 붙여넣기 하세요!')
                  }
                }}
                className="w-full py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                📤 초대 메시지 공유
              </button>
            </div>
          )}
        </div>

        {/* Child Selector */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">아이 선택</p>
          <div className="relative">
            <button onClick={() => setShowChildPicker(!showChildPicker)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
              <span>{selectedChild?.name ?? '아이를 선택하세요'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showChildPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {children.map((child) => (
                  <button key={child.id} onClick={() => { selectChild(child); setShowChildPicker(false) }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
                    {child.name}
                    {child.school && <span className="text-gray-400 ml-1">· {child.school}</span>}
                  </button>
                ))}
                <button onClick={() => { setShowChildModal(true); setShowChildPicker(false) }}
                  className="w-full px-3 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100">
                  <Plus className="w-4 h-4" /> 아이 추가
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`
              }>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Fun Features Button */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowCharacterSetup(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-purple-600 hover:bg-purple-50"
            style={{
              background: mascot && showMascot
                ? 'linear-gradient(135deg, #fce7f3, #ede9fe)'
                : undefined,
              border: mascot && showMascot ? '1.5px solid #e9d5ff' : '1.5px dashed #d8b4fe',
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>{mascot ? `${mascot.name} 캐릭터` : '캐릭터 만들기'}</span>
            {mascot && showMascot && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✨</span>}
          </button>

          {mascot && (
            <button
              onClick={() => setShowMascot(v => !v)}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '6px',
                borderRadius: 10,
                border: '1px solid #f3e8ff',
                background: 'transparent',
                fontSize: 11,
                color: '#9ca3af',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {showMascot ? '🙈 캐릭터 숨기기' : '👀 캐릭터 보이기'}
            </button>
          )}
        </div>

        {/* User info */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                style={{ backgroundColor: myMember?.role === 'child' ? '#f59e0b' : '#6366f1' }}>
                {myMember?.display_name?.[0] ?? user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{myMember?.display_name ?? '사용자'}</p>
                <p className="text-xs text-gray-400">{myMember?.role === 'child' ? '아이' : '부모'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setShowFamilySettings(true)} className="text-gray-400 hover:text-purple-500 transition-colors" title="가족 설정">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={signOut} className="text-gray-400 hover:text-red-500 transition-colors" title="로그아웃">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Mascot Character */}
      {mascot && showMascot && (
        <MascotCharacter
          imageUrl={mascot.imageUrl}
          name={mascot.name}
          accessory={mascot.accessory}
          onRemove={() => setShowMascot(false)}
        />
      )}

      {/* Music Player */}
      <MusicPlayer />

      {/* Modals */}
      {showChildModal && (
        <ChildModal onClose={() => setShowChildModal(false)} onSaved={refreshChildren} />
      )}

      {showFamilySettings && (
        <FamilySettingsModal onClose={() => setShowFamilySettings(false)} />
      )}

      {showCharacterSetup && (
        <CharacterSetupModal
          onClose={() => setShowCharacterSetup(false)}
          onSave={handleMascotSave}
          current={mascot}
        />
      )}
    </div>
  )
}
