import { useState } from 'react'
import BaseballGame from '../games/BaseballGame'
import Minesweeper from '../games/Minesweeper'
import Sudoku from '../games/Sudoku'
import TypingGame from '../games/TypingGame'
import CrosswordGame from '../games/CrosswordGame'

const GAMES = [
  { id: 'baseball', emoji: '⚾', label: '숫자야구', desc: '숨겨진 3자리 숫자를 맞혀보세요', color: 'from-amber-400 to-orange-400' },
  { id: 'minesweeper', emoji: '💣', label: '지뢰찾기', desc: '지뢰를 피해 모든 칸을 열어요', color: 'from-gray-500 to-gray-700' },
  { id: 'sudoku', emoji: '🔢', label: '스도쿠', desc: '1~9 숫자를 채워 퍼즐을 완성해요', color: 'from-blue-400 to-indigo-500' },
  { id: 'typing', emoji: '⌨️', label: '한글 타자', desc: '60초 동안 최대한 빠르게 타이핑!', color: 'from-green-400 to-emerald-500' },
  { id: 'crossword', emoji: '📝', label: '낱말 퀴즈', desc: '가로세로 낱말 퀴즈를 풀어봐요', color: 'from-purple-400 to-pink-400' },
]

export default function GamesPage() {
  const [active, setActive] = useState<string | null>(null)

  const game = GAMES.find(g => g.id === active)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          {active && (
            <button onClick={() => setActive(null)}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">←</button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {game ? `${game.emoji} ${game.label}` : '🎮 미니 게임'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {game ? game.desc : '아이와 함께 즐길 수 있는 게임 모음'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!active && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {GAMES.map(g => (
              <button key={g.id} onClick={() => setActive(g.id)}
                className="group relative overflow-hidden rounded-2xl text-left shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <div className={`bg-gradient-to-br ${g.color} p-6`}>
                  <div className="text-5xl mb-3">{g.emoji}</div>
                  <h2 className="text-white font-bold text-xl">{g.label}</h2>
                  <p className="text-white/80 text-sm mt-1">{g.desc}</p>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
              </button>
            ))}
          </div>
        )}

        {active === 'baseball' && <BaseballGame />}
        {active === 'minesweeper' && (
          <div className="flex justify-center">
            <Minesweeper />
          </div>
        )}
        {active === 'sudoku' && (
          <div className="flex justify-center">
            <Sudoku />
          </div>
        )}
        {active === 'typing' && <TypingGame />}
        {active === 'crossword' && <CrosswordGame />}
      </div>
    </div>
  )
}
