import { useState } from 'react'
import { X, User, Users, Key, Check, Copy, LogOut, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onClose: () => void
}

type Tab = 'profile' | 'family' | 'change'

export default function FamilySettingsModal({ onClose }: Props) {
  const { user, myFamily, myMember, refreshFamily } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')

  // 내 정보 수정
  const [displayName, setDisplayName] = useState(myMember?.display_name ?? '')
  const [role, setRole] = useState<'parent' | 'child'>(myMember?.role ?? 'parent')

  // 가족 이름 수정
  const [familyName, setFamilyName] = useState(myFamily?.name ?? '')

  // 다른 가족 참여
  const [inviteCode, setInviteCode] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 2500)
  }

  const handleSaveProfile = async () => {
    if (!myMember) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase
      .from('family_members')
      .update({ display_name: displayName.trim(), role })
      .eq('id', myMember.id)
    if (err) setError(err.message)
    else { await refreshFamily(); showSuccess('내 정보가 저장되었습니다.') }
    setLoading(false)
  }

  const handleSaveFamilyName = async () => {
    if (!myFamily) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase
      .from('families')
      .update({ name: familyName.trim() })
      .eq('id', myFamily.id)
    if (err) setError(err.message)
    else { await refreshFamily(); showSuccess('가족 이름이 변경되었습니다.') }
    setLoading(false)
  }

  const handleJoinOtherFamily = async () => {
    if (!user || !myMember) return
    setLoading(true)
    setError('')

    // 초대코드로 가족 조회
    const { data: newFamily, error: findErr } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .maybeSingle()

    if (findErr || !newFamily) {
      setError('초대 코드가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    if (newFamily.id === myFamily?.id) {
      setError('이미 이 가족에 속해 있습니다.')
      setLoading(false)
      return
    }

    // 기존 가족에서 탈퇴
    const { error: leaveErr } = await supabase
      .from('family_members')
      .delete()
      .eq('id', myMember.id)

    if (leaveErr) {
      setError('가족 탈퇴 실패: ' + leaveErr.message)
      setLoading(false)
      return
    }

    // 새 가족에 참여
    const { error: joinErr } = await supabase
      .from('family_members')
      .insert({
        family_id: newFamily.id,
        user_id: user.id,
        display_name: myMember.display_name,
        role: myMember.role,
      })

    if (joinErr) {
      setError('가족 참여 실패: ' + joinErr.message)
      setLoading(false)
      return
    }

    await refreshFamily()
    onClose()
  }

  const copyInviteCode = () => {
    if (!myFamily) return
    navigator.clipboard.writeText(myFamily.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: '내 정보' },
    { key: 'family', label: '가족 정보' },
    { key: 'change', label: '가족 변경' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-bold text-gray-800">가족 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex mx-6 mt-4 bg-gray-100 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(''); setSuccess('') }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.key ? 'bg-white shadow text-purple-600' : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* ── 내 정보 탭 ── */}
          {tab === 'profile' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">내 이름</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="예: 엄마, 아빠, 민준"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">역할</label>
                <div className="flex gap-2">
                  {(['parent', 'child'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        role === r ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {r === 'parent' ? '👨‍👩‍👧 부모' : '🧒 아이'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={loading || !displayName.trim()}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </>
          )}

          {/* ── 가족 정보 탭 ── */}
          {tab === 'family' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">가족 이름</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="가족 이름"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveFamilyName}
                disabled={loading || !familyName.trim()}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '저장 중...' : '가족 이름 변경'}
              </button>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">가족 초대 코드</p>
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="font-mono font-bold text-blue-700 tracking-[0.2em] text-lg">
                    {myFamily?.invite_code}
                  </span>
                  <button onClick={copyInviteCode} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">이 코드를 가족에게 공유하면 함께 사용할 수 있어요.</p>
              </div>
            </>
          )}

          {/* ── 가족 변경 탭 ── */}
          {tab === 'change' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    현재 가족(<strong>{myFamily?.name}</strong>)에서 탈퇴하고 새 가족에 참여합니다.
                    기존 가족의 데이터는 유지되지만 더 이상 접근할 수 없게 됩니다.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">새 가족의 초대 코드</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="8자리 초대 코드"
                    maxLength={8}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 uppercase tracking-widest font-mono"
                  />
                </div>
              </div>

              {!confirmLeave ? (
                <button
                  onClick={() => setConfirmLeave(true)}
                  disabled={!inviteCode.trim() || inviteCode.trim().length < 6}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  가족 변경하기
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-center text-gray-600 font-medium">정말 가족을 변경할까요?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmLeave(false)}
                      className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleJoinOtherFamily}
                      disabled={loading}
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? '처리 중...' : '확인, 변경'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 오류 / 성공 메시지 */}
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm text-center bg-green-50 rounded-xl py-2 px-3">{success}</p>
          )}
        </div>
      </div>
    </div>
  )
}
