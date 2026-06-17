import { useState } from 'react'

/*
  9×9 격자 낱말 퀴즈

  솔루션 격자 (null = 검은 칸):

        0    1    2    3    4    5    6    7    8
  r0: [사]  [과]  [_]  [_]  [_]  [_]  [_]  [_]  [_]
  r1: [랑]  [_]  [_]  [_]  [_]  [_]  [_]  [_]  [_]
  r2: [_]  [_]  [하]  [늘]  [_]  [_]  [_]  [_]  [_]
  r3: [_]  [_]  [교]  [_]  [_]  [_]  [_]  [_]  [_]
  r4: [_]  [_]  [_]  [_]  [바]  [다]  [_]  [_]  [_]
  r5: [_]  [_]  [_]  [_]  [람]  [_]  [_]  [_]  [_]
  r6: [_]  [_]  [_]  [_]  [_]  [_]  [나]  [무]  [_]
  r7: [_]  [_]  [_]  [_]  [_]  [_]  [라]  [_]  [_]
  r8: [_]  [_]  [_]  [수]  [학]  [_]  [_]  [_]  [_]

  가로:
    1. r0,c0-1: 사과 (빨갛고 달콤한 과일)
    2. r2,c2-3: 하늘 (구름이 떠있는 파란 공간)
    3. r4,c4-5: 바다 (파도가 치는 넓은 물)
    4. r6,c6-7: 나무 (뿌리와 잎이 있는 식물)
    5. r8,c3-4: 수학 (숫자와 계산을 배우는 과목)
  세로:
    A. c0,r0-1: 사랑 (좋아하는 마음)
    B. c2,r2-3: 하교 (수업이 끝나고 집에 감)
    C. c4,r4-5: 바람 (공기가 움직이는 것)
    D. c6,r6-7: 나라 (국가, 나라)
*/


// 솔루션 좌표 [row, col, char]
const SOLUTION_CELLS: [number, number, string][] = [
  [0,0,'사'],[0,1,'과'],
  [1,0,'랑'],
  [2,2,'하'],[2,3,'늘'],
  [3,2,'교'],
  [4,4,'바'],[4,5,'다'],
  [5,4,'람'],
  [6,6,'나'],[6,7,'무'],
  [7,6,'라'],
  [8,3,'수'],[8,4,'학'],
]

const ACROSS_CLUES = [
  { num: 1, r: 0, c: 0, len: 2, answer: '사과', hint: '빨갛고 달콤한 과일' },
  { num: 2, r: 2, c: 2, len: 2, answer: '하늘', hint: '구름이 떠있는 파란 공간' },
  { num: 3, r: 4, c: 4, len: 2, answer: '바다', hint: '파도가 치는 넓고 푸른 물' },
  { num: 4, r: 6, c: 6, len: 2, answer: '나무', hint: '뿌리와 잎이 있는 식물' },
  { num: 5, r: 8, c: 3, len: 2, answer: '수학', hint: '숫자와 계산을 배우는 과목' },
]

const DOWN_CLUES = [
  { num: 6, r: 0, c: 0, len: 2, answer: '사랑', hint: '좋아하는 마음' },
  { num: 7, r: 2, c: 2, len: 2, answer: '하교', hint: '수업 후 집에 돌아감' },
  { num: 8, r: 4, c: 4, len: 2, answer: '바람', hint: '공기가 움직이는 것' },
  { num: 9, r: 6, c: 6, len: 2, answer: '나라', hint: '우리가 사는 국가' },
]

type Grid = (string | null)[][]

function makeEmptyGrid(): Grid {
  const g: Grid = Array.from({ length: 9 }, () => Array(9).fill(null))
  SOLUTION_CELLS.forEach(([r, c]) => { g[r][c] = '' })
  return g
}

function makeSolutionGrid(): Grid {
  const g: Grid = Array.from({ length: 9 }, () => Array(9).fill(null))
  SOLUTION_CELLS.forEach(([r, c, ch]) => { g[r][c] = ch })
  return g
}

