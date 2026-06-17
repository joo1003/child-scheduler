import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TimetableSlot, TimetableVersion } from '../lib/supabase'
import { useChild } from '../contexts/ChildContext'
import { X, Trash2, Save, ChevronDown, Plus, Check, Pencil } from 'lucide-react'

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
  selectedDays: number[]
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
  const [versions, setVersions] = useState<TimetableVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<TimetableVersion | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false)
  const [versionModal, setVersionModal] = useState<'create' | 'rename' | null>(null)
  const [versionTitle, setVersionTitle] = useState('')
  const [versionSaving, setVersionSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchVersions = async () => {
    if (!selectedChild) return
    const { data } = await supabase
      .from('timetable_versions')
      .select('*')
      .eq('child_id', selectedChild.id)
      .order('created_at')
    if (data) {
      setVersions(data)
      const active = data.find(v => v.is_active) ?? data[0] ?? null
      setActiveVersion(prev => {
        // 버전 목록 갱신 후 현재 선택 유지
        if (prev) {
          const stillExists = data.find(v => v.id === prev.id)
          return stillExists ?? active
        }
        return active
      })
    }
  }

  const fetchSlots = async (versionId: string | null) => {
    if (!selectedChild) return
    let query = supabase.from('timetable_slots').select('*').eq('child_id', selectedChild.id)
    if (versionId) {
      query = query.eq('version_id', versionId)
    } else {
      query = query.is('version_id', null)
    }
    const { data } = await query
    if (data) setSlots(data)
  }

  // 아이 변경 시 버전 목록 로드
  useEffect(() => {
    if (!selectedChild) return
    setVersions([])
    setActiveVersion(null)
    setSlots([])
    fetchVersions()
  }, [selectedChild])

  // 활성 버전 변경 시 슬롯 로드
  useEffect(() => {
    if (!selectedChild) return
    fetchSlots(activeVersion?.id ?? null)
  }, [activeVersion, selectedChild])

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVersionDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 버전 생성
  const createVersion = async () => {
    if (!selectedChild || !versionTitle.trim()) return
    setVersionSaving(true)
    const { data } = await supabase
      .from('timetable_versions')
      .insert({ child_id: selectedChild.id, title: versionTitle.trim(), is_active: false })
      .select()
      .single()
    setVersionSaving(false)
    setVersionModal(null)
    setVersionTitle('')
    if (data) {
      await fetchVersions()
      setActiveVersion(data)
    }
  }

  // 버전 이름 수정
  const renameVersion = async () => {
    if (!activeVersion || !versionTitle.trim()) return
    setVersionSaving(true)
    await supabase
      .from('timetable_versions')
      .update({ title: versionTitle.trim() })
      .eq('id', activeVersion.id)
    setVersionSaving(false)
    setVersionModal(null)
    setVersionTitle('')
    await fetchVersions()
  }

  // 버전 삭제
  const deleteVersion = async () => {
    if (!activeVersion || versions.length <= 1) return
    await supabase.from('timetable_versions').delete().eq('id', activeVersion.id)
    setDeleteConfirm(false)
    await fetchVersions()
  }

  // 활성 버전 전환 (is_active 플래그 업데이트)
  const switchVersion = async (v: TimetableVersion) => {
    setActiveVersion(v)
    setVersionDropdownOpen(false)
    // is_active 업데이트
    await supabase.from('timetable_versions').update({ is_active: false }).eq('child_id', selectedChild!.id)
    await supabase.from('timetable_versions').update({ is_active: true }).eq('id', v.id)
  }

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
      version_id: activeVersion?.id ?? null,
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
      await supabase.from('timetable_slots').update({ ...base, day_of_week: edit.selectedDays[0] }).eq('id', edit.id)
    } else {
      for (const day of edit.selectedDays) {
        await supabase.from('timetable_slots').insert({ ...base, day_of_week: day })
      }
    }

    await fetchSlots(activeVersion?.id ?? null)
    setEdit(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!edit?.id) return
    await supabase.from('timetable_slots').delete().eq('id', edit.id)
    await fetchSlots(activeVersion?.id ?? null)
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
      {/* 헤더 */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{selectedChild.name}의 주간 스케줄</h1>
            <p className="text-xs text-gray-400 mt-0.5">시간 칸 클릭 → 일정 추가 · 여러 요일 동시 선택 가능</p>
          </div>

          {/* 버전 선택 드롭다운 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setVersionDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
            >
              <span className="max-w-[160px] truncate">{activeVersion?.title ?? '버전 없음'}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {versionDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  시간표 버전 선택
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {versions.map(v => (
                    <button
                      key={v.id}
                      onClick={() => switchVersion(v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="truncate text-gray-700">{v.title}</span>
                      {activeVersion?.id === v.id && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                    </button>
                  ))}
                  {versions.length === 0 && (
                    <p className="px-4 py-3 text-xs text-gray-400">버전이 없습니다.</p>
                  )}
                </div>
                <div className="border-t border-gray-100 p-2 flex gap-1.5">
                  <button
                    onClick={() => { setVersionModal('create'); setVersionTitle(''); setVersionDropdownOpen(false) }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> 새 버전
                  </button>
                  {activeVersion && (
                    <>
                      <button
                        onClick={() => { setVersionModal('rename'); setVersionTitle(activeVersion.title); setVersionDropdownOpen(false) }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5" /> 이름 변경
                      </button>
                      {versions.length > 1 && (
                        <button
                          onClick={() => { setDeleteConfirm(true); setVersionDropdownOpen(false) }}
                          className="py-1.5 px-2 rounded-xl text-xs text-red-400 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {(Object.entries(TYPE_META) as [string, typeof TYPE_META.school][]).map(([type, meta]) => (
            <span key={type} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
          ))}
        </div>
      </div>

      {/* 버전이 없을 때 안내 */}
      {versions.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
          <p className="text-sm">아직 시간표 버전이 없습니다.</p>
          <button
            onClick={() => { setVersionModal('create'); setVersionTitle('') }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> 첫 번째 시간표 만들기
          </button>
        </div>
      )}

      {/* 그리드 */}
      {versions.length > 0 && (
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
      )}

      {/* 일정 추가/수정 모달 */}
      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">{edit.id ? '일정 수정' : '일정 추가'}</h2>
              <button onClick={() => setEdit(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
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

      {/* 버전 생성 / 이름 변경 모달 */}
      {versionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">
                {versionModal === 'create' ? '새 시간표 버전' : '버전 이름 변경'}
              </h2>
              <button onClick={() => setVersionModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={versionTitle}
              onChange={e => setVersionTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') versionModal === 'create' ? createVersion() : renameVersion() }}
              placeholder="예: 1학기, 방학 시간표..."
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setVersionModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={versionModal === 'create' ? createVersion : renameVersion}
                disabled={!versionTitle.trim() || versionSaving}
                className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {versionSaving ? '저장 중...' : (versionModal === 'create' ? '만들기' : '저장')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 버전 삭제 확인 모달 */}
      {deleteConfirm && activeVersion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
            <h2 className="font-bold text-gray-800 mb-2">버전 삭제</h2>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">"{activeVersion.title}"</span> 버전과 모든 일정이 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button onClick={deleteVersion}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
