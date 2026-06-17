import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  parseISO, isToday,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, ExternalLink, Calendar } from 'lucide-react'
import { useChild } from '../contexts/ChildContext'

type Event = {
  id: string
  title: string
  date: string
  color: string
  description?: string
  isGoogle?: boolean
}

const EVENT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function CalendarPage() {
  const { selectedChild } = useChild()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([
    { id: '1', title: '영어학원', date: format(new Date(), 'yyyy-MM-dd'), color: '#10b981', description: '오후 3시' },
    { id: '2', title: '수학학원', date: format(new Date(), 'yyyy-MM-dd'), color: '#3b82f6', description: '오후 5시' },
  ])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', color: '#3b82f6' })
  const [googleConnected] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.date), day))

  const handleAddEvent = () => {
    if (!newEvent.title || !selectedDate) return
    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: format(selectedDate, 'yyyy-MM-dd'),
      color: newEvent.color,
      description: newEvent.description,
    }
    setEvents([...events, event])
    setNewEvent({ title: '', description: '', color: '#3b82f6' })
    setShowAddForm(false)
  }

  const handleGoogleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      alert('Google Calendar 연동을 위해 .env 파일에 VITE_GOOGLE_CLIENT_ID를 설정해주세요.')
      return
    }
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')
    const redirectUri = encodeURIComponent(window.location.origin)
    window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`,
      '_blank'
    )
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>왼쪽 메뉴에서 아이를 선택하거나 추가해주세요.</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex gap-5 h-full">
      {/* Calendar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{selectedChild.name}의 달력</h1>
            <p className="text-gray-500 text-sm">{format(currentDate, 'yyyy년 M월', { locale: ko })}</p>
          </div>
          <div className="flex items-center gap-2">
            {!googleConnected && (
              <button
                onClick={handleGoogleConnect}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
              >
                <Calendar className="w-4 h-4 text-blue-500" />
                Google 캘린더 연동
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </button>
            )}
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentDate(new Date())}
                className="px-3 py-2 rounded-xl hover:bg-gray-100 text-sm text-gray-600">
                오늘
              </button>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={`py-3 text-center text-xs font-semibold ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayEvents = getEventsForDay(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const dayOfWeek = day.getDay()

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[90px] p-2 border-b border-r border-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1 ${
                    isToday(day) ? 'bg-blue-500 text-white font-bold' :
                    dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="text-[10px] px-1.5 py-0.5 rounded text-white truncate"
                        style={{ backgroundColor: e.color }}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 2}개</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="w-72 flex flex-col gap-4">
        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
              </h3>
              <button
                onClick={() => setShowAddForm(true)}
                className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>

            {showAddForm && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
                <input
                  type="text"
                  placeholder="일정 제목"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="메모 (선택)"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="flex gap-1.5">
                  {EVENT_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewEvent({ ...newEvent, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform ${newEvent.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddForm(false)} className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100">취소</button>
                  <button onClick={handleAddEvent} className="flex-1 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">추가</button>
                </div>
              </div>
            )}

            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">일정이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{e.title}</p>
                      {e.description && <p className="text-xs text-gray-400">{e.description}</p>}
                      {e.isGoogle && <span className="text-[10px] text-blue-400">Google</span>}
                    </div>
                    <button
                      onClick={() => setEvents(events.filter((ev) => ev.id !== e.id))}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
