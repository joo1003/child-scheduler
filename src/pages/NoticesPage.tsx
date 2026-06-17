import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Notice } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, X, Check, ChevronDown, ChevronUp, Bell, Calendar, Pencil, Sparkles, Package, BookOpen, ListChecks, Loader } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

type FormData = { title: string; content: string; notice_date: string }

export default function NoticesPage() {
  const { selectedChild } = useChild()
  const { myFamily } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({ title: '', content: '', notice_date: format(new Date(), 'yyyy-MM-dd') })
  const [filter, setFilter] = useState<'all' | 'done' | 'todo'>('all')
  const [loading, setLoading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  const fetchNotices = async () => {
    if (!selectedChild) return
    const { data } = await supabase
      .from('notices')
      .select('*')
      .eq('child_id', selectedChild.id)
      .order('notice_date', { ascending: false })
    if (data) setNotices(data)
  }

  useEffect(() => { fetchNotices() }, [selectedChild])

  const resetForm = () => {
    setForm({ title: '', content: '', notice_date: format(new Date(), 'yyyy-MM-dd') })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChild || !myFamily) return
    setLoading(true)
    if (editingId) {
      await supabase.from('notices').update(form).eq('id', editingId)
    } else {
      await supabase.from('notices').insert({ ...form, child_id: selectedChild.id, family_id: myFamily.id })
    }
    await fetchNotices()
    resetForm()
    setLoading(false)
  }

  const toggleDone = async (notice: Notice) => {
    await supabase.from('notices').update({ is_done: !notice.is_done }).eq('id', notice.id)
    setNotices(notices.map((n) => n.id === notice.id ? { ...n, is_done: !n.is_done } : n))
  }

  const handleDelete = async (id: string) => {
    await supabase.from('notices').delete().eq('id', id)
    setNotices(notices.filter((n) => n.id !== id))
  }

  const handleEdit = (notice: Notice) => {
    setForm({ title: notice.title, content: notice.content ?? '', notice_date: notice.notice_date })
    setEditingId(notice.id)
    setShowForm(true)
  }

  const analyzeNotice = async (notice: Notice) => {
    if (!notice.content?.trim()) {
      alert('분석할 내용을 먼저 입력해주세요.')
      return
    }
    setAnalyzingId(notice.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-notice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ content: notice.content }),
        }
      )
      const analysis = await res.json()
      if (analysis.error) {
        if (analysis.error.includes('ANTHROPIC_API_KEY')) {
          alert('AI 분석을 사용하려면 Supabase 대시보드에서 ANTHROPIC_API_KEY를 설정해주세요.\n\nSupabase 대시보드 → Edge Functions → analyze-notice → Secrets')
        } else {
          alert('분석 중 오류가 발생했습니다: ' + analysis.error)
        }
        return
      }
      await supabase.from('notices').update({ ai_analysis: analysis }).eq('id', notice.id)
      setNotices(notices.map((n) => n.id === notice.id ? { ...n, ai_analysis: analysis } : n))
      setExpandedId(notice.id)
    } catch (err) {
      alert('분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzingId(null)
    }
  }

  const filtered = notices.filter((n) => {
    if (filter === 'done') return n.is_done
    if (filter === 'todo') return !n.is_done
    return true
  })

  const todoCount = notices.filter((n) => !n.is_done).length

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>왼쪽 메뉴에서 아이를 선택하거나 추가해주세요.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{selectedChild.name}의 알림장</h1>
          {todoCount > 0 && (
            <p className="text-sm text-orange-500 mt-1 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" /> 처리 안 된 알림 {todoCount}개
            </p>
          )}
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600">
          <Plus className="w-4 h-4" /> 알림 추가
        </button>
      </div>

      {/* Filter */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {([['all', '전체'], ['todo', '미처리'], ['done', '완료']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === val ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            {label}
            {val === 'todo' && todoCount > 0 && (
              <span className="ml-1.5 bg-orange-400 text-white text-xs rounded-full px-1.5 py-0.5">{todoCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm mb-4 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? '알림 수정' : '새 알림'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 block mb-1">제목 *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required placeholder="예: 내일 준비물"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">날짜</label>
                <input type="date" value={form.notice_date} onChange={(e) => setForm({ ...form, notice_date: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">내용</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="알림 내용을 입력하세요... (AI가 준비물을 분석해드려요)"
                rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">취소</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50">
                {loading ? '저장 중...' : editingId ? '수정' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notice list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>알림이 없습니다.</p>
          </div>
        ) : (
          filtered.map((notice) => (
            <div key={notice.id}
              className={`bg-white rounded-2xl border transition-all ${notice.is_done ? 'border-gray-100 opacity-60' : 'border-gray-200 shadow-sm'}`}>
              <div className="flex items-start gap-3 p-4">
                <button onClick={() => toggleDone(notice)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    notice.is_done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'
                  }`}>
                  {notice.is_done && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium text-sm ${notice.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {notice.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(notice.notice_date), 'M/d (E)', { locale: ko })}
                      </span>
                      {/* AI 분석 버튼 */}
                      <button
                        onClick={() => analyzeNotice(notice)}
                        disabled={analyzingId === notice.id}
                        className="p-1 text-purple-300 hover:text-purple-500 transition-colors"
                        title="AI 준비물 분석"
                      >
                        {analyzingId === notice.id
                          ? <Loader className="w-3.5 h-3.5 animate-spin" />
                          : <Sparkles className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleEdit(notice)} className="p-1 text-gray-300 hover:text-blue-400">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(notice.id)} className="p-1 text-gray-300 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {(notice.content || notice.ai_analysis) && (
                        <button onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
                          className="p-1 text-gray-300 hover:text-gray-500">
                          {expandedId === notice.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === notice.id && (
                    <div className="mt-3 space-y-3">
                      {notice.content && (
                        <p className="text-sm text-gray-500 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{notice.content}</p>
                      )}

                      {notice.ai_analysis && (
                        <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-purple-600 font-medium text-xs mb-2">
                            <Sparkles className="w-3.5 h-3.5" /> AI 분석 결과
                          </div>

                          {notice.ai_analysis.summary && (
                            <p className="text-xs text-gray-600 italic">{notice.ai_analysis.summary}</p>
                          )}

                          {notice.ai_analysis.materials?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 mb-1">
                                <Package className="w-3 h-3" /> 준비물
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {notice.ai_analysis.materials.map((m, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{m}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {notice.ai_analysis.books?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mb-1">
                                <BookOpen className="w-3 h-3" /> 교재/도서
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {notice.ai_analysis.books.map((b, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{b}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {notice.ai_analysis.todos?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-xs font-semibold text-green-600 mb-1">
                                <ListChecks className="w-3 h-3" /> 할 일
                              </div>
                              <ul className="space-y-0.5">
                                {notice.ai_analysis.todos.map((t, i) => (
                                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                                    {t}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
