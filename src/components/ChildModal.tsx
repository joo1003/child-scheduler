import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X } from 'lucide-react'

type Props = { onClose: () => void; onSaved: () => void }

export default function ChildModal({ onClose, onSaved }: Props) {
  const { myFamily } = useAuth()
  const [form, setForm] = useState({ name: '', birth_date: '', school: '', grade: '' })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myFamily) return
    setLoading(true)
    await supabase.from('children').insert({
      family_id: myFamily.id,
      name: form.name,
      birth_date: form.birth_date || null,
      school: form.school || null,
      grade: form.grade || null,
    })
    onSaved()
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">아이 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">이름 *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="예: 이민준" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">생년월일</label>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">학교</label>
              <input type="text" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="예: 서울초등학교" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">학년/반</label>
              <input type="text" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="예: 3학년 2반" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
