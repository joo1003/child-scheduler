import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TimetableSlot } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { X, Trash2, Save } from 'lucide-react'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const START_HOUR = 6
const END_HOUR   = 23
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64

const TYPE_META = {
  school:   { label: '학교',   color: '#3b82f6', bg: '#eff6ff' },
  academy:  { label: '학원',   color: '#8b5cf6', bg: '#f5f3ff' },
  activity: { label: '활동',   color: '#10b981', bg: '#ecfdf5' },
  other:    { label: '기타',   color: '#f59e0b', bg: '#fffbeb' },
}

const PRESET_SUBJECTS: Record<TimetableSlot['type'], string[]> = {
  school:   ['국어', '수학', '영어', '과학', '사회', '음악', '미술', '체육', '도덕', '창체'],
  academy:  ['수학학원', '영어학원', '피아노', '태권도', '수영', '미술학원', '과학학원', '코딩'],
  activity: ['축구', '농구', '배드민턴', '독서', '봉사활동'],
  other:    ['휴식', '자유시간', '숙제'],
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(m: number) {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`
}
function topPx(time: string) {
  return ((timeToMinutes(time) - START_HOUR * 60) / 60) * HOUR_HEIGHT
}
function heightPx(start: string, end: string) {
  return ((timeToMinutes(end) - timeToMinutes(start)) / 60) * HOUR_HEIGHT
}

type EditState = {
  id?: string
  selectedDays: number[]   // 다중 선택
  start_time: string
  end_time: string
  subject: string
  teacher: string
  location: string
  type: TimetableSlot['type']
  memo: string
}

const EMPTY_EDIT = (day = 0, start = '09:00'): EditState => ({
  selectedDays: [day],
  start_time: start,
  end_time: minutesToTime(timeToMinutes(start) + 60),
  subject: '',
  teacher: '',
  location: '',
  type: 'school',
  memo: '',
})

export default function TimetablePage() {
  const { selectedChild } = useChild()
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const fetchSlots = async () => {
    if (!selectedChild) return
    const { data } = await supabase.from('timetable_slots').select('*').eq('child_id', selectedChild.id)
    if (data) setSlots(data)
  }

  useEffect(() => { fetchSlots() }, [selectedChild])

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: number) => {
    if ((e.target as HTMLElement).closest('.slot-block')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMinutes = START_HOUR * 60 + Math.round(y / HOUR_HEIGHT * 60 / 30) * 30
    const snapped = Math.max(START_HOUR * 60, Math.min(totalMinutes, (END_HOUR - 1) * 60))
    setEdit(EMPTY_EDIT(day, minutesToTime(snapped)))
  }

  const openEdit = (slot: TimetableSlot) => {
    setEdit({
      id: slot.id,
      selectedDays: [slot.day_of_week],
      start_time: slot.start_time,
      end_time: slot.end_time,
      subject: slot.subject,
      teacher: slot.teacher ?? '',
      location: slot.location ?? '',
      type: slot.type,
      memo: slot.memo ?? '',
    })
  }

  const toggleDay = (day: number) => {
    if (!edit) return
    // 기존 슬롯 수정 시에는 단일 요일만
    if (edit.id) return
    setEdit(prev => {
      if (!prev) return prev
      const has = prev.selectedDays.includes(day)
      const next = has
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
      return { ...prev, selectedDays: next.length === 0 ? [day] : next }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit || !selectedChild) return
    if (timeToMinutes(edit.end_time) <= timeToMinutes(edit.start_time)) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }
    if (edit.selectedDays.length === 0) {
      alert('요일을 하나 이상 선택하세요.')
      return
    }
    setSaving(true)

    const color = TYPE_META[edit.type].color
    const base = {
      child_id: selectedChild.id,
      start_time: edit.start_time,
      end_time: edit.end_time,
      subject: edit.subject,
      teacher: edit.teacher || null,
      location: edit.location || null,
      type: edit.type,
      memo: edit.memo || null,
      color,
    }

    if (edit.id) {
      // 수정: 단일
      await supabase.from('timetable_slots').update({ ...base, day_of_week: edit.selectedDays[0] }).eq('id', edit.id)
    } else {
      // 신규: 선택한 모든 요일에 upsert
      await supabase.from('timetable_slots').upsert(
        edit.selectedDays.map(day => ({ ...base, day_of_week: day })),
        { onConflict: 'child_id,day_of_week,period', ignoreDuplicates: false }
      )
      // upsert가 period 기반이므로 그냥 insert (중복 시 skip)
      for (const day of edit.selectedDays) {
        await supabase.from('timetable_slots').insert({ ...base, day_of_week: day }).select()
      }
    }

    await fetchSlots()
    setEdit(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!edit?.id) return
    await supabase.from('timetable_slots').delete().eq('id', edit.id)
    await fetchSlots()
    setEdit(null)
  }

  const setType = (type: TimetableSlot['type']) => {
    setEdit(prev => prev ? { ...prev, type, subject: '' } : prev)
  }

  if (!selectedChild) {
    return <div className="flex items-center justify-center h-full text-gray-400"><p>아이를 선택해주세요.</p></div>
  }

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{selectedChild.name}의 주간 스케줄</h1>
          <p className="text-xs text-gray-400 mt-0.5">시간 칸 클릭 → 일정 추가 · 여러 요일 동시 선택 가능</p>
        </div>
        <div className="flex items-center gap-2">
          {(Object.entries(TYPE_META) as [string, typeof TYPE_META.school][]).map(([type, meta]) => (
            <span key={type} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex min-w-0">
          {/* Time axis */}
          <div className="w-14 flex-shrink-0 bg-white border-r border-gray-100 pt-10">
            {hours.map(h => (
              <div key={h} className="relative text-right pr-2" style={{ height: HOUR_HEIGHT }}>
                {h < END_HOUR && (
                  <span className="text-[10px] text-gray-400 absolute -top-2 right-2">
                    {h.toString().padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 min-w-0">
            {DAYS.map((dayLabel, dayIdx) => {
              const daySlots = slots.filter(s => s.day_of_week === dayIdx)
              const isWeekend = dayIdx >= 5
              return (
                <div key={dayIdx} className="flex-1 flex flex-col min-w-[100px]">
                  <div className={`h-10 flex items-center justify-center text-sm font-semibold border-b border-gray-100 sticky top-0 z-10 ${
                    isWeekend ? 'bg-orange-50 text-orange-500' : 'bg-white text-gray-700'
                  }`}>{dayLabel}</div>

                  <div
                    ref={dayIdx === 0 ? gridRef : undefined}
                    className="relative cursor-crosshair border-r border-gray-100"
                    style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                    onClick={e => handleColumnClick(e, dayIdx)}
                  >
                    {hours.map(h => (
                      <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                    ))}
                    {hours.slice(0, -1).map(h => (
                      <div key={h + 'h'} className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                        style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                    ))}
                    {daySlots.map(slot => {
                      const top = topPx(slot.start_time)
                      const height = Math.max(heightPx(slot.start_time, slot.end_time), 20)
                      const meta = TYPE_META[slot.type] ?? TYPE_META.other
                      const short = height < 36
                      return (
                        <div key={slot.id}
                          className="slot-block absolute left-0.5 right-0.5 rounded-lg px-1.5 cursor-pointer hover:opacity-90 hover:shadow-md transition-all overflow-hidden"
                          style={{ top, height, backgroundColor: meta.bg, borderLeft: `3px solid ${meta.color}` }}
                          onClick={e => { e.stopPropagation(); openEdit(slot) }}>
                          <p className="text-[11px] font-bold truncate leading-tight" style={{ color: meta.color }}>{slot.subject}</p>
                          {!short && (
                            <p className="text-[10px] leading-tight" style={{ color: meta.color, opacity: 0.75 }}>
                              {slot.start_time.slice(0, 5)}~{slot.end_time.slice(0, 5)}
                              {slot.location && ` · ${slot.location}`}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">{edit.id ? '일정 수정' : '일정 추가'}</h2>
              <button onClick={() => setEdit(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {/* 타입 */}
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(TYPE_META) as [TimetableSlot['type'], typeof TYPE_META.school][]).map(([type, meta]) => (
                  <button key={type} type="button" onClick={() => setType(type)}
                    className="py-1.5 rounded-xl text-xs font-medium border-2 transition-all"
                    style={edit.type === type
                      ? { borderColor: meta.color, backgroundColor: meta.bg, color: meta.color }
                      : { borderColor: '#e5e7eb', color: '#9ca3af' }}>
                    {meta.label}
                  </button>
                ))}
              </div>

              {/* 과목 프리셋 */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">과목/활동 *</label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {PRESET_SUBJECTS[edit.type].map(s => (
                    <button key={s} type="button" onClick={() => setEdit({ ...edit, subject: s })}
                      className="px-2 py-0.5 rounded-lg text-xs transition-all"
                      style={edit.subject === s
                        ? { backgroundColor: TYPE_META[edit.type].color, color: '#fff' }
                        : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      {s}
                    </button>
                  ))}
                </div>
                <input type="text" value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })}
                  required placeholder="직접 입력"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              {/* 요일 — 수정 시 단일, 신규 시 다중 */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  요일 {!edit.id && <span className="text-blue-400">(여러 요일 선택 가능)</span>}
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((d, i) => {
                    const selected = edit.selectedDays.includes(i)
                    return (
                      <button key={i} type="button"
                        onClick={() => edit.id ? setEdit({ ...edit, selectedDays: [i] }) : toggleDay(i)}
                        className="py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={selected
                          ? { backgroundColor: TYPE_META[edit.type].color, color: '#fff' }
                          : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                        {d}
                      </button>
                    )
                  })}
                </div>
                {!edit.id && edit.selectedDays.length > 1 && (
                  <p className="text-[10px] text-blue-400 mt-1">
                    {edit.selectedDays.map(d => DAYS[d]).join(', ')} 요일 모두에 추가됩니다
                  </p>
                )}
              </div>

              {/* 시간 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">시작</label>
                  <input type="time" value={edit.start_time} onChange={e => setEdit({ ...edit, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">종료</label>
                  <input type="time" value={edit.end_time} onChange={e => setEdit({ ...edit, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              {/* 선생님 / 장소 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">선생님</label>
                  <input type="text" value={edit.teacher} onChange={e => setEdit({ ...edit, teacher: e.target.value })}
                    placeholder="선생님 이름"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">장소</label>
                  <input type="text" value={edit.location} onChange={e => setEdit({ ...edit, location: e.target.value })}
                    placeholder="예: 강남학원"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              {/* 메모 */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">메모</label>
                <input type="text" value={edit.memo} onChange={e => setEdit({ ...edit, memo: e.target.value })}
                  placeholder="추가 메모"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              <div className="flex gap-2 pt-1">
                {edit.id && (
                  <button type="button" onClick={handleDelete}
                    className="p-2.5 border border-red-200 rounded-xl text-red-400 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button type="button" onClick={() => setEdit(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">취소</button>
                <button type="submit" disabled={!edit.subject || saving}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: TYPE_META[edit.type].color }}>
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : (edit.id ? '수정' : `${edit.selectedDays.length}개 요일 저장`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