export default function CrosswordGame() {
  const [grid, setGrid] = useState<Grid>(makeEmptyGrid)
  const [selected, setSelected] = useState<[number,number]|null>(null)
  const [won, setWon] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [activeClue, setActiveClue] = useState<string|null>(null)

  const sol = makeSolutionGrid()

  const checkWin = (g: Grid) =>
    SOLUTION_CELLS.every(([r,c,ch]) => g[r][c] === ch)

  const handleInput = (r: number, c: number, val: string) => {
    const ch = val.slice(-1)
    const next: Grid = grid.map(row => [...row])
    next[r][c] = ch
    setGrid(next)
    if (checkWin(next)) setWon(true)
  }

  const isPartOf = (r: number, c: number, dir: 'across'|'down', clue: typeof ACROSS_CLUES[0]) => {
    if (dir === 'across') return r === clue.r && c >= clue.c && c < clue.c + clue.len
    return c === clue.c && r >= clue.r && r < clue.r + clue.len
  }

  const cellHighlight = (r: number, c: number) => {
    if (!activeClue) return false
    const [type, idxStr] = activeClue.split('-')
    const idx = parseInt(idxStr)
    if (type === 'across') return isPartOf(r, c, 'across', ACROSS_CLUES[idx])
    return isPartOf(r, c, 'down', DOWN_CLUES[idx])
  }

  const cellError = (r: number, c: number) => {
    const val = grid[r][c]
    if (!val) return false
    return val !== sol[r][c]
  }

  const reset = () => {
    setGrid(makeEmptyGrid())
    setWon(false)
    setShowAnswer(false)
    setSelected(null)
    setActiveClue(null)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
      {/* 격자 */}
      <div className="flex flex-col items-center gap-3">
        {won && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-2 text-green-700 font-bold">
            🎉 완성! 훌륭해요!
          </div>
        )}
        <div className="inline-grid gap-0.5 bg-gray-300 p-0.5 rounded-xl"
          style={{ gridTemplateColumns: 'repeat(9, 1fr)' }}>
          {grid.map((row, r) => row.map((cell, c) => {
            if (cell === null) {
              return <div key={`${r}-${c}`} className="w-9 h-9 bg-gray-800 rounded-sm" />
            }
            const isSel = selected?.[0]===r && selected?.[1]===c
            const isHl = cellHighlight(r, c)
            const isErr = !showAnswer && cellError(r, c)
            const displayVal = showAnswer ? sol[r][c] : cell
            return (
              <div key={`${r}-${c}`} onClick={() => setSelected([r,c])}
                className={`w-9 h-9 rounded-sm relative flex items-center justify-center cursor-pointer transition-colors
                  ${isSel ? 'bg-blue-300' : isHl ? 'bg-yellow-100' : 'bg-white'}
                  ${isErr ? '!bg-red-100' : ''}`}>
                <span className={`text-sm font-bold ${isErr ? 'text-red-500' : showAnswer && !cell ? 'text-blue-400' : 'text-gray-800'}`}>
                  {displayVal}
                </span>
                {isSel && !showAnswer && (
                  <input autoFocus
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onChange={e => { handleInput(r, c, e.target.value); e.currentTarget.value = '' }}
                    onKeyDown={e => { if (e.key==='Backspace') handleInput(r, c, '') }}
                  />
                )}
              </div>
            )
          }))}
        </div>

        <div className="flex gap-2">
          <button onClick={reset} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">초기화</button>
          <button onClick={() => setShowAnswer(!showAnswer)}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm">
            {showAnswer ? '입력 모드' : '정답 보기'}
          </button>
        </div>
      </div>

      {/* 단서 */}
      <div className="space-y-4 min-w-[200px]">
        <div>
          <h3 className="font-bold text-gray-700 mb-2 text-sm">가로 →</h3>
          <div className="space-y-1.5">
            {ACROSS_CLUES.map((cl, i) => (
              <button key={cl.num} onClick={() => setActiveClue(activeClue === `across-${i}` ? null : `across-${i}`)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  activeClue === `across-${i}` ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}>
                <span className="font-bold mr-2">{cl.num}.</span>{cl.hint}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-2 text-sm">세로 ↓</h3>
          <div className="space-y-1.5">
            {DOWN_CLUES.map((cl, i) => (
              <button key={cl.num} onClick={() => setActiveClue(activeClue === `down-${i}` ? null : `down-${i}`)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  activeClue === `down-${i}` ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}>
                <span className="font-bold mr-2">{cl.num}.</span>{cl.hint}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400">단서를 클릭하면 해당 칸이 노란색으로 표시됩니다</p>
      </div>
    </div>
  )
}
