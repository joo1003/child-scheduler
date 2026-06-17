import { useChild } from '../contexts/ChildContext'
import { Clock, Bell, Image, Calendar, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { selectedChild } = useChild()
  const navigate = useNavigate()

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-blue-400" />
          </div>
          <p className="text-gray-600 font-medium">아이를 추가해주세요</p>
          <p className="text-gray-400 text-sm mt-1">왼쪽 메뉴에서 아이를 추가할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  const quickMenus = [
    { label: '시간표', icon: Clock, color: 'bg-blue-500', to: '/timetable', desc: '주간 시간표 관리' },
    { label: '달력', icon: Calendar, color: 'bg-purple-500', to: '/calendar', desc: '일정 및 구글 캘린더' },
    { label: '사진', icon: Image, color: 'bg-green-500', to: '/photos', desc: '사진 앨범 관리' },
    { label: '알림장', icon: Bell, color: 'bg-orange-500', to: '/notices', desc: '알림장 및 할 일' },
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">안녕하세요! 👋</h1>
        <p className="text-gray-500 mt-1">{selectedChild.name}의 오늘을 관리해보세요.</p>
      </div>

      {/* Child info card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            {selectedChild.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold">{selectedChild.name}</h2>
            {selectedChild.school && <p className="text-blue-100">{selectedChild.school}</p>}
            {selectedChild.grade && <p className="text-blue-100 text-sm">{selectedChild.grade}</p>}
          </div>
        </div>
      </div>

      {/* Quick menus */}
      <div className="grid grid-cols-2 gap-4">
        {quickMenus.map(({ label, icon: Icon, color, to, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="bg-white rounded-2xl p-5 text-left border border-gray-100 hover:shadow-md transition-all hover:scale-[1.02]"
          >
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-gray-800">{label}</p>
            <p className="text-sm text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
