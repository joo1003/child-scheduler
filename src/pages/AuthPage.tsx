import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Mail, Lock, User, Eye, EyeOff, Users, Key, LogOut } from 'lucide-react'

export default function AuthPage() {
  const { user, myFamily, refreshFamily } = useAuth()

  // ── 로그인/회원가입 폼 상태 ──
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── 가족 설정 폼 상태 ──
  const [familyMode, setFamilyMode] = useState<'create' | 'join'>('create')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'parent' | 'child'>('parent')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── 로그인/회원가입 처리 ──
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (authMode === 'signup') {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      // 이메일 인증 없이 바로 로그인
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) {
        setError('가입은 됐습니다. 로그인해주세요.')
        setAuthMode('login')
        setLoading(false)
        return
      }
    } else {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); setLoading(false); return }
    }

    setLoading(false)
    // AuthContext가 user를 감지 → myFamily 없으면 가족설정 화면으로 자동 전환
  }

  // ── 가족 설정 처리 ──
  const handleFamilySetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('로그인 상태가 아닙니다. 페이지를 새로고침 해주세요.')
      return
    }

    const name = displayName.trim() || user.email?.split('@')[0] || '사용자'

    setLoading(true)

    try {
      if (familyMode === 'create') {
        const familyId = crypto.randomUUID()

        const { error: fErr } = await supabase
          .from('families')
          .insert({ id: familyId, name: familyName.trim() })

        if (fErr) {
          setError('가족 생성 실패: ' + fErr.message)
          setLoading(false)
          return
        }

        const { error: mErr } = await supabase
          .from('family_members')
          .insert({ family_id: familyId, user_id: user.id, display_name: name, role })

        if (mErr) {
          setError('멤버 추가 실패: ' + mErr.message)
          setLoading(false)
          return
        }
      } else {
        const { data: family, error: fErr } = await supabase
          .from('families')
          .select('*')
          .eq('invite_code', inviteCode.toUpperCase().trim())
          .maybeSingle()

        if (fErr) { setError('조회 오류: ' + fErr.message); setLoading(false); return }
        if (!family) { setError('초대 코드가 올바르지 않습니다.'); setLoading(false); return }

        const { error: mErr } = await supabase
          .from('family_members')
          .insert({ family_id: family.id, user_id: user.id, display_name: name, role })

        if (mErr) { setError('참여 실패: ' + mErr.message); setLoading(false); return }
      }

      await refreshFamily()
    } catch (err: unknown) {
      setError('오류: ' + String(err))
    }

    setLoading(false)
  }

  // ── 로그인 O, 가족 없음 → 가족 설정 화면 ──
  if (user && !myFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">가족 설정</h1>
            <p className="text-gray-400 text-sm mt-1">{user.email}</p>
          </div>

          {/* 탭 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button onClick={() => setFamilyMode('create')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${familyMode === 'create' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>
              가족 만들기
            </button>
            <button onClick={() => setFamilyMode('join')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${familyMode === 'join' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>
              코드로 참여
            </button>
          </div>

          <form onSubmit={handleFamilySetup} className="space-y-3">
            {/* 내 이름 */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">내 이름 *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="예: 엄마, 아빠, 민준" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            {/* 역할 */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">역할</label>
              <div className="flex gap-2">
                {(['parent', 'child'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      role === r ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}>
                    {r === 'parent' ? '👨‍👩‍👧 부모' : '🧒 아이'}
                  </button>
                ))}
              </div>
            </div>

            {/* 가족 만들기 or 참여 */}
            {familyMode === 'create' ? (
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">가족 이름 *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="예: 행복한 우리 가족" value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">초대 코드 *</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="8자리 코드 입력" value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)} required maxLength={8}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 uppercase tracking-widest font-mono" />
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 mt-1">
              {loading ? '처리 중...' : familyMode === 'create' ? '✨ 가족 만들기' : '🔗 가족 참여하기'}
            </button>

            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              다른 계정으로 로그인
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── 로그인 화면 ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">우리 아이 스케줄러</h1>
          <p className="text-gray-400 text-sm mt-1">가족이 함께 아이의 하루를 관리해요</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button onClick={() => { setAuthMode('login'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            로그인
          </button>
          <button onClick={() => { setAuthMode('signup'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'signup' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            회원가입
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="email" placeholder="이메일" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type={showPassword ? 'text' : 'password'} placeholder="비밀번호 (6자 이상)"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50">
            {loading ? '처리 중...' : authMode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}
