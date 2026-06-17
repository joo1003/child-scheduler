import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Academy, AcademyPayment } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, X, Trash2, Save, Phone, MapPin, User, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, Circle } from 'lucide-react'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

const COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#6366f1',
]

type ScheduleItem = { days: number[]; start_time: string; end_time: string }

type FormState = {
  name: string
  type: 'academy' | 'activity'
  phone: string
  address: string
  teacher: string
  monthly_fee: string
  payment_day: string
  color: string
  is_active: boolean
  memo: string
  schedule: ScheduleItem[]
}

const EMPTY_FORM = (): FormState => ({
  name: '',
  type: 'academy',
  phone: '',
  address: '',
  teacher: '',
  monthly_fee: '',
  payment_day: '25',
  color: COLORS[0],
  is_active: true,
  memo: '',
  schedule: [],
})

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatYearMonth(ym: string) {
  const [y, m] = ym.split('-')
  return `${y}년 ${parseInt(m)}월`
}

// 납부 알림: 오늘 날짜 >= 납부일 이고 이번달 납부 안된 학원 목록
function getOverdueAcademies(academies: Academy[], payments: AcademyPayment[]) {
  const today = new Date()
  const todayDay = today.getDate()
  const ym = currentYearMonth()
  return academies.filter(ac => {
    if (!ac.is_active || !ac.monthly_fee || !ac.payment_day) return false
    if (todayDay < ac.payment_day) return false
    return !payments.some(p => p.academy_id === ac.id && p.year_month === ym && p.paid_at)
  })
}

export default function AcademiesPage() {
  const { selectedChild } = useChild()
  const { myFamily } = useAuth()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [payments, setPayments] = useState<AcademyPayment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM())
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState<string | null>(null)
  const [syncTimetable, setSyncTimetable] = useState(true)
  const [viewMonth, setViewMonth] = useState(currentYearMonth())
  const [dismissedAlert, setDismissedAlert] = useState(false)

  const fetchAcademies = async () => {
    if (!selectedChild) return
    const { data } = await supabase.from('academies').select('*').eq('child_id', selectedChild.id).order('created_at')
    if (data) setAcademies(data)
  }

  const fetchPayments = async () => {
    if (!selectedChild) return
    const { data } = await supabase.from('academy_payments').select('*').eq('child_id', selectedChild.id)
    if (data) setPayments(data)
  }

  useEffect(() => {
    fetchAcademies()
    fetchPayments()
  }, [selectedChild])

  const openNew = () => { setEditId(null); setOriginalName(null); setForm(EMPTY_FORM()); setShowForm(true) }
  const openEdit = (ac: Academy) => {
    setEditId(ac.id)
    setOriginalName(ac.name)
    // 기존 데이터가 day_of_week 단일값이면 days 배열로 변환
    const schedule: ScheduleItem[] = (ac.schedule ?? []).map((s: any) => ({
      days: Array.isArray(s.days) ? s.days : [s.day_of_week ?? 0],
      start_time: s.start_time,
      end_time: s.end_time,
    }))
    setForm({
      name: ac.name, type: ac.type, phone: ac.phone ?? '', address: ac.address ?? '',
      teacher: ac.teacher ?? '', monthly_fee: ac.monthly_fee != null ? String(ac.monthly_fee) : '',
      payment_day: ac.payment_day != null ? String(ac.payment_day) : '25',
      color: ac.color, is_active: ac.is_active, memo: ac.memo ?? '', schedule,
    })
    setShowForm(true)
  }

  const addSchedule = () => setForm(prev => ({ ...prev, schedule: [...prev.schedule, { days: [0], start_time: '14:00', end_time: '16:00' }] }))
  const updateScheduleTime = (i: number, field: 'start_time' | 'end_time', value: string) =>
    setForm(prev => { const s = [...prev.schedule]; s[i] = { ...s[i], [field]: value }; return { ...prev, schedule: s } })
  const toggleScheduleDay = (i: number, day: number) =>
    setForm(prev => {
      const s = [...prev.schedule]
      const days = s[i].days.includes(day) ? s[i].days.filter(d => d !== day) : [...s[i].days, day]
      s[i] = { ...s[i], days: days.length === 0 ? [day] : days.sort((a, b) => a - b) }
      return { ...prev, schedule: s }
    })
  const removeSchedule = (i: number) => setForm(prev => ({ ...prev, schedule: prev.schedule.filter((_, idx) => idx !== i) }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChild || !myFamily) return
    setSaving(true)

    const payload = {
      child_id: selectedChild.id, family_id: myFamily.id,
      name: form.name.trim(), type: form.type,
      phone: form.phone || null, address: form.address || null,
      teacher: form.teacher || null,
      monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
      payment_day: form.payment_day ? Number(form.payment_day) : null,
      color: form.color, is_active: form.is_active, memo: form.memo || null, schedule: form.schedule,
    }

    let savedId = editId
    if (editId) {
      await supabase.from('academies').update(payload).eq('id', editId)
    } else {
      const { data } = await supabase.from('academies').insert(payload).select().single()
      if (data) savedId = data.id
    }

    if (syncTimetable && savedId && form.schedule.length > 0) {
      // 현재 활성 시간표 버전 조회
      const { data: activeVersion } = await supabase
        .from('timetable_versions')
        .select('id')
        .eq('child_id', selectedChild.id)
        .eq('is_active', true)
        .maybeSingle()
      const versionId = activeVersion?.id ?? null

      // 기존 슬롯 삭제 (이름 변경 시 원래 이름 기준으로 삭제)
      const nameToDelete = originalName ?? form.name.trim()
      let deleteQuery = supabase.from('timetable_slots')
        .delete()
        .eq('child_id', selectedChild.id)
        .eq('subject', nameToDelete)
      if (versionId) deleteQuery = deleteQuery.eq('version_id', versionId)
      else deleteQuery = deleteQuery.is('version_id', null)
      await deleteQuery

      const slotType: 'academy' | 'activity' = form.type === 'academy' ? 'academy' : 'activity'
      for (const sch of form.schedule) {
        if (timeToMinutes(sch.end_time) <= timeToMinutes(sch.start_time)) continue
        for (const day of sch.days) {
          await supabase.from('timetable_slots').insert({
            child_id: selectedChild.id,
            version_id: versionId,
            day_of_week: day,
            start_time: sch.start_time, end_time: sch.end_time,
            subject: form.name.trim(), teacher: form.teacher || null, location: form.address || null,
            type: slotType, color: form.color, memo: form.memo || null,
          })
        }
      }
    }

    await fetchAcademies()
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editId || !selectedChild) return
    if (!confirm('삭제하면 연계된 시간표 슬롯도 함께 삭제됩니다. 계속할까요?')) return
    const ac = academies.find(a => a.id === editId)
    if (ac) await supabase.from('timetable_slots').delete().eq('child_id', selectedChild.id).eq('subject', ac.name)
    await supabase.from('academies').delete().eq('id', editId)
    await fetchAcademies()
    setShowForm(false)
  }

  const toggleActive = async (ac: Academy) => {
    await supabase.from('academies').update({ is_active: !ac.is_active }).eq('id', ac.id)
    await fetchAcademies()
  }

  const getPayment = (academyId: string, ym: string) =>
    payments.find(p => p.academy_id === academyId && p.year_month === ym)

  const markPaid = async (ac: Academy) => {
    const existing = getPayment(ac.id, viewMonth)
    if (existing?.paid_at) {
      // 납부 취소
      await supabase.from('academy_payments').update({ paid_at: null }).eq('id', existing.id)
    } else if (existing) {
      await supabase.from('academy_payments').update({ paid_at: new Date().toISOString(), amount: ac.monthly_fee }).eq('id', existing.id)
    } else {
      await supabase.from('academy_payments').insert({
        academy_id: ac.id, child_id: selectedChild!.id, family_id: myFamily!.id,
        year_month: viewMonth, paid_at: new Date().toISOString(), amount: ac.monthly_fee,
      })
    }
    await fetchPayments()
  }

  const prevMonth = () => {
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (next <= currentYearMonth()) setViewMonth(next)
  }

  const overdue = getOverdueAcademies(academies, payments)
  const totalFee = academies.filter(a => a.is_active && a.monthly_fee).reduce((s, a) => s + (a.monthly_fee ?? 0), 0)
  const paidThisMonth = payments.filter(p => p.year_month === currentYearMonth() && p.paid_at).reduce((s, p) => s + (p.amount ?? 0), 0)

  if (!selectedChild) {
    return <div className="flex items-center justify-center h-full text-gray-400"><p>아이를 선택해주세요.</p></div>
  }

  const activeAcademies = academies.filter(a => a.is_active)
  const inactiveAcademies = academies.filter(a => !a.is_active)

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{selectedChild.name}의 학원/방과후</h1>
          <p className="text-xs text-gray-400 mt-0.5">등록하면 시간표에 자동 반영됩니다</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>

      {/* 납부 미완료 알림 */}
      {overdue.length > 0 && !dismissedAlert && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">납부 기한이 지난 학원이 있습니다</p>
            <p className="text-xs text-red-500 mt-0.5">{overdue.map(a => a.name).join(', ')} — 이번달 납부를 확인해주세요</p>
          </div>
          <button onClick={() => setDismissedAlert(true)} className="text-red-300 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 이번달 납부 현황 */}
        {academies.some(a => a.monthly_fee) && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">납부 관리</h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 text-lg">‹</button>
                <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">{formatYearMonth(viewMonth)}</span>
                <button onClick={nextMonth} className={`text-lg ${viewMonth >= currentYearMonth() ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>›</button>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {academies.filter(a => a.monthly_fee).map(ac => {
                const payment = getPayment(ac.id, viewMonth)
                const isPaid = !!payment?.paid_at
                const today = new Date()
                const todayDay = today.getDate()
                const isCurrentMonth = viewMonth === currentYearMonth()
                const isOverdue = isCurrentMonth && ac.payment_day && todayDay >= ac.payment_day && !isPaid && ac.is_active

                return (
                  <div key={ac.id} className={`flex items-center gap-3 px-5 py-3.5 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: ac.color }}>{ac.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{ac.name}</p>
                        {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">납부 기한 초과</span>}
                      </div>
                      <p className="text-xs text-gray-400">
                        {ac.monthly_fee?.toLocaleString()}원
                        {ac.payment_day && ` · 매월 ${ac.payment_day}일 납부`}
                        {isPaid && payment?.paid_at && ` · 납부완료 ${new Date(payment.paid_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`}
                      </p>
                    </div>
                    <button onClick={() => markPaid(ac)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isPaid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {isPaid ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {isPaid ? '납부완료' : '납부확인'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 합계 */}
            <div className="px-5 py-3 bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-gray-500">이번달 합계</span>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">{paidThisMonth.toLocaleString()}원 납부</span>
                <span className="text-xs text-gray-400 ml-2">/ {totalFee.toLocaleString()}원</span>
              </div>
            </div>
          </section>
        )}

        {academies.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-4xl mb-3">🏫</p>
            <p className="font-medium">등록된 학원이 없습니다</p>
            <p className="text-sm mt-1">오른쪽 위 추가 버튼을 눌러 등록하세요</p>
          </div>
        )}

        {activeAcademies.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">활성 ({activeAcademies.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeAcademies.map(ac => {
                const payment = getPayment(ac.id, currentYearMonth())
                const isPaid = !!payment?.paid_at
                const today = new Date()
                const isOverdue = ac.payment_day && today.getDate() >= ac.payment_day && !isPaid && !!ac.monthly_fee
                return <AcademyCard key={ac.id} ac={ac} expanded={expandedId === ac.id}
                  isPaid={isPaid} isOverdue={!!isOverdue}
                  onToggleExpand={() => setExpandedId(expandedId === ac.id ? null : ac.id)}
                  onEdit={() => openEdit(ac)} onToggleActive={() => toggleActive(ac)} />
              })}
            </div>
          </section>
        )}

        {inactiveAcademies.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">비활성 ({inactiveAcademies.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
              {inactiveAcademies.map(ac => <AcademyCard key={ac.id} ac={ac} expanded={expandedId === ac.id}
                isPaid={false} isOverdue={false}
                onToggleExpand={() => setExpandedId(expandedId === ac.id ? null : ac.id)}
                onEdit={() => openEdit(ac)} onToggleActive={() => toggleActive(ac)} />)}
            </div>
          </section>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800 text-lg">{editId ? '수정' : '학원/방과후 추가'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['academy', 'activity'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form.type === t ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'}`}>
                    {t === 'academy' ? '🏫 학원' : '🎯 방과후/활동'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">이름 *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="예: 영어학원, 축구 클럽" required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1"><Phone className="inline w-3 h-3 mr-0.5" />전화</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1"><User className="inline w-3 h-3 mr-0.5" />선생님</label>
                  <input type="text" value={form.teacher} onChange={e => setForm(p => ({ ...p, teacher: e.target.value }))}
                    placeholder="담당 선생님"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1"><MapPin className="inline w-3 h-3 mr-0.5" />주소</label>
                <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="학원 주소"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              {/* 납부 정보 */}
              <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-purple-700">💰 수강료 및 납부</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">월 수강료 (원)</label>
                    <input type="number" value={form.monthly_fee} onChange={e => setForm(p => ({ ...p, monthly_fee: e.target.value }))}
                      placeholder="예: 250000" min={0}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-purple-300" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">납부일 (매월 며칠)</label>
                    <input type="number" value={form.payment_day} onChange={e => setForm(p => ({ ...p, payment_day: e.target.value }))}
                      placeholder="예: 25" min={1} max={31}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white focus:ring-2 focus:ring-purple-300" />
                  </div>
                </div>
                {form.payment_day && <p className="text-[10px] text-purple-500">매월 {form.payment_day}일이 지나도 납부 안 되면 알림이 표시됩니다</p>}
              </div>

              {/* 색상 */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">색상</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              {/* 스케줄 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">수업 시간표</label>
                  <button type="button" onClick={addSchedule} className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> 시간 추가
                  </button>
                </div>
                {form.schedule.length === 0 && <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">수업 시간을 추가하세요</p>}
                <div className="space-y-3">
                  {form.schedule.map((sch, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {/* 요일 다중 선택 */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {DAYS.map((d, di) => (
                          <button key={di} type="button"
                            onClick={() => toggleScheduleDay(i, di)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              sch.days.includes(di)
                                ? 'text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-400 hover:border-purple-300'
                            }`}
                            style={sch.days.includes(di) ? { backgroundColor: form.color } : {}}>
                            {d}
                          </button>
                        ))}
                        <button type="button" onClick={() => removeSchedule(i)} className="ml-auto text-gray-300 hover:text-red-400 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* 시간 */}
                      <div className="flex items-center gap-2">
                        <input type="time" value={sch.start_time} onChange={e => updateScheduleTime(i, 'start_time', e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none flex-1" />
                        <span className="text-gray-400 text-sm flex-shrink-0">~</span>
                        <input type="time" value={sch.end_time} onChange={e => updateScheduleTime(i, 'end_time', e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {form.schedule.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={syncTimetable} onChange={e => setSyncTimetable(e.target.checked)} className="w-4 h-4 text-purple-500 rounded" />
                  <span className="text-sm text-gray-600">주간 시간표에 자동 반영</span>
                </label>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">메모</label>
                <textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                  placeholder="버스 시간, 준비물 등" rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
              </div>

              <div className="flex gap-2 pt-1">
                {editId && (
                  <button type="button" onClick={handleDelete} className="p-2.5 border border-red-200 rounded-xl text-red-400 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">취소</button>
                <button type="submit" disabled={!form.name || saving}
                  className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : editId ? '수정' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function AcademyCard({ ac, expanded, isPaid, isOverdue, onToggleExpand, onEdit, onToggleActive }: {
  ac: Academy; expanded: boolean; isPaid: boolean; isOverdue: boolean
  onToggleExpand: () => void; onEdit: () => void; onToggleActive: () => void
}) {
  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${isOverdue ? 'border-red-200' : 'border-transparent'}`}
      style={{ borderLeftColor: isOverdue ? '#fca5a5' : ac.color, borderLeftWidth: 4 }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: ac.color }}>{ac.name[0]}</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{ac.name}</p>
              <p className="text-xs text-gray-400">{ac.type === 'academy' ? '학원' : '방과후/활동'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onToggleActive} className="text-gray-300 hover:text-gray-500">
              {ac.is_active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button onClick={onEdit} className="text-xs text-purple-500 hover:text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-50 font-medium">수정</button>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {ac.schedule?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(ac.schedule as any[]).map((s, i) => {
                const days: number[] = Array.isArray(s.days) ? s.days : [s.day_of_week ?? 0]
                const dayStr = days.map((d: number) => '월화수목금토일'[d]).join('·')
                return (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: ac.color + '22', color: ac.color }}>
                    {dayStr} {s.start_time.slice(0,5)}~{s.end_time.slice(0,5)}
                  </span>
                )
              })}
            </div>
          )}
          {ac.monthly_fee && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">💰 {ac.monthly_fee.toLocaleString()}원/월{ac.payment_day ? ` (매월 ${ac.payment_day}일)` : ''}</p>
              {isPaid
                ? <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> 납부완료</span>
                : isOverdue
                  ? <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> 미납</span>
                  : null}
            </div>
          )}
        </div>

        <button onClick={onToggleExpand} className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? '접기' : '상세보기'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-1.5 text-sm">
          {ac.teacher && <p className="text-gray-600"><span className="text-gray-400 text-xs">선생님 </span>{ac.teacher}</p>}
          {ac.phone && <p className="text-gray-600"><span className="text-gray-400 text-xs">전화 </span>{ac.phone}</p>}
          {ac.address && <p className="text-gray-600"><span className="text-gray-400 text-xs">주소 </span>{ac.address}</p>}
          {ac.memo && <p className="text-gray-600"><span className="text-gray-400 text-xs">메모 </span>{ac.memo}</p>}
        </div>
      )}
    </div>
  )
}
